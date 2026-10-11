#!/usr/bin/env bash
# Porte qualité de chaque PR — le même script en local et en CI.
#
#   scripts/verify.sh                         porte complète (compare avec BASE_REF)
#   FAST=1 scripts/verify.sh                  sans test de mutation
#   BASE_REF=origin/main scripts/verify.sh    base de comparaison (la CI la fournit)
#
# Réglages du projet : .factory/verify.env (commandes de lint, de tests, de mutation).
# Ne vérifie que les changements COMMITÉS : commite avant de lancer.
# Code de sortie 0 = tout passe. Compatible avec le bash 3.2 de macOS.

set -uo pipefail

# --- Réglages -----------------------------------------------------------------
[ -f .factory/verify.env ] && . ./.factory/verify.env
BASE_REF="${BASE_REF:-origin/main}"
SPEC_BRANCH_REGEX="${SPEC_BRANCH_REGEX:-^(feat|feature)/(US-[0-9]+)}"   # groupe 2 = identifiant de la spec
LINT_CMD="${LINT_CMD:-}"
TEST_CMD="${TEST_CMD:-}"
MUTATION_CMD="${MUTATION_CMD:-}"

FAILED=""
pass() { printf '  \033[32mOK\033[0m     %s\n' "$1"; }
fail() { printf '  \033[31mÉCHEC\033[0m  %s\n' "$1"; FAILED="${FAILED}\n  - $1"; }
skip() { printf '  --     %s\n' "$1"; }
step() { printf '\n== %s\n' "$1"; }

# --- Contexte -----------------------------------------------------------------
if ! git rev-parse --verify --quiet "$BASE_REF" >/dev/null; then
  echo "Base '$BASE_REF' introuvable : lance 'git fetch', ou règle BASE_REF."
  exit 2
fi

BRANCH="${SYSTEM_PULLREQUEST_SOURCEBRANCH:-${GITHUB_HEAD_REF:-$(git branch --show-current)}}"
BRANCH="${BRANCH#refs/heads/}"

CHANGED="$(git diff --name-only --diff-filter=ACMR "$BASE_REF"...HEAD)"
DELETED="$(git diff --name-only --diff-filter=D "$BASE_REF"...HEAD)"
# Lignes ajoutées, au format « fichier<TAB>ligne ». Exclus : lockfiles (bruit) et ce script
# (il contient les motifs de secrets qu'il cherche).
ADDED_LINES="$(git diff -U0 "$BASE_REF"...HEAD -- . \
    ':(exclude)*.lock' ':(exclude)package-lock.json' ':(exclude)pnpm-lock.yaml' ':(exclude)scripts/verify.sh' \
  | awk '/^\+\+\+ /{f=substr($0,7); next} /^\+/{print f "\t" substr($0,2)}' || true)"
TEST_FILES_RE='(\.(spec|test)\.[cm]?[jt]sx?|Tests?\.cs)$'
ADDED_TEST_LINES="$(printf '%s\n' "$ADDED_LINES" | RE="$TEST_FILES_RE" awk -F'\t' '$1 ~ ENVIRON["RE"]' || true)"

echo "Branche : ${BRANCH:-(détachée)}   Base : $BASE_REF"
echo "Fichiers modifiés : $(printf '%s\n' "$CHANGED" | grep -c . || true)   supprimés : $(printf '%s\n' "$DELETED" | grep -c . || true)"

# --- 1. Spec et périmètre -------------------------------------------------------
step "Spec et périmètre"
if [[ "$BRANCH" =~ $SPEC_BRANCH_REGEX ]]; then
  ID="${BASH_REMATCH[2]}"
  SPEC="$(ls specs/"$ID"-*.md 2>/dev/null | head -n 1 || true)"
  if [ -z "$SPEC" ]; then
    fail "aucune spec specs/$ID-*.md"
  else
    if grep -qE '^(statut|status):[[:space:]]*approved' "$SPEC"; then pass "spec approuvée : $SPEC"
    else fail "spec non approuvée (statut: approved attendu) : $SPEC"; fi
    # Fichiers autorisés = lignes du bloc ```scope de la spec.
    SCOPE="$(awk '/^```scope/{f=1; next} /^```/{f=0} f' "$SPEC" | sed 's/[[:space:]]*$//' | grep -v '^$' || true)"
    if [ -z "$SCOPE" ]; then
      fail "la spec n'a pas de bloc \`\`\`scope listant les fichiers autorisés : $SPEC"
    else
      OUT=""
      while IFS= read -r f; do
        [ -z "$f" ] && continue
        [ "$f" = "$SPEC" ] && continue
        printf '%s\n' "$SCOPE" | grep -qxF "$f" || OUT="$OUT $f"
      done <<LIST
$CHANGED
$DELETED
LIST
      if [ -z "$OUT" ]; then pass "chaque fichier modifié figure dans le périmètre de la spec"
      else fail "fichiers hors du périmètre de la spec :$OUT"; fi
    fi
  fi
else
  pass "pas de spec exigée pour ce type de branche (${BRANCH:-détachée})"
fi

# --- 2. Fichiers interdits ------------------------------------------------------
step "Fichiers interdits"
BAD="$(printf '%s\n' "$CHANGED" | grep -E '(^|/)\.env($|\.)|\.(pem|pfx|p12|key)$|(^|/)id_(rsa|ed25519)$' | grep -vE '\.env\.example$' || true)"
if [ -z "$BAD" ]; then pass "aucun .env ni clé"
else fail "fichiers interdits : $(echo $BAD)"; fi

# --- 3. Secrets dans les lignes ajoutées ---------------------------------------
step "Secrets"
SECRETS="$(printf '%s\n' "$ADDED_LINES" | grep -E \
  -e '-----BEGIN [A-Z ]*PRIVATE KEY-----' \
  -e 'AccountKey=[A-Za-z0-9+/=]{20,}|SharedAccessSignature=[^;"'"'"' ]{20,}' \
  -e 'sk-(ant-)?[A-Za-z0-9_-]{20,}|gh[pousr]_[A-Za-z0-9]{30,}|AKIA[0-9A-Z]{16}|xox[abpr]-[A-Za-z0-9-]{10,}' \
  -e '[Bb]earer [A-Za-z0-9._-]{20,}' || true)"
GENERIC="$(printf '%s\n' "$ADDED_LINES" | grep -iE '(password|passwd|secret|api[_-]?key|token)["'"'"']?[[:space:]]*[:=][[:space:]]*["'"'"'][^"'"'"'[:space:]<$][^"'"'"'[:space:]]{7,}' || true)"
if [ -z "$SECRETS$GENERIC" ]; then pass "aucune valeur ressemblant à un secret"
else fail "secret possible (valeur masquée) dans : $(printf '%s\n%s\n' "$SECRETS" "$GENERIC" | cut -f1 | grep . | sort -u | tr '\n' ' ')"; fi

# --- 4. Hygiène des tests -------------------------------------------------------
step "Hygiène des tests"
FOCUS="$(printf '%s\n' "$ADDED_TEST_LINES" | grep -E '\b(it|test|describe)\.(only|skip)\(|\b(xit|xdescribe|fit|fdescribe)\(|\[(Ignore|Fact\(Skip)' || true)"
if [ -z "$FOCUS" ]; then pass "aucun .only / .skip ajouté"
else fail "tests ciblés ou ignorés ajoutés dans : $(printf '%s\n' "$FOCUS" | cut -f1 | sort -u | tr '\n' ' ')"; fi
# Règle de la maison : un it.todo n'est permis que pour un écart connu, avec son numéro d'issue.
TODO="$(printf '%s\n' "$ADDED_TEST_LINES" | grep -E '\b(it|test)\.todo\(' | grep -vE '\.todo\([[:space:]]*["'"'"'`]#[0-9]+' || true)"
if [ -z "$TODO" ]; then pass "chaque it.todo ajouté cite une issue (#N)"
else fail "it.todo sans numéro d'issue dans : $(printf '%s\n' "$TODO" | cut -f1 | sort -u | tr '\n' ' ')"; fi
DELETED_TESTS="$(printf '%s\n' "$DELETED" | grep -E "$TEST_FILES_RE" || true)"
if [ -z "$DELETED_TESTS" ]; then pass "aucun fichier de test supprimé"
else fail "fichiers de test supprimés : $(echo $DELETED_TESTS)"; fi

# --- 5. Lint, tests, mutation ---------------------------------------------------
step "Lint"
if [ -z "$LINT_CMD" ]; then skip "LINT_CMD non défini (.factory/verify.env)"
elif sh -c "$LINT_CMD"; then pass "lint"; else fail "lint"; fi

step "Tests"
if [ -z "$TEST_CMD" ]; then
  fail "TEST_CMD non défini (.factory/verify.env) : une porte sans tests ne prouve rien"
elif sh -c "$TEST_CMD"; then
  pass "tests"
  step "Mutation"
  if [ "${FAST:-0}" = "1" ]; then skip "ignorée (FAST=1)"
  elif [ -z "$MUTATION_CMD" ]; then skip "MUTATION_CMD non défini : le sabotage reste manuel (/factory:sabotage)"
  elif sh -c "$MUTATION_CMD"; then pass "score de mutation au-dessus du seuil"
  else fail "mutation (score sous le seuil, ou erreur de l'outil)"; fi
else
  fail "tests (mutation non lancée)"
fi

# --- Résultat ------------------------------------------------------------------
echo
if [ -z "$FAILED" ]; then
  printf '\033[32mPORTE QUALITÉ : OK\033[0m\n'
  exit 0
fi
printf '\033[31mPORTE QUALITÉ : ÉCHEC\033[0m'
printf '%b\n' "$FAILED"
exit 1

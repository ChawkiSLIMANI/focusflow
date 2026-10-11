---
id: US-1
titre: Afficher la version de l'app dans le pied de page
statut: draft        # draft | approved (l'humain seul valide)
source: page Notion US-1 (base « User stories », Factory) — https://app.notion.com/p/835b8c2a33b544289f28a2078141ca39
---

# US-1 — Afficher la version de l'app dans le pied de page

## Story
En tant qu'**utilisateur**, je veux **voir la version de l'application dans le pied de page** afin de **savoir quelle version j'utilise quand je signale un problème**.

> **Avertissement de cadrage.** La page Notion ne contient que le titre et la phrase ci-dessus : les sections
> « Critères d'acceptation », « Hors périmètre », « Questions ouvertes » et « Notes » sont vides. La story ne
> fixe ni la source du numéro, ni son libellé, ni les pages concernées, ni l'emplacement, ni le cas
> « version indisponible ». Les critères ci-dessous reposent donc sur une **proposition par défaut**
> (hypothèses H1 à H7), choisie pour être la plus petite possible et vérifiable. Chaque hypothèse renvoie à
> une question ouverte ; **QO1 et QO2 sont bloquantes** : la spec ne devrait pas être approuvée avant
> qu'elles soient tranchées.

## Contexte et ancrages

Vérifié le 2026-10-12 sur la branche `feat/US-1-version-pied-de-page` (commit `8acf246`, identique à `main`).

### Il n'existe aucun pied de page aujourd'hui
- `grep -rn -i 'footer' app/` ne renvoie qu'un commentaire : `app/_components/TaskInput.tsx:55` (`{/* Footer */}`),
  qui désigne le bas de la carte de saisie (pastilles d'humeur et compteur « n / 500 »), pas un pied de page.
- Après `npm run build`, `grep -o '<footer' .next/server/app/index.html | wc -l` et la même commande sur
  `.next/server/app/partage.html` renvoient `0`.
- `app/layout.tsx:45` : `<body>` ne contient que `{children}`.
- La story dit « dans **le** pied de page » : elle suppose un élément qui n'existe pas. Le créer fait donc
  partie de la story (H4).

### Une « version » est déjà affichée, en dur, et elle contredit `package.json`
- `app/_components/Brand.tsx:8-10` : une pastille affiche le texte littéral `v0.3 · build` à côté du logo.
- `Brand` n'est utilisé que dans la barre du haut de l'accueil : `app/_components/FocusFlowApp.tsx:175`.
  La page de partage ne l'affiche pas (`.next/server/app/partage.html` : 0 occurrence de `v0.3 · build`).
- `package.json:3` : `"version": "0.1.0"`. Cette valeur date du commit initial `ca418f5`
  (« Initial commit from Create Next App ») et n'a jamais été modifiée.
- `git tag` ne renvoie rien : aucune version n'est étiquetée dans le dépôt.
- Conséquence : il existe deux numéros incompatibles (`0.3` affiché, `0.1.0` déclaré) et aucun des deux n'est
  maintenu. Ce constat n'est **pas** figé par un critère : voir QO2.

### Structure des pages
- Accueil : `app/page.tsx:4` rend `<FocusFlowApp />` sans prop ; `app/_components/FocusFlowApp.tsx:58`
  (`export default function FocusFlowApp()`), composant client (`"use client"`, ligne 1).
- Conteneur de contenu de l'accueil : `app/_components/FocusFlowApp.tsx:172`, avec une réserve basse
  `pb-[180px]` (`max-[720px]:pb-[200px]`). Le dock est rendu après ce conteneur : `FocusFlowApp.tsx:238`.
- Dock de capture : `app/_components/CaptureDock.tsx:64`, `fixed bottom-0 left-0 right-0 z-50`, avec un fond
  en dégradé opaque à partir de 40 % de sa hauteur (`CaptureDock.tsx:65-68`). Tout contenu placé **après** le
  conteneur de la ligne 172 se retrouve en fin de document, donc sous le dock quand on défile jusqu'en bas.
- Page de partage : `app/partage/page.tsx:9` rend `<ShareView />` (composant client).
  - `app/partage/ShareView.tsx:39` : `if (!ready) return null;` — au rendu serveur, `ShareView` ne produit
    aucun HTML. Un pied de page placé **dans** `ShareView` serait absent du HTML prérendu.
  - `app/partage/ShareView.tsx:43` : l'écran « Lien invalide » occupe `min-h-screen`. Un élément placé après
    `ShareView` y apparaît sous la ligne de flottaison (il faut défiler).
  - `app/partage/ShareView.tsx:103` : conteneur du cas nominal, `pb-24`. Pas de dock sur cette page.
  - `app/partage/ShareView.tsx:244` : mention « Ce lien n'expire pas. » en `font-mono text-[11px] text-ink-faint`.
- Seul canal de signalement existant : le lien `mailto:` « Signaler ce contenu » de la page de partage
  (`app/partage/ShareView.tsx:96` et `:256`), qui signale un **contenu**, pas un problème de l'application.
  Il n'existe aucun canal « signaler un problème » sur l'accueil (QO8).

### Outillage vérifié empiriquement
- `npm test` (`vitest run`, `package.json:9`) : code 0, `Test Files 7 passed | 1 skipped (8)`,
  `Tests 72 passed | 6 todo (78)`.
- `npm run lint` : code 0, aucune ligne d'erreur ni d'avertissement.
- `npm run build` : code 0 ; routes `/`, `/_not-found` et `/partage` marquées `○ (Static)`. La valeur
  affichée sera donc **figée au moment du build**, quelle que soit la source retenue.
- `vitest.config.ts:7-8` : environnement `node`, motif `tests/**/*.test.ts` (pas de `.tsx`, pas de jsdom).
- Sonde jetable (hors dépôt, non commitée) lancée avec Vitest 4.1.11 : dans un fichier `.test.ts`,
  `renderToStaticMarkup(createElement(Composant))` de `react-dom/server` rend sans erreur `app/page.tsx`,
  `app/partage/page.tsx` et `app/_components/FocusFlowApp.tsx` ; `import pkg from "../package.json"` fonctionne
  (`tsconfig.json:12`, `resolveJsonModule: true`) ; `vi.mock` d'un module JSON remplace bien la valeur lue.
  **Aucune nouvelle dépendance n'est donc nécessaire** pour tester un rendu.
- `app/layout.tsx:2` importe `next/font/google` : le layout racine n'a pas été sondé sous Vitest (H7).
- Client : `grep -rl 'eslint-config-next' .next/static | wc -l` renvoie `0` aujourd'hui (le contenu de
  `package.json` n'est pas livré au navigateur).
- Documentation Next 16 embarquée :
  - `node_modules/next/dist/docs/01-app/02-guides/environment-variables.md:158-166` : une variable
    `NEXT_PUBLIC_*` est remplacée par sa valeur au moment de `next build` et reste figée ensuite.
  - `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md:295-341` :
    un composant serveur peut être passé en prop ou en `children` à un composant client ; il est rendu côté
    serveur.
- `scripts/verify.sh:17` et `:54` : pour la branche `feat/US-1-…`, la porte cherche `specs/US-1-*.md`. Ce motif
  ne correspond pas à `specs/US-001-lint-zero-erreur.md` : pas de confusion entre `US-1` et `US-001`.

## Critères d'acceptation

Tous les critères supposent H1 à H7. Les valeurs de test (`9.8.7`, `1.2.3-beta.1`) sont des entrées
injectées : aucun test n'écrit en dur la version courante `0.1.0`, pour qu'un changement de version ne casse
pas la suite.

```gherkin
# language: fr

Scénario: C1 — Cas nominal : format du libellé
  Étant donné la fonction formatAppVersion de app/_lib/appVersion.ts
  Quand je l'appelle avec "0.1.0", puis "10.20.30", puis "0.0.0"
  Alors elle renvoie exactement "v0.1.0", puis "v10.20.30", puis "v0.0.0"
  (vérifié par : npm test — tests/appVersion.test.ts, « C1 — préfixe v suivi de la version »)

Scénario: C2 — Cas nominal : le pied de page affiche la version de package.json
  Étant donné package.json simulé par vi.mock avec "version": "9.8.7"
  Quand je rends AppFooter avec renderToStaticMarkup
  Alors le HTML contient exactement 1 balise ouvrante "<footer"
  Et le HTML contient le texte contigu "v9.8.7"
  Et le HTML ne contient pas "0.1.0"
  (vérifié par : npm test — tests/appFooter.test.ts, « C2 — affiche la version lue dans package.json »)

Scénario: C3 — Cas limite : version de préversion
  Étant donné la fonction formatAppVersion
  Quand je l'appelle avec "1.2.3-beta.1"
  Alors elle renvoie exactement "v1.2.3-beta.1"
  (vérifié par : npm test — tests/appVersion.test.ts, « C3 — accepte une préversion »)

Scénario: C4 — Cas d'erreur : version absente ou invalide
  Étant donné la fonction formatAppVersion
  Quand je l'appelle avec undefined, null, 42, "", "   ", "abc", "0.1", "v0.1.0", "1.2.3 ", "1.2.3<b>"
  Alors elle renvoie null pour chacune de ces 10 valeurs
  (vérifié par : npm test — tests/appVersion.test.ts, « C4 — renvoie null pour une version absente ou invalide »)

Scénario: C5 — Cas d'erreur : aucun pied de page quand la version est indisponible
  Étant donné package.json simulé par vi.mock sans champ "version"
  Quand je rends AppFooter avec renderToStaticMarkup
  Alors le HTML est la chaîne vide ""
  Et il ne contient donc ni "<footer", ni "undefined", ni "null"
  (vérifié par : npm test — tests/appFooter.test.ts, « C5 — ne rend rien si la version est indisponible »)

Scénario: C6 — Accueil : pied de page présent, dans le contenu, avant le dock
  Étant donné package.json simulé par vi.mock avec "version": "9.8.7"
  Quand je rends le composant par défaut de app/page.tsx avec renderToStaticMarkup
  Alors le HTML contient exactement 1 balise ouvrante "<footer"
  Et cette balise contient "v9.8.7"
  Et l'indice de "<footer" dans le HTML est strictement inférieur à l'indice de "fixed bottom-0" (le dock)
  (vérifié par : npm test — tests/appFooter.test.ts, « C6 — accueil : pied de page avant le dock »)

Scénario: C7 — Page de partage : pied de page présent même quand ShareView ne rend rien
  Étant donné package.json simulé par vi.mock avec "version": "9.8.7"
  Quand je rends le composant par défaut de app/partage/page.tsx avec renderToStaticMarkup
  Alors le HTML contient exactement 1 balise ouvrante "<footer"
  Et cette balise contient "v9.8.7"
  (vérifié par : npm test — tests/appFooter.test.ts, « C7 — partage : pied de page hors de ShareView »)

Scénario: C8 — HTML prérendu des deux pages
  Étant donné le dépôt avec la story implémentée
  Quand j'exécute "npm run build"
  Alors la commande se termine avec le code 0
  Et "grep -o '<footer' .next/server/app/index.html | wc -l" affiche 1
  Et "grep -o '<footer' .next/server/app/partage.html | wc -l" affiche 1
  Et pour chacun des deux fichiers, grep -c "v$(node -p "require('./package.json').version")" affiche au moins 1

Scénario: C9 — package.json n'est pas livré au navigateur
  Étant donné le build du scénario C8
  Quand j'exécute "grep -rl 'eslint-config-next' .next/static | wc -l"
  Alors la commande affiche 0 (valeur identique à celle constatée avant la story)

Scénario: C10 — Non-régression de la suite et de la porte qualité
  Étant donné le dépôt avec la story implémentée et commitée
  Quand j'exécute "npm run lint" puis "npm test"
  Alors les deux commandes se terminent avec le code 0
  Et "npm test" annonce au moins 72 tests passés, 6 todo et 0 échec
  Et "git diff --name-only origin/main...HEAD -- tests/" ne liste que tests/appVersion.test.ts et tests/appFooter.test.ts
  Et, une fois la spec approuvée, "FAST=1 bash scripts/verify.sh" se termine avec le code 0 et affiche "PORTE QUALITÉ : OK"

Scénario: C11 — Lisibilité au-dessus du dock (vérification manuelle)
  Étant donné l'URL de preview Vercel de la PR (HTTPS, jamais localhost), tiroir de pensées fermé
  Quand j'ouvre "/" en 390 × 844 puis en 1280 × 800, dans l'état vide puis dans l'état résultats, et que je défile jusqu'en bas
  Alors le texte de version est entièrement visible, sans aucune partie recouverte par le dock de capture
  Et quand j'ouvre "/partage" avec un lien valide et que je défile jusqu'en bas, le texte de version est visible sous « Signaler ce contenu »
  (constat reporté dans la PR, avec une capture par gabarit d'écran)
```

## Périmètre
Fichiers que la story a le droit de modifier, un par ligne. `scripts/verify.sh` refuse tout fichier absent
de cette liste (la spec elle-même est toujours autorisée).
```scope
app/_lib/appVersion.ts
app/_components/AppFooter.tsx
app/_components/FocusFlowApp.tsx
app/page.tsx
app/partage/page.tsx
tests/appVersion.test.ts
tests/appFooter.test.ts
```

Volontairement absents : `package.json` et `package-lock.json` (aucune dépendance nouvelle, version non
modifiée), `app/layout.tsx`, `app/partage/ShareView.tsx`, `app/_components/Brand.tsx`,
`tests/ecartsConnus.test.ts`, `next.config.ts`, `vitest.config.ts`. Les réponses à QO1, QO2 et QO4 peuvent
imposer d'ajouter des fichiers à ce bloc (indiqué dans chaque question).

## Règles critiques (sabotage)
| # | Règle | Mutation à appliquer | Test attendu au rouge |
|---|---|---|---|
| R1 | La version affichée vient de `package.json`, jamais d'un littéral | Remplacer la lecture de `package.json` par la chaîne `"0.1.0"` | `tests/appFooter.test.ts` — C2 (attend `v9.8.7`) |
| R2 | Une version absente ou invalide n'est jamais affichée | Supprimer la validation : renvoyer `"v" + raw` sans contrôle | `tests/appVersion.test.ts` — C4 |
| R3 | Pas de pied de page vide ni de « vundefined » quand la version est indisponible | Rendre `<footer>` même quand le libellé vaut `null` | `tests/appFooter.test.ts` — C5 |
| R4 | Le libellé est exactement `v` suivi de la version | Retirer le préfixe `v` | `tests/appVersion.test.ts` — C1 et C3 |
| R5 | Le pied de page est présent sur l'accueil | Retirer le pied de page de `app/page.tsx` | `tests/appFooter.test.ts` — C6 |
| R6 | Sur l'accueil, le pied de page est dans le contenu, avant le dock | Rendre le pied de page après `<CaptureDock />` dans `FocusFlowApp.tsx` | `tests/appFooter.test.ts` — C6 (ordre des indices) |
| R7 | Le pied de page est présent sur la page de partage, hors de `ShareView` | Retirer le pied de page de `app/partage/page.tsx` | `tests/appFooter.test.ts` — C7 |

## Écarts connus (non corrigés ici)
Issues `ecart-regle` ouvertes (`gh issue list --label ecart-regle`) : #7, #8, #9, #10, #11, #13, #14. Aucune
n'est corrigée par cette story. Deux d'entre elles touchent des fichiers voisins et ne doivent pas être
corrigées « au passage » :
- #9 — Échecs silencieux : sauvegarde localStorage et copie presse-papiers (`FocusFlowApp.tsx`, dans le périmètre pour une autre raison).
- #11 — ShareView : pas de gestion d'erreur si decodeSharePayload lève une exception (`ShareView.tsx`, hors périmètre).

Les `it.todo` correspondants existent déjà dans `tests/ecartsConnus.test.ts:9-16` ; ce fichier n'est pas modifié.

Écart **candidat**, non encore tracé : la pastille `v0.3 · build` de `app/_components/Brand.tsx:8-10` (QO2).
Aucune issue n'a été créée pendant ce cadrage.

## Hors périmètre
- Modifier le champ `version` de `package.json`, créer des tags git ou définir un processus de publication.
- Modifier ou supprimer la pastille `v0.3 · build` de `Brand.tsx` (sauf décision contraire sur QO2).
- Ajouter la version au courriel « Signaler ce contenu » ou créer un canal « signaler un problème » (QO8).
- Afficher un SHA de commit, une date de build ou un lien vers un journal des modifications (sauf décision sur QO1).
- Toute modification de `app/layout.tsx`, de `ShareView.tsx`, du dock ou de la réserve basse `pb-[180px]`.
- Toute nouvelle dépendance (jsdom, Testing Library, etc.).

## Contrats techniques

Proposition, valable sous H1 à H7.

### `app/_lib/appVersion.ts` (utilitaire, exports nommés)
- `formatAppVersion(raw: unknown): string | null`
  - renvoie `"v" + raw` si `raw` est une chaîne qui correspond en entier à
    `^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$` ;
  - renvoie `null` dans tous les autres cas (pas de `trim`, pas d'exception levée).
- `getAppVersionLabel(): string | null` : applique `formatAppVersion` au champ `version` de `package.json`,
  lu par import statique relatif (convention : imports relatifs, pas d'alias `@/*`).
- Aucune lecture de `process.env`, aucun accès réseau, aucune horloge.

### `app/_components/AppFooter.tsx` (composant serveur)
- `export default function AppFooter()`, sans prop, **sans** `"use client"` et sans hook.
- Si `getAppVersionLabel()` vaut `null` : renvoie `null`.
- Sinon : un unique élément `<footer>` dont le texte est le libellé, rendu comme **une seule chaîne**
  (pas de `v{version}` en deux nœuds, pour que le HTML contienne `v0.1.0` de façon contiguë).
- Style proposé (H6) : `font-mono text-[11px] text-ink-faint`, centré, comme la mention de
  `ShareView.tsx:244`. Aucun champ de saisie, donc la règle « inputs ≥ 16 px » ne s'applique pas.

### Insertion dans les pages
- Accueil : `app/page.tsx` passe `<AppFooter />` à `FocusFlowApp` par une prop de type `React.ReactNode`
  (nom proposé : `footer`), et `FocusFlowApp` la rend comme **dernier enfant du conteneur de la ligne 172**,
  hors des blocs conditionnels des lignes 183 et 221 : le pied de page est donc présent dans les trois états
  (vide, chargement, résultats) et la réserve `pb-[180px]` reste sous lui. Passer le composant serveur en prop
  (et non l'importer dans le composant client) évite d'embarquer `package.json` dans le bundle client (C9).
- Partage : `app/partage/page.tsx` rend `<AppFooter />` après `<ShareView />`, sans modifier `ShareView`.
- Les textes, classes et comportements existants des deux pages ne changent pas.

## Plan de tâches
T0 (tests de caractérisation) **non prévu** : la story est additive (deux fichiers créés, trois insertions
sans retrait). Le rendu complet des pages n'a pas de test aujourd'hui, et le figer reviendrait à figer la
pastille `v0.3 · build`, constat contesté (QO2). La non-régression est portée par C10 : la suite existante
reste verte et aucun fichier de test existant n'est modifié. Si QO2 conduit à modifier `Brand.tsx`, il
s'agira d'un changement voulu de comportement, à spécifier par un critère dédié, pas d'un T0.

- [ ] T1 — `app/_lib/appVersion.ts` et `tests/appVersion.test.ts` : `formatAppVersion`, `getAppVersionLabel` (critères : C1, C3, C4)
- [ ] T2 — `app/_components/AppFooter.tsx` et `tests/appFooter.test.ts` : rendu nominal et rendu vide (critères : C2, C5)
- [ ] T3 — Insertion sur l'accueil : `app/page.tsx`, `app/_components/FocusFlowApp.tsx` (critères : C6)
- [ ] T4 — Insertion sur la page de partage : `app/partage/page.tsx` (critères : C7)
- [ ] T5 — Build et contrôles sur `.next/` ; lint, tests, porte qualité (critères : C8, C9, C10)
- [ ] T6 — Sabotage : appliquer R1 à R7 une par une, constater le test au rouge, annuler ; consigner le résultat dans la PR
- [ ] T7 — Vérification manuelle sur la preview Vercel, captures dans la PR (critères : C11)

## Hypothèses
- H1 — **Source** : le champ `version` de `package.json` (`0.1.0`), seule source de version présente dans le
  dépôt (pas de tag git). Renvoie à QO1.
- H2 — **Libellé** : `v` suivi de la version, sans autre mot (`v0.1.0`). Renvoie à QO3.
- H3 — **Pages** : accueil `/` et page `/partage` (lien valide et lien invalide, puisque le pied de page est
  hors de `ShareView`). Pas `/_not-found`. Renvoie à QO4.
- H4 — **Emplacement** : un nouvel élément `<footer>` dans le flux de la page, en fin de contenu ; sur
  l'accueil, au-dessus de la réserve du dock, jamais en position fixe. Renvoie à QO5.
- H5 — **Version indisponible ou invalide** : le pied de page n'est pas rendu, le build n'échoue pas.
  Renvoie à QO6.
- H6 — **Style** : repris de la mention « Ce lien n'expire pas. ». Renvoie à QO7.
- H7 — Le pied de page n'est pas placé dans `app/layout.tsx` : ce fichier importe `next/font/google`, non
  sondé sous Vitest, et un pied de page commun ne peut pas tenir compte du dock, présent sur l'accueil
  seulement.
- H8 — Le contenu de la page Notion n'a pas été relu pendant ce cadrage : le texte de la story et le constat
  « sections vides » sont ceux transmis avec la demande.
- H9 — La valeur affichée est figée au build (pages statiques) : un déploiement sans changement de
  `package.json` affiche le même numéro que le précédent.

## Questions ouvertes
- **QO1 (bloquante) — D'où vient le numéro de version ?** `package.json` vaut `0.1.0` depuis le commit
  initial et rien ne l'incrémente : avec H1, tous les déploiements afficheront `v0.1.0`, ce qui ne permet pas
  de « savoir quelle version j'utilise ». Options : (a) `package.json`, avec une règle d'incrément à définir
  (qui, quand) ; (b) SHA court du commit déployé, fourni par une variable d'environnement de build (les
  variables système de Vercel n'ont pas été vérifiées ici) ; (c) les deux (`v0.1.0 · a1b2c3d`). Les options
  (b) et (c) changent C2, C5, R1, le contrat de `appVersion.ts`, et peuvent ajouter `next.config.ts` au périmètre.
- **QO2 (bloquante) — Que faire de la pastille `v0.3 · build` (`Brand.tsx:8-10`) ?** Elle est en dur et
  contredit `package.json`. Avec cette story, l'accueil afficherait deux versions différentes (`v0.3 · build`
  en haut, `v0.1.0` en bas). Options : (a) la laisser et ouvrir une issue `ecart-regle`, avec un
  `it.todo("#N — …")` dans `tests/ecartsConnus.test.ts` (fichier à ajouter au périmètre) ; (b) la retirer ou
  l'alimenter par la même source dans cette story (`app/_components/Brand.tsx` à ajouter au périmètre, plus un
  critère dédié) ; (c) considérer que la pastille **est** l'affichage de version voulu et que la story se
  réduit à la brancher sur la vraie source. Quelle est la bonne valeur : `0.3` ou `0.1.0` ?
- **QO3 — Libellé et format exacts ?** `v0.1.0`, `Version 0.1.0`, `FocusFlow v0.1.0`, autre ? Les préversions
  (`1.2.3-beta.1`) doivent-elles s'afficher telles quelles ? Faut-il une longueur maximale ?
- **QO4 — Sur quelles pages ?** Accueil seul, ou aussi `/partage` ? Le destinataire d'un coup de pouce
  a-t-il besoin de la version ? Faut-il aussi la page 404 (`/_not-found`), ce qui imposerait `app/layout.tsx`
  ou un fichier `app/not-found.tsx` dans le périmètre ?
- **QO5 — Emplacement par rapport au dock et à l'écran « Lien invalide » ?** Sur l'accueil : dans le flux
  au-dessus de la réserve du dock (H4), ou dans le dock lui-même, ou ailleurs ? Le tiroir de pensées ouvert
  peut-il recouvrir la version ? Sur « Lien invalide » (`ShareView.tsx:43`, `min-h-screen`), la version serait
  visible seulement après défilement : acceptable, ou faut-il l'intégrer à cet écran (`ShareView.tsx` au périmètre) ?
- **QO6 — Comportement si la version est indisponible ou invalide ?** Masquer le pied de page (H5), afficher
  un texte de repli (lequel ?), ou faire échouer le build ? La règle « jamais d'échec silencieux » de
  `CLAUDE.md` vise les erreurs montrées à l'utilisateur ; s'applique-t-elle ici ?
- **QO7 — Style et accessibilité ?** Taille, couleur et contraste du texte (11 px en `text-ink-faint`
  proposé), alignement, séparateur éventuel. Le registre de ton au-delà du tutoiement est « non défini » dans
  `CLAUDE.md` : un pied de page réduit à un numéro convient-il, ou faut-il une phrase ?
- **QO8 — Quel est le canal de signalement visé par le « afin de » ?** Il n'existe aujourd'hui que
  « Signaler ce contenu » sur la page de partage. La version doit-elle être ajoutée au corps de ce courriel ?
  Un lien « signaler un problème » est-il attendu dans le pied de page ? (Hors périmètre par défaut.)
- **QO9 — Le pied de page doit-il contenir autre chose que la version ?** (mention légale, lien, crédit).
  Par défaut : la version seule.

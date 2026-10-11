@AGENTS.md

# focusflow

> Ce fichier est chargé à chaque session. Il ne contient que ce qui est propre à CE projet ;
> le processus (spec → code → revue) vient du plugin `factory`.

> Une règle marquée « non défini » n'est pas une invitation à décider : remonte-la comme question ouverte dans la spec, ne l'invente pas.

## Projet
- FocusFlow, app web en français : transforme une tâche floue en micro-étapes actionnables (API Claude) pour les personnes bloquées devant une tâche trop abstraite pour démarrer, sans compte ; usage secondaire : envoyer un « coup de pouce » à un proche.
- Cadrage public volontairement élargi, sans positionnement dispositif médical (ni diagnostic, ni promesse thérapeutique) ; cible TDAH explicite dans l'interface : non défini.
- Ton : tutoiement, bienveillant, court et direct (ex. « Décris ta tâche en quelques mots. ») ; registre au-delà de ça et liste de termes interdits : non défini.

## Stack
Next.js App Router, React, TypeScript, Tailwind CSS (animations en CSS : animate-step-in), API Claude (`claude-sonnet-4-6`) via app/api/breakdown, hébergement Vercel (DNS chez OVH).

## Conventions produit
- Erreurs : bandeau orange inline sous le bouton, message exact de l'API, ✕ pour fermer, réinitialisé à chaque nouveau submit ; jamais d'échec silencieux (console seule).
- Design « warm editorial » : titres serif, accent orange, étapes numérotées 01/02/03, barre de progression, dock de capture fixe en bas ; inputs ≥ 16 px (zoom iOS Safari).
- Humeur en 4 états (low / mid / high / panic) : panic = 3 à 4 étapes maximum, très courtes, dont une étape de respiration ; high = étapes plus ambitieuses ; low = 5 à 6 étapes de 2 à 5 min ; mid = 4 à 5 étapes de 3 à 15 min (prompt dans app/api/breakdown/route.ts).
- Limites : tâche 3–500 caractères (compteur « n / 500 »), message de coup de pouce 150 caractères max ; le destinataire voit une phrase de cadrage et la mention « Ce lien n'expire pas. ».
- Hors périmètre (backlog, non lancé) : comptes utilisateurs (Supabase), app native/stores (PWA envisagée), rappels, historique, paywall (produit gratuit).
- Écarts connus entre règles et code : suivis dans les issues GitHub étiquetées `ecart-regle`. Ne les corriger que dans une story dédiée.

## Décisions non négociables
- Ni base de données ni compte : coup de pouce dans l'URL, contenu compressé (deflate-raw), encodé en base64url, placé dans le fragment (#) de l'URL (liens permanents, divulgués dans l'UI) ; état utilisateur en localStorage.
- Sécurité en 3 couches indépendantes (validation front, sanitisation serveur, garde-fou du prompt système) ; ne jamais s'appuyer sur le front seul ; filtres contextuels, pas de mots-clés larges (faux positifs sur de vraies tâches).
- Sortie Claude en JSON strict : retirer les backticks markdown avant JSON.parse ; tout titre d'étape > 100 caractères invalide la réponse.
- Tester iOS sur la prod HTTPS ou une URL de preview Vercel, jamais sur localhost HTTP.

## Commandes
```bash
npm ci                # installation (commande npm, pas un script)
# Scripts réellement présents dans package.json
npm run dev           # serveur de développement (next dev)
npm run build         # build (next build)
npm run start         # sert le build (next start)
npm run lint          # analyse statique (eslint)
npm test              # tests (vitest run)
npm run test:watch    # tests en mode watch (vitest)
```
- État vérifié le 2026-10-12 : `npm run lint` passe sans erreur ; `npx vitest run` passe
  (8 fichiers de tests dont 1 sans test exécuté, 72 tests réussis, 6 `it.todo`, 0 échec).

## Conventions de code
- Code applicatif dans `app/` (App Router) : composants partagés dans `app/_components/`, utilitaires dans `app/_lib/`, route API dans `app/api/breakdown/route.ts`, page de partage dans `app/partage/` ; tests dans `tests/`.
- Composants React : un par fichier, nom en PascalCase, `export default function` ; composants client marqués `"use client"`.
- Utilitaires : fichiers en camelCase (`contentFilter.ts`, `sharePayload.ts`) avec exports nommés.
- Imports relatifs (l'alias `@/*` est déclaré dans tsconfig.json mais pas utilisé).
- TypeScript en mode `strict` ; ESLint 9 (flat config) avec `eslint-config-next` (core-web-vitals + typescript), sans règle ajoutée.
- Styles : classes Tailwind dans le JSX, souvent avec des valeurs arbitraires (`text-[17px]`) ; tokens de couleur et de police déclarés dans `app/globals.css`.
- Textes de l'interface et messages d'erreur en français ; commentaires de code en anglais.
- Commits : préfixes Conventional Commits (`feat:`, `fix:`, `chore:`), message en français et en minuscules, souvent avec « — » pour détailler.

## Tests
- Vitest, environnement `node` ; les tests vivent dans `tests/**/*.test.ts` (`vitest.config.ts`).
- Tests déterministes, sans réseau : le SDK Anthropic est remplacé par un double
  (`vi.mock("@anthropic-ai/sdk", …)` vers `tests/helpers/anthropicMock.ts`).
- Un test par critère d'acceptation ; jamais de test qui fige un bug connu
  (utiliser `it.todo("#N — titre de l'issue")`, comme dans `tests/ecartsConnus.test.ts`).
- Test de sabotage obligatoire avant le passage en « Ready ».

## Définition de « fini »
- `scripts/verify.sh` et le build passent en CI.
- Chaque critère est couvert par un test ; chaque règle critique est prouvée par sabotage.
- Aucun changement hors périmètre de la spec.
- Revue IA passée, puis validation et merge humains.

## Workflow
1. `/factory:ship start <US-n | issue | texte>` (ou `next` avec un backlog Notion, voir `.factory/backlog.env`)
   → branche `feat/US-<n>-<slug>`, spec en `draft`, **arrêt**.
2. Relecture humaine, décisions, `statut: approved`, commit.
3. `/factory:ship continue` → code (T0 d'abord), porte `scripts/verify.sh`, revue indépendante, PR en brouillon, **arrêt**.
4. `gh pr ready <n>` par l'humain → une revue IA en CI ; merge humain.

Étape par étape si besoin : `/factory:spec`, `/factory:implement`, `/factory:sabotage`, `/factory:review`.

## Porte qualité
`scripts/verify.sh` (réglages : `.factory/verify.env`) : spec approuvée, fichiers limités au bloc `scope` de la spec,
aucun secret ni `.env`, aucun `.only`/`.skip`, `it.todo` seulement avec `#issue`, lint, tests, mutation.
Elle tourne en CI sur chaque PR. Elle ne vérifie que ce qui est commité. Un agent ne la modifie jamais.

## Interdits
- Pas de push sur `main`, pas de force-push, pas de merge ni de « Ready » par un agent.
- Ne jamais lire ni écrire de secrets (`.env`, clés API).
- Pas de nouvelle dépendance sans justification dans la PR.

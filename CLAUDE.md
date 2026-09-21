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
# Scripts réellement présents dans package.json
npm ci            # installation
npm run lint      # analyse statique (eslint)
npm run build     # build (next build)
npm run dev       # serveur de développement
```
- `npm run lint` échoue aujourd'hui avec 7 erreurs préexistantes, à corriger dans la première story :
  4 × `react-hooks/set-state-in-effect` (CaptureDock.tsx, FocusFlowApp.tsx, FocusState.tsx, ShareView.tsx) ;
  3 × `@next/next/no-html-link-for-pages` (ShareView.tsx).
- Il n'existe pas encore de script `test`.

## Conventions de code
- Tout le code vit dans `app/` (App Router) : composants partagés dans `app/_components/`, utilitaires dans `app/_lib/`, route API dans `app/api/breakdown/route.ts`, page de partage dans `app/partage/`.
- Composants React : un par fichier, nom en PascalCase, `export default function` ; composants client marqués `"use client"`.
- Utilitaires : fichiers en camelCase (`contentFilter.ts`, `sharePayload.ts`) avec exports nommés.
- Imports relatifs (l'alias `@/*` est déclaré dans tsconfig.json mais pas utilisé).
- TypeScript en mode `strict` ; ESLint 9 (flat config) avec `eslint-config-next` (core-web-vitals + typescript), sans règle ajoutée.
- Styles : classes Tailwind dans le JSX, souvent avec des valeurs arbitraires (`text-[17px]`) ; tokens de couleur et de police déclarés dans `app/globals.css`.
- Textes de l'interface et messages d'erreur en français ; commentaires de code en anglais.
- Commits : préfixes Conventional Commits (`feat:`, `fix:`, `chore:`), message en français et en minuscules, souvent avec « — » pour détailler.

## Définition de « fini »
- Lint, tests et build passent.
- Chaque critère d'acceptation de la spec est couvert par un test.
- Aucun changement hors périmètre de la spec.
- PR relue (revue IA puis validation humaine).

## Workflow
1. Une user story = une issue GitHub (gabarit « User story »).
2. `/factory:spec <n° d'issue>` produit `specs/<ID>-<slug>.md` en `statut: draft`.
3. L'humain relit et passe la spec à `statut: approved`.
4. `/factory:implement specs/<ID>-<slug>.md` crée la branche et la PR en brouillon.
5. Revue IA, puis validation humaine, puis merge.

## Interdits
- Pas de push sur `main`, pas de force-push.
- Ne jamais lire ni écrire de secrets (`.env`, clés API).
- Pas de nouvelle dépendance sans justification dans la PR.

---
id: US-1
titre: Afficher la version de l'app dans le pied de page
statut: draft        # draft | approved (l'humain seul valide)
source: page Notion US-1 (base « User stories », Factory) — https://app.notion.com/p/835b8c2a33b544289f28a2078141ca39
---

# US-1 — Afficher la version de l'app dans le pied de page

## Story
En tant qu'**utilisateur**, je veux **voir la version de l'application dans le pied de page** afin de **savoir quelle version j'utilise quand je signale un problème**.

> La page Notion ne contient que le titre et la phrase ci-dessus. Tout le reste (source du numéro, libellé,
> pages, emplacement, cas « version indisponible », sort de la pastille existante) a été tranché par l'humain :
> voir la section « Décisions » (D1 à D9) en fin de document.

## Contexte et ancrages

Constats vérifiés le 2026-10-12 sur la branche `feat/US-1-version-pied-de-page`, code applicatif identique à
`main` (commit `8acf246`).

### Il n'existe aucun pied de page aujourd'hui
- `grep -rn -i 'footer' app/` ne renvoie qu'un commentaire : `app/_components/TaskInput.tsx:55` (`{/* Footer */}`),
  qui désigne le bas de la carte de saisie (pastilles d'humeur et compteur « n / 500 »), pas un pied de page.
- Après `npm run build`, `grep -o '<footer' .next/server/app/index.html | wc -l` et la même commande sur
  `.next/server/app/partage.html` renvoient `0`.
- `app/layout.tsx:45` : `<body>` ne contient que `{children}`.
- La story crée donc le pied de page (D5).

### Une version est déjà affichée, en dur, et elle contredit `package.json`
- `app/_components/Brand.tsx:8-10` : une pastille affiche le texte littéral `v0.3 · build` à côté du logo.
  HTML rendu aujourd'hui pour cette pastille :
  `<span class="font-mono text-[9.5px] uppercase tracking-[0.16em] text-ink-soft border border-rule rounded-full px-[7px] py-[3px] leading-none">v0.3 · build</span>`.
  La classe `text-[9.5px]` n'apparaît nulle part ailleurs dans `app/` : elle identifie la pastille dans un rendu.
- La classe `uppercase` de la pastille met le texte en capitales à l'écran : le texte HTML `v0.3.0` s'affichera
  « V0.3.0 », comme `v0.3 · build` s'affiche aujourd'hui « V0.3 · BUILD ». Les classes ne changent pas.
- `Brand` n'est utilisé que dans la barre du haut de l'accueil : `app/_components/FocusFlowApp.tsx:175`.
  La page de partage ne l'affiche pas (`.next/server/app/partage.html` : 0 occurrence de `v0.3 · build`).
- `Brand` n'a ni prop ni directive `"use client"` (`Brand.tsx:1`) ; il est importé par un composant client
  (`FocusFlowApp.tsx:1` et `:4`) et fait donc partie du bundle livré au navigateur.
- `package.json:3` : `"version": "0.1.0"`, inchangé depuis le commit initial `ca418f5`. `git tag` ne renvoie rien.
- `package-lock.json` porte ce numéro à deux endroits : `package-lock.json:3` (racine) et `package-lock.json:9`
  (entrée `packages[""]`).
- Aucun test, scénario, persona ni workflow ne cite la pastille :
  `grep -rn 'v0\.3\|Brand' tests scenarios personas .github` ne renvoie rien. `tests/ecartsConnus.test.ts` ne la
  mentionne pas.
- D2 traite ce constat : `package.json` passe à `0.3.0` et la pastille lit la même source.

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
  (`app/partage/ShareView.tsx:96` et `:256`). Il n'est pas modifié (D8).

### Outillage vérifié empiriquement
- `npm test` (`vitest run`, `package.json:9`) : code 0, `Test Files 7 passed | 1 skipped (8)`,
  `Tests 72 passed | 6 todo (78)`.
- `npm run lint` : code 0, aucune ligne d'erreur ni d'avertissement.
- `npm run build` : code 0 ; routes `/`, `/_not-found` et `/partage` marquées `○ (Static)`. La valeur
  affichée est donc **figée au moment du build**.
- `vitest.config.ts:7-8` : environnement `node`, motif `tests/**/*.test.ts` (pas de `.tsx`, pas de jsdom).
- Sonde jetable (hors dépôt, non commitée) lancée avec Vitest 4.1.11 : dans un fichier `.test.ts`,
  `renderToStaticMarkup(createElement(Composant))` de `react-dom/server` rend sans erreur `app/page.tsx`,
  `app/partage/page.tsx`, `app/_components/FocusFlowApp.tsx` et `app/_components/Brand.tsx` ;
  `import pkg from "../package.json"` fonctionne (`tsconfig.json:12`, `resolveJsonModule: true`) ; `vi.mock`
  d'un module JSON remplace bien la valeur lue. **Aucune nouvelle dépendance n'est nécessaire.**
- Dans le rendu de `app/page.tsx`, `animate-breathe` (point du logo) apparaît 1 fois, à un indice inférieur à
  celui de `fixed bottom-0` (le dock).
- `app/layout.tsx:2` importe `next/font/google` : le layout racine n'a pas été sondé sous Vitest (D5).
- Client : `grep -rl 'eslint-config-next' .next/static | wc -l` renvoie `0` aujourd'hui (le contenu de
  `package.json` n'est pas livré au navigateur).
- Documentation Next 16 embarquée,
  `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md:33` et `:295-341` :
  un composant serveur peut passer des données ou un composant serveur déjà rendu à un composant client par
  ses props.
- `scripts/verify.sh:17` et `:54` : pour la branche `feat/US-1-…`, la porte cherche `specs/US-1-*.md`. Ce motif
  ne correspond pas à `specs/US-001-lint-zero-erreur.md`.
- `scripts/verify.sh:42` exclut `package-lock.json` de l'analyse des lignes ajoutées, mais le contrôle de
  périmètre (`verify.sh:66-69`) porte sur tous les fichiers modifiés : le lockfile doit figurer dans le bloc scope.

## Critères d'acceptation

Les tests de rendu injectent la version `9.8.7` par `vi.mock` de `package.json`. Aucun test n'écrit en dur la
version courante `0.3.0` : un changement de version ne casse pas la suite. La valeur `0.3.0` est vérifiée par
commande (C12, C8).

```gherkin
# language: fr

Scénario: C0 — Caractérisation de Brand et de l'accueil (T0, écrit avant toute modification)
  Étant donné le dépôt avant toute modification de code applicatif
  Quand je rends Brand sans prop, puis le composant par défaut de app/page.tsx, avec renderToStaticMarkup
  Alors le HTML de Brand contient exactement 'Focus<span class="italic">Flow</span>'
  Et le HTML de Brand contient exactement 1 occurrence de "animate-breathe"
  Et le HTML de l'accueil contient exactement 1 occurrence de "animate-breathe" et 1 occurrence de "text-[9.5px]"
  Et dans le HTML de l'accueil, l'indice de "animate-breathe" est strictement inférieur à celui de "fixed bottom-0"
  Et ces assertions passent avant la modification et après, sans retouche :
     "git diff --numstat <commit de T0>..HEAD -- tests/brand.test.ts" affiche 0 ligne supprimée
  (vérifié par : npm test — tests/brand.test.ts, bloc « caractérisation », 2 tests :
   « C0 — logo et point inchangés », « C0 — accueil : logo et pastille avant le dock »)

Scénario: C1 — Cas nominal : format du libellé
  Étant donné la fonction formatAppVersion de app/_lib/appVersion.ts
  Quand je l'appelle avec "0.3.0", puis "10.20.30", puis "0.0.0"
  Alors elle renvoie exactement "v0.3.0", puis "v10.20.30", puis "v0.0.0"
  (vérifié par : npm test — tests/appVersion.test.ts, « C1 — préfixe v suivi de la version »)

Scénario: C2 — Cas nominal : le pied de page affiche la version de package.json
  Étant donné package.json simulé par vi.mock avec "version": "9.8.7"
  Quand je rends AppFooter avec renderToStaticMarkup
  Alors le HTML contient exactement 1 balise ouvrante "<footer"
  Et le HTML contient le texte contigu "v9.8.7"
  Et le HTML ne contient pas "0.3.0"
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
  Et le contenu de cette balise contient "v9.8.7"
  Et l'indice de "<footer" dans le HTML est strictement inférieur à l'indice de "fixed bottom-0" (le dock)
  (vérifié par : npm test — tests/appFooter.test.ts, « C6 — accueil : pied de page avant le dock »)

Scénario: C7 — Page de partage : pied de page présent même quand ShareView ne rend rien
  Étant donné package.json simulé par vi.mock avec "version": "9.8.7"
  Quand je rends le composant par défaut de app/partage/page.tsx avec renderToStaticMarkup
  Alors le HTML contient exactement 1 balise ouvrante "<footer"
  Et le contenu de cette balise contient "v9.8.7"
  (vérifié par : npm test — tests/appFooter.test.ts, « C7 — partage : pied de page hors de ShareView »)

Scénario: C8 — HTML prérendu des deux pages
  Étant donné le dépôt avec la story implémentée
  Quand j'exécute "npm run build"
  Alors la commande se termine avec le code 0
  Et "grep -o '<footer' .next/server/app/index.html | wc -l" affiche 1
  Et "grep -o '<footer' .next/server/app/partage.html | wc -l" affiche 1
  Et "grep -o 'v0\.3\.0' .next/server/app/index.html | wc -l" affiche au moins 2 (pastille et pied de page)
  Et "grep -o 'v0\.3\.0' .next/server/app/partage.html | wc -l" affiche au moins 1
  Et "grep -c 'v0.3 · build' .next/server/app/index.html" affiche 0

Scénario: C9 — package.json n'est pas livré au navigateur
  Étant donné le build du scénario C8
  Quand j'exécute "grep -rl 'eslint-config-next' .next/static | wc -l"
  Alors la commande affiche 0 (valeur identique à celle constatée avant la story)

Scénario: C10 — Non-régression de la suite et de la porte qualité
  Étant donné le dépôt avec la story implémentée et commitée
  Quand j'exécute "npm ci", puis "npm run lint", puis "npm test"
  Alors les trois commandes se terminent avec le code 0
  Et "npm test" annonce au moins 72 tests passés, 6 todo et 0 échec
  Et "git diff --name-only origin/main...HEAD -- tests/" ne liste que tests/appVersion.test.ts, tests/appFooter.test.ts et tests/brand.test.ts
  Et, une fois la spec approuvée, "FAST=1 bash scripts/verify.sh" se termine avec le code 0 et affiche "PORTE QUALITÉ : OK"

Scénario: C11 — Lisibilité au-dessus du dock (vérification manuelle)
  Étant donné l'URL de preview Vercel de la PR (HTTPS, jamais localhost), tiroir de pensées fermé
  Quand j'ouvre "/" en 390 × 844 puis en 1280 × 800, dans l'état vide puis dans l'état résultats, et que je défile jusqu'en bas
  Alors le texte de version du pied de page est entièrement visible, sans aucune partie recouverte par le dock de capture
  Et la pastille à côté du logo affiche « V0.3.0 » (capitales dues à la classe uppercase) et le pied de page « v0.3.0 »
  Et quand j'ouvre "/partage" avec un lien valide et que je défile jusqu'en bas, le texte « v0.3.0 » est visible sous « Signaler ce contenu »
  (constat reporté dans la PR, avec une capture par gabarit d'écran)

Scénario: C12 — package.json et package-lock.json portent la version 0.3.0
  Étant donné le dépôt avec la story implémentée
  Quand j'exécute node -p "require('./package.json').version"
  Alors la commande affiche exactement 0.3.0
  Et node -p "const l=require('./package-lock.json'); l.version + ' ' + l.packages[''].version" affiche exactement "0.3.0 0.3.0"
  Et "git diff --numstat origin/main...HEAD -- package.json" affiche "1	1	package.json"
  Et "git diff --numstat origin/main...HEAD -- package-lock.json" affiche "2	2	package-lock.json"

Scénario: C13 — Pastille : elle affiche la version de package.json
  Étant donné package.json simulé par vi.mock avec "version": "9.8.7"
  Quand je rends le composant par défaut de app/page.tsx avec renderToStaticMarkup
  Alors le HTML contient exactement 1 élément <span> dont l'attribut class contient "text-[9.5px]"
  Et le contenu texte de cet élément est exactement "v9.8.7" (ni « · build », ni autre suffixe)
  Et le HTML ne contient ni "v0.3 · build" ni "0.3.0"
  Et l'attribut class de cet élément est exactement
     "font-mono text-[9.5px] uppercase tracking-[0.16em] text-ink-soft border border-rule rounded-full px-[7px] py-[3px] leading-none"
  (vérifié par : npm test — tests/brand.test.ts, « C13 — pastille : version lue dans package.json »)

Scénario: C14 — Pastille : cas d'erreur, version indisponible
  Étant donné package.json simulé par vi.mock sans champ "version"
  Quand je rends le composant par défaut de app/page.tsx avec renderToStaticMarkup
  Alors le HTML contient 0 occurrence de "text-[9.5px]" (la pastille n'est pas rendue)
  Et le HTML contient 0 balise "<footer"
  Et le HTML ne contient ni "undefined", ni "vnull", ni "v0.3"
  Et le HTML contient toujours 'Focus<span class="italic">Flow</span>'
  (vérifié par : npm test — tests/brand.test.ts, « C14 — pastille absente si la version est indisponible »)

Scénario: C15 — Plus aucun littéral de version dans Brand.tsx
  Étant donné le dépôt avec la story implémentée
  Quand j'exécute "grep -cE 'v[0-9]+\.[0-9]|build' app/_components/Brand.tsx"
  Alors la commande affiche 0
  Et "grep -c 'package.json' app/_components/Brand.tsx" affiche 0 (Brand reçoit le libellé, il ne lit pas le fichier)
```

## Périmètre
Fichiers que la story a le droit de modifier, un par ligne. `scripts/verify.sh` refuse tout fichier absent
de cette liste (la spec elle-même est toujours autorisée).
```scope
app/_lib/appVersion.ts
app/_components/AppFooter.tsx
app/_components/Brand.tsx
app/_components/FocusFlowApp.tsx
app/page.tsx
app/partage/page.tsx
package.json
package-lock.json
tests/appVersion.test.ts
tests/appFooter.test.ts
tests/brand.test.ts
```

11 fichiers : les 7 de la version précédente, les 3 ajoutés par D2 (`app/_components/Brand.tsx`,
`package.json`, `package-lock.json`) et `tests/brand.test.ts`, qui porte T0 (C0) et les tests de la pastille
(C13, C14).

Volontairement absents : `app/layout.tsx`, `app/partage/ShareView.tsx`, `tests/ecartsConnus.test.ts`,
`next.config.ts`, `vitest.config.ts`. `package.json` et `package-lock.json` ne sont autorisés que pour le
changement de version (C12) : aucune dépendance ajoutée, retirée ou mise à jour.

## Règles critiques (sabotage)
| # | Règle | Mutation à appliquer | Test attendu au rouge |
|---|---|---|---|
| R1 | La version du pied de page vient de `package.json`, jamais d'un littéral | Dans `appVersion.ts`, remplacer la lecture de `package.json` par la chaîne `"0.3.0"` | `tests/appFooter.test.ts` — C2 (attend `v9.8.7`) |
| R2 | Une version absente ou invalide n'est jamais affichée | Supprimer la validation : renvoyer `"v" + raw` sans contrôle | `tests/appVersion.test.ts` — C4 |
| R3 | Pas de pied de page vide ni de « vundefined » quand la version est indisponible | Rendre `<footer>` même quand le libellé vaut `null` | `tests/appFooter.test.ts` — C5 |
| R4 | Le libellé est exactement `v` suivi de la version | Retirer le préfixe `v` | `tests/appVersion.test.ts` — C1 et C3 |
| R5 | Le pied de page est présent sur l'accueil | Retirer le pied de page de `app/page.tsx` | `tests/appFooter.test.ts` — C6 |
| R6 | Sur l'accueil, le pied de page est dans le contenu, avant le dock | Rendre le pied de page après `<CaptureDock />` dans `FocusFlowApp.tsx` | `tests/appFooter.test.ts` — C6 (ordre des indices) |
| R7 | Le pied de page est présent sur la page de partage, hors de `ShareView` | Retirer le pied de page de `app/partage/page.tsx` | `tests/appFooter.test.ts` — C7 |
| R8 | La pastille de `Brand.tsx` affiche la même source que le pied de page, sans littéral | Dans `Brand.tsx`, remettre le texte littéral `v0.3.0` à la place du libellé reçu | `tests/brand.test.ts` — C13 (attend `v9.8.7`) |
| R9 | La pastille n'est pas rendue quand la version est indisponible | Dans `Brand.tsx`, rendre la pastille même quand le libellé vaut `null` | `tests/brand.test.ts` — C14 |

## Écarts connus (non corrigés ici)
Issues `ecart-regle` ouvertes (`gh issue list --label ecart-regle`) : #7, #8, #9, #10, #11, #13, #14. Aucune
n'est corrigée par cette story. Deux d'entre elles touchent des fichiers voisins et ne doivent pas être
corrigées « au passage » :
- #9 — Échecs silencieux : sauvegarde localStorage et copie presse-papiers (`FocusFlowApp.tsx`, dans le périmètre pour une autre raison).
- #11 — ShareView : pas de gestion d'erreur si decodeSharePayload lève une exception (`ShareView.tsx`, hors périmètre).

Les `it.todo` correspondants existent déjà dans `tests/ecartsConnus.test.ts:9-16` ; ce fichier n'est pas modifié.

La pastille `v0.3 · build` n'est pas un écart à tracer : elle est corrigée dans cette story (D2). Aucune
issue ni `it.todo` n'est créé pour elle.

## Hors périmètre
- Afficher un SHA de commit, une date de build ou un lien vers un journal des modifications (D1).
- Créer des tags git ou définir un processus d'incrément de version.
- Toute modification de `package.json` ou de `package-lock.json` autre que le passage de la version à `0.3.0`.
- Modifier les classes, la position ou le logo de `Brand` : seul le texte de la pastille et sa source changent.
- Ajouter la version au courriel « Signaler ce contenu » ou créer un canal « signaler un problème » (D8).
- Tout autre contenu dans le pied de page que la version (D9).
- Pied de page sur la page 404 (`/_not-found`) (D4).
- Toute modification de `app/layout.tsx`, de `ShareView.tsx`, du dock ou de la réserve basse `pb-[180px]`.
- Toute nouvelle dépendance (jsdom, Testing Library, etc.).

## Contrats techniques

### `package.json` et `package-lock.json`
- `package.json:3` : `"version": "0.3.0"`. Aucune autre ligne modifiée.
- `package-lock.json:3` et `package-lock.json:9` : `"version": "0.3.0"`. Aucune autre ligne modifiée (C12).

### `app/_lib/appVersion.ts` (utilitaire, exports nommés)
- `formatAppVersion(raw: unknown): string | null`
  - renvoie `"v" + raw` si `raw` est une chaîne qui correspond en entier à
    `^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$` ;
  - renvoie `null` dans tous les autres cas (pas de `trim`, pas de longueur maximale, pas d'exception levée).
- `getAppVersionLabel(): string | null` : applique `formatAppVersion` au champ `version` de `package.json`,
  lu par import statique relatif (convention : imports relatifs, pas d'alias `@/*`).
- C'est le **seul** fichier de `app/` qui importe `package.json`. Il n'est importé que par des composants
  serveur (`AppFooter.tsx`, `app/page.tsx`), jamais par un composant client ni par `Brand.tsx` (C9, C15).
- Aucune lecture de `process.env`, aucun accès réseau, aucune horloge.

### `app/_components/AppFooter.tsx` (composant serveur)
- `export default function AppFooter()`, sans prop, **sans** `"use client"` et sans hook.
- Si `getAppVersionLabel()` vaut `null` : renvoie `null`.
- Sinon : un unique élément `<footer>` dont le texte est le libellé, rendu comme **une seule chaîne**
  (pas de `v{version}` en deux nœuds, pour que le HTML contienne `v0.3.0` de façon contiguë).
- Style (D7) : `font-mono text-[11px] text-ink-faint`, centré, comme la mention de `ShareView.tsx:244`.
  Aucun champ de saisie, donc la règle « inputs ≥ 16 px » ne s'applique pas.

### `app/_components/Brand.tsx` (pastille)
- Signature : `export default function Brand({ versionLabel }: { versionLabel?: string | null })`.
- Si `versionLabel` est une chaîne non vide : la pastille est rendue avec ce texte **seul**, en une seule
  chaîne, dans le `<span>` existant, classes inchangées (C13). Le suffixe « · build » disparaît.
- Sinon (`undefined`, `null`, `""`) : la pastille n'est pas rendue ; le point et le logo restent (C14, C0).
- `Brand.tsx` ne contient plus aucun littéral de version et n'importe ni `package.json` ni `appVersion.ts` (C15).

### Insertion dans les pages
- Accueil : `app/page.tsx` (composant serveur) appelle `getAppVersionLabel()` une fois et passe deux props à
  `FocusFlowApp` :
  - `versionLabel: string | null`, que `FocusFlowApp` transmet à `<Brand />` (`FocusFlowApp.tsx:175`) ;
  - `footer: React.ReactNode`, valant `<AppFooter />`, que `FocusFlowApp` rend comme **dernier enfant du
    conteneur de la ligne 172**, hors des blocs conditionnels des lignes 183 et 221 : le pied de page est
    présent dans les trois états (vide, chargement, résultats) et la réserve `pb-[180px]` reste sous lui.
  Le libellé et le pied de page traversent la frontière client par les props : `package.json` n'entre pas
  dans le bundle client (C9).
- Partage : `app/partage/page.tsx` rend `<AppFooter />` après `<ShareView />`, sans modifier `ShareView`.
- Les autres textes, classes et comportements des deux pages ne changent pas.

## Plan de tâches
- [ ] T0 — Tests de caractérisation, **avant toute modification de code applicatif**, dans un commit à part :
      `tests/brand.test.ts`, bloc « caractérisation » (critère : C0). Ils passent sur le code actuel et ne sont
      plus retouchés ensuite. Ils ne figent **pas** le texte `v0.3 · build` : D2 le remplace volontairement ;
      ils figent le logo, le point, la présence et la position de la pastille sur l'accueil.
- [ ] T1 — Version `0.3.0` : exécuter `npm version 0.3.0 --no-git-tag-version`, qui met à jour
      `package.json:3`, `package-lock.json:3` et `package-lock.json:9` sans créer de commit ni de tag ; contrôler
      que le diff se limite à ces 3 lignes ; `npm ci` passe (critères : C12, C10)
- [ ] T2 — `app/_lib/appVersion.ts` et `tests/appVersion.test.ts` : `formatAppVersion`, `getAppVersionLabel` (critères : C1, C3, C4)
- [ ] T3 — `app/_components/AppFooter.tsx` et `tests/appFooter.test.ts` : rendu nominal et rendu vide (critères : C2, C5)
- [ ] T4 — Accueil : `app/page.tsx`, `app/_components/FocusFlowApp.tsx` (props `versionLabel` et `footer`),
      `app/_components/Brand.tsx` (prop `versionLabel`, littéral retiré), tests de la pastille ajoutés à
      `tests/brand.test.ts` sans toucher au bloc « caractérisation » (critères : C6, C13, C14, C15, C0)
- [ ] T5 — Insertion sur la page de partage : `app/partage/page.tsx` (critères : C7)
- [ ] T6 — Build et contrôles sur `.next/` ; lint, tests, porte qualité (critères : C8, C9, C10)
- [ ] T7 — Sabotage : appliquer R1 à R9 une par une, constater le test au rouge, annuler ; consigner le résultat dans la PR
- [ ] T8 — Vérification manuelle sur la preview Vercel, captures dans la PR (critères : C11)

## Hypothèses
Les anciennes hypothèses H1 à H7 sont devenues les décisions D1 et D3 à D7. Restent :
- H8 — Le contenu de la page Notion n'a pas été relu pendant ce cadrage : le texte de la story et le constat
  « sections vides » sont ceux transmis avec la demande.
- H9 — La valeur affichée est figée au build (pages statiques) : un déploiement sans changement de
  `package.json` affiche le même numéro que le précédent.
- H10 — `npm version 0.3.0 --no-git-tag-version` ne modifie que les 3 lignes citées en T1. Non exécuté pendant
  ce cadrage (aucune modification du dépôt hors spec) ; C12 le contrôle par `git diff --numstat`.

## Décisions
Tranchées par l'humain le 2026-10-12. D_n répond à l'ancienne question ouverte QO_n.

- **D1 — Source du numéro.** La source unique est le champ `version` de `package.json`. Le SHA de commit
  n'est pas affiché.
- **D2 — Pastille de `Brand.tsx`.** `package.json` passe à `0.3.0`. La pastille lit la même source que le
  pied de page et affiche « v0.3.0 ». `Brand.tsx` ne contient plus aucun littéral de version. Les fichiers
  `app/_components/Brand.tsx`, `package.json` et `package-lock.json` entrent dans le périmètre ; C12 à C15 et
  R8, R9 couvrent cette décision.
- **D3 — Libellé et format.** Le libellé est `v` suivi de la version, sans autre mot (`v0.3.0`). Une
  préversion s'affiche telle quelle (`v1.2.3-beta.1`). Pas de longueur maximale.
- **D4 — Pages.** Le pied de page apparaît sur l'accueil `/` et sur `/partage` (lien valide et lien
  invalide). Il n'apparaît pas sur la page 404.
- **D5 — Emplacement.** Le pied de page est un nouvel élément `<footer>` dans le flux, en fin de contenu,
  jamais en position fixe. Sur l'accueil, il est au-dessus de la réserve du dock ; la lisibilité est vérifiée
  tiroir fermé (C11). Sur l'écran « Lien invalide », il est visible après défilement. Il n'est pas placé dans
  `app/layout.tsx`.
- **D6 — Version indisponible ou invalide.** Le pied de page n'est pas rendu et le build n'échoue pas.
- **D7 — Style.** `font-mono text-[11px] text-ink-faint`, centré, comme la mention « Ce lien n'expire pas. ».
  Le pied de page se réduit au numéro, sans phrase.
- **D8 — Canal de signalement.** Hors périmètre : le courriel « Signaler ce contenu » n'est pas modifié et
  aucun lien « signaler un problème » n'est créé.
- **D9 — Contenu du pied de page.** La version seule.

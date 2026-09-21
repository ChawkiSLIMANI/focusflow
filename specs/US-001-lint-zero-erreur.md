---
id: US-001
titre: npm run lint passe sans erreur
statut: approved        # draft | approved (l'humain seul valide)
source: user story libre (pas d'issue GitHub)
---

# US-001 — npm run lint passe sans erreur

## Story
En tant que **développeur de FocusFlow**, je veux **que `npm run lint` se termine avec 0 erreur et 0 avertissement** afin que **la CI puisse valider chaque changement (l'étape « Lint » du workflow `ci.yml` échoue aujourd'hui sur toutes les PR)**.

## Contexte et hypothèses

### État constaté (vérifié le 2026-09-21, `npm run lint`)
7 erreurs, réparties sur 4 fichiers :

| # | Fichier | Ligne:col | Règle |
|---|---------|-----------|-------|
| E1 | `app/_components/CaptureDock.tsx` | 29:32 | `react-hooks/set-state-in-effect` |
| E2 | `app/_components/FocusFlowApp.tsx` | 72:23 | `react-hooks/set-state-in-effect` |
| E3 | `app/_components/FocusState.tsx` | 25:5 | `react-hooks/set-state-in-effect` |
| E4 | `app/partage/ShareView.tsx` | 31:7 | `react-hooks/set-state-in-effect` |
| E5 | `app/partage/ShareView.tsx` | 54:9 | `@next/next/no-html-link-for-pages` |
| E6 | `app/partage/ShareView.tsx` | 106:7 | `@next/next/no-html-link-for-pages` |
| E7 | `app/partage/ShareView.tsx` | 247:9 | `@next/next/no-html-link-for-pages` |

Les numéros de ligne sont ceux de l'état actuel du dépôt ; ils bougeront pendant l'implémentation. Le repère fiable est le bloc de code décrit ci-dessous, pas le numéro.

### Éléments d'ancrage vérifiés dans le code
- `eslint.config.mjs` : `eslint-config-next/core-web-vitals` + `eslint-config-next/typescript`, aucune règle ajoutée. **Ce fichier ne doit pas changer.**
- `package.json` : scripts `dev`, `build`, `start`, `lint` (`eslint`). **Pas de script `test`, aucun framework de test installé.** Ne pas en ajouter (hors périmètre).
- CI (`.github/workflows/ci.yml`, sur `main`) : workflow autonome, sans appel à un dépôt distant. Il exécute, dans l'ordre : `actions/checkout@v4`, `actions/setup-node@v4` (`node-version: "24"`, cache npm), `npm ci`, `npm run lint`, `npm test --if-present` (sans effet ici), `npm run build`. Les étapes « Tests » et « Build » portent `if: ${{ !cancelled() }}` : elles tournent même si le lint échoue. La définition de « fini » automatisable pour cette story se réduit donc à **lint + build**.
- `next/link` n'est utilisé nulle part dans `app/` aujourd'hui (`grep -rn "next/link" app/` → aucun résultat) : le premier `import Link from "next/link"` est introduit par cette story.
- Documentation Next 16 embarquée (`node_modules/next/dist/docs/01-app/03-api-reference/02-components/link.md`) : `<Link href="…">` rend directement un `<a>`, accepte les props HTML (`className`), et il n'existe plus de `legacyBehavior`. La forme attendue est donc `<Link href="/" className="…">texte</Link>`, sans `<a>` imbriqué.
- `decodeSharePayload` (`app/_lib/sharePayload.ts`, 1re ligne du corps) commence par `if (!encoded || encoded.length > 2000) return null;` : appeler la fonction avec une chaîne vide renvoie `null` sans jeter. C'est ce qui rend la correction de E4 sûre.

### Hypothèses
- H1 — Le rendu HTML/CSS et les textes de l'interface restent strictement identiques ; seule la nature de la navigation vers `/` change (rechargement complet → navigation client-side Next, avec préchargement). Cet écart est **assumé et voulu** : c'est l'objet même de la règle `@next/next/no-html-link-for-pages`.
- H2 — L'état de `/` est restauré depuis `localStorage` dans un effet de montage ; cet effet s'exécute aussi bien après une navigation client-side qu'après un rechargement complet. La navigation `<Link>` depuis `/partage` vers `/` affiche donc la même page qu'aujourd'hui.
- H3 — `npm run build` ne nécessite aucune variable d'environnement : vérifié en CI, où l'étape « Build » passe sans `ANTHROPIC_API_KEY` (run 35548355138 sur `main`, lint en échec, build vert).
- H4 — Le comportement de `react-hooks/set-state-in-effect` observé est : un seul signalement par effet (l'effet de `FocusFlowApp` contient 5 `setState` et n'en remonte qu'un), et aucun signalement pour les `setState` appelés dans un callback asynchrone (`.then(...)` de `ShareView` : non signalé). L'implémentation doit vérifier ce point empiriquement (cf. T2).

### Décision cas par cas sur les 4 `set-state-in-effect`
La story autorise deux traitements : correction évidente et sans risque, ou `eslint-disable` ciblé avec TODO. Arbitrage après lecture du code réel :

**E1 — `CaptureDock.tsx` → CORRECTION ÉVIDENTE (état dérivé).**
L'effet incriminé est un simple garde-fou :
```tsx
// Close drawer when thoughts become empty
useEffect(() => {
  if (thoughts.length === 0) setOpen(false);
}, [thoughts.length]);
```
`open` ne doit jamais être « vrai » quand `thoughts` est vide : c'est de l'état dérivé, pas une synchronisation avec un système externe. Correction : supprimer l'effet et calculer, à chaque rendu, `const isOpen = open && thoughts.length > 0;`, puis utiliser `isOpen` partout où le JSX lit `open` (hauteur/opacité/marge du panneau, libellé `aria-label` et chevron du bouton de bascule, style actif du bouton). Aucun risque d'hydratation : le composant ne lit ni `localStorage`, ni l'URL.
Nuance à connaître : avec l'état dérivé, `open` reste `true` en mémoire si la liste redevient non vide. Dans le code actuel, le seul chemin qui vide `thoughts` est `handleTransform`, qui appelle déjà `setOpen(false)` avant `onTransform` (`FocusFlowApp.transformThought` filtre la pensée) ; les deux comportements coïncident donc sur tous les chemins atteignables. Le critère d'acceptation 5 vérifie explicitement ce point ; si l'implémentation trouve un chemin où le tiroir se rouvre seul, elle bascule sur `eslint-disable` ciblé (cf. règle de repli, T5).

**E4 — `ShareView.tsx` → CORRECTION ÉVIDENTE (suppression d'un cas particulier redondant).**
```tsx
const hash = window.location.hash.slice(1);
if (!hash) {
  setReady(true);   // ← seule ligne signalée
  return;
}
decodeSharePayload(hash).then((decoded) => { … });
```
La branche `if (!hash)` duplique une garde déjà présente dans `decodeSharePayload` (`if (!encoded …) return null`). Correction : supprimer le `if (!hash) { … return; }` et appeler systématiquement `decodeSharePayload(hash).then(...)`. Les `setState` du `.then` ne sont pas signalés (asynchrones). Résultat pour un lien sans fragment : `payload = null`, `steps = []`, `ready = true` → **exactement le même écran « Lien invalide »**, décalé d'une micro-tâche (l'écran affiché avant `ready` est déjà vide : `if (!ready) return null`). Aucun impact hydratation : la lecture de `window.location.hash` reste dans l'effet de montage.

**E2 — `FocusFlowApp.tsx` → `eslint-disable` CIBLÉ + TODO.**
L'effet restaure l'état depuis `localStorage` au montage, puis pose `hydrated = true` qui débloque l'effet de persistance. Les contournements conformes à la règle sont tous risqués ici :
- initialiseur paresseux `useState(() => localStorage…)` : interdit, le composant est rendu côté serveur (`app/page.tsx` est un composant serveur qui rend ce composant client) → divergence d'hydratation garantie ;
- `useSyncExternalStore` : réécriture complète du couple restauration/persistance (5 états, drapeau `hydrated`, écriture `localStorage`), sans aucun test pour la couvrir.
Donc : `// eslint-disable-next-line react-hooks/set-state-in-effect` accompagné d'un commentaire `// TODO` (en anglais, cf. conventions) expliquant que la restauration doit rester post-montage pour éviter une divergence d'hydratation SSR, et citant `useSyncExternalStore` comme piste de refonte à couvrir par des tests.

**E3 — `FocusState.tsx` → `eslint-disable` CIBLÉ + TODO.**
```tsx
const [now, setNow] = useState<Date | null>(null);
useEffect(() => {
  setNow(new Date());                                  // ← ligne signalée
  const id = setInterval(() => setNow(new Date()), 30_000);
  return () => clearInterval(id);
}, []);
```
L'état initial `null` est délibéré : le serveur ne rend aucune heure, le client l'affiche après montage. Le `setNow` synchrone sert uniquement à ne pas attendre 30 s avant le premier affichage. Les alternatives : supprimer l'appel (l'heure n'apparaîtrait qu'au bout de 30 s → **changement de comportement observable**, refusé) ; retarder l'appel (`setTimeout(…, 0)`, `queueMicrotask`) → contournement cosmétique de la règle, refusé ; `useSyncExternalStore` avec horloge mise en cache au niveau module et `getServerSnapshot` renvoyant `null` → conforme, mais c'est une réécriture non testée d'un composant sensible à l'hydratation.
Donc : `eslint-disable-next-line` + `// TODO` justifiant que l'heure doit rester rendue côté client uniquement (parité SSR) et citant `useSyncExternalStore` comme piste.

## Critères d'acceptation

```gherkin
# language: fr

Scénario: 1 — Lint vert
  Étant donné le dépôt à la racine, dépendances installées via "npm ci"
  Quand j'exécute "npm run lint"
  Alors la commande se termine avec le code de sortie 0
  Et la sortie ne contient aucune ligne "error" ni "warning"

Scénario: 2 — Build toujours vert
  Étant donné le dépôt avec les corrections de cette story
  Quand j'exécute "npm run build"
  Alors la commande se termine avec le code de sortie 0

Scénario: 3 — Les trois liens vers "/" utilisent next/link
  Étant donné le fichier app/partage/ShareView.tsx
  Quand je recherche 'href="/"' dans le fichier
  Alors il n'existe plus aucune balise <a href="/">
  Et il existe exactement 3 éléments <Link href="/"> importés depuis "next/link"
  Et chacun conserve à l'identique le texte et la valeur de className du <a> qu'il remplace
  Et le lien mailto de signalement reste une balise <a> inchangée

Scénario: 4 — Navigation depuis la page de partage (vérification manuelle)
  Étant donné la page /partage ouverte avec un lien de partage valide
  Quand je clique sur "FocusFlow" en haut, puis (depuis un lien invalide) sur "Ouvrir FocusFlow", puis sur "Décomposer ta propre tâche →"
  Alors chacun de ces 3 liens m'amène sur la page d'accueil "/"
  Et la page d'accueil affiche l'état précédemment enregistré en localStorage (tâche, humeur, étapes, cases cochées, pensées)
  Et la console du navigateur ne contient aucune erreur, notamment aucune erreur d'hydratation

Scénario: 5 — Tiroir de capture : comportement inchangé (vérification manuelle)
  Étant donné l'accueil "/" avec au moins 2 pensées capturées
  Quand j'ouvre le tiroir via le bouton compteur, puis le ferme via ✕, puis le rouvre, puis appuie sur Échap
  Alors le tiroir s'ouvre et se ferme comme avant la modification
  Et quand je clique "→ découper" sur la dernière pensée restante, le tiroir se ferme et la tâche part en découpage
  Et quand je capture ensuite une nouvelle pensée, le tiroir reste fermé et le bouton compteur réapparaît avec la valeur 1

Scénario: 6 — Page de partage, lien valide (vérification manuelle)
  Étant donné une URL /partage#<fragment valide> produite par le panneau de partage
  Quand j'ouvre cette URL
  Alors le message, la tâche et les micro-étapes s'affichent comme avant la modification
  Et cocher, éditer et supprimer une étape fonctionne à l'identique

Scénario: 7 — Page de partage, cas d'erreur et cas limite (vérification manuelle)
  Étant donné l'URL "/partage" sans fragment (cas limite) puis "/partage#nimporte-quoi" (cas d'erreur)
  Quand j'ouvre chacune de ces URL
  Alors les deux affichent l'écran "Lien invalide" avec le lien "Ouvrir FocusFlow"
  Et aucun écran intermédiaire autre qu'un écran vide n'apparaît avant

Scénario: 8 — Horloge de l'en-tête inchangée (vérification manuelle)
  Étant donné l'accueil "/" chargé
  Quand la page finit de s'hydrater
  Alors la pastille d'heure apparaît immédiatement (pas après 30 s) au format HH:MM
  Et la console ne contient aucune erreur d'hydratation

Scénario: 9 — Les eslint-disable sont ciblés et justifiés
  Étant donné le diff de la story
  Quand j'inspecte chaque occurrence de "eslint-disable" ajoutée
  Alors elles se trouvent uniquement dans app/_components/FocusFlowApp.tsx et app/_components/FocusState.tsx
  Et chacune nomme explicitement la règle "react-hooks/set-state-in-effect"
  Et chacune est accompagnée d'un commentaire commençant par "TODO" qui explique la raison (hydratation SSR) et la piste de refonte
  Et aucune désactivation ne porte sur un fichier entier (pas de "/* eslint-disable */" en tête de fichier)

Scénario: 10 — Périmètre respecté
  Étant donné le diff de la story
  Quand j'exécute "git diff --stat" par rapport à la base de la branche
  Alors seuls ces fichiers apparaissent dans le diff : app/_components/CaptureDock.tsx, app/_components/FocusFlowApp.tsx, app/_components/FocusState.tsx, app/partage/ShareView.tsx, et specs/US-001-lint-zero-erreur.md (la spec elle-même, ajoutée par la branche)
  Et eslint.config.mjs, package.json et package-lock.json sont inchangés
  Et aucune dépendance n'est ajoutée, supprimée ou mise à jour
```

## Hors périmètre
- Introduire un framework de test (Vitest, Jest, Playwright…) et un script `test` : sujet réel, traité par la story suivante (installation de Vitest, cf. décision 1).
- Refondre la persistance `localStorage` de `FocusFlowApp` ou l'horloge de `FocusState` avec `useSyncExternalStore` : laissé en TODO dans le code.
- Modifier, assouplir ou ajouter une règle ESLint ; ajouter un `eslint-disable` sur des fichiers non listés.
- Corriger d'autres écarts règles/code (issues `ecart-regle`), retoucher le design, les textes, l'accessibilité ou la route API.
- Ajouter des liens `<Link>` ailleurs dans l'application (aucun autre `<a href>` interne n'est signalé aujourd'hui).
- Toute modification de la CI (`.github/workflows/`).

## Contrats techniques
Aucun changement d'API, de modèle de données ni de format d'URL de partage. Contrats à préserver exactement :
- **Fragment de partage** : `/partage#<base64url(deflate-raw(JSON))>` — la lecture reste `window.location.hash.slice(1)` dans un effet de montage, jamais pendant le rendu (contrainte SSR).
- **Clé localStorage** `focusflow_v1` et forme de l'objet `{ task, mood, steps, checked, thoughts }` : inchangées, y compris l'ordre restauration → `hydrated = true` → persistance.
- **Cible de navigation** : les 3 liens gardent `href="/"`. Seul le mode de navigation change (client-side + préchargement Next), conformément à la règle `@next/next/no-html-link-for-pages`.
- **Contrat visuel** : `className`, texte et position des 3 liens strictement identiques ; `<Link>` de Next 16 rend lui-même le `<a>` (pas de `<a>` enfant, pas de `legacyBehavior`).

## Plan de tâches
- [ ] **T1 — Remplacer les 3 `<a href="/">` par `<Link>` dans `ShareView.tsx`** : ajouter `import Link from "next/link";`, convertir les 3 occurrences en reportant `className` et le contenu à l'identique, laisser le `<a href={reportHref}>` (mailto) intact. Relancer `npm run lint` : les erreurs E5/E6/E7 disparaissent. (critères : 1, 3, 10)
- [ ] **T2 — Supprimer la branche `if (!hash)` dans l'effet de `ShareView.tsx`** (E4) : appel systématique de `decodeSharePayload(hash)`. Vérifier lien valide / sans fragment / fragment corrompu. (critères : 1, 6, 7)
- [ ] **T3 — `CaptureDock.tsx` : passer à l'état dérivé** (E1). **Avant de supprimer l'effet**, établir la liste exhaustive des écritures sur `thoughts` et sur `open` :
  ```bash
  grep -n "setOpen\|open\b" app/_components/CaptureDock.tsx
  grep -n "setThoughts\|thoughts" app/_components/CaptureDock.tsx app/_components/FocusFlowApp.tsx
  ```
  Pour chaque chemin qui vide la liste (ou la réduit à zéro), confirmer qu'il ferme aussi le tiroir, directement ou par l'état dérivé. **Si un seul chemin laisse le tiroir ouvert avec une liste vide, ne pas supprimer l'effet : replier sur un `eslint-disable` ciblé + TODO** (même traitement que T4) et le signaler dans la PR. Sinon : supprimer l'effet « close drawer when thoughts become empty », introduire `isOpen = open && thoughts.length > 0` et remplacer toutes les lectures de `open` dans le JSX. Vérifier le parcours ouvrir/fermer/Échap/découper. (critères : 1, 5, 10)
- [ ] **T4 — `FocusFlowApp.tsx` et `FocusState.tsx` : `eslint-disable` ciblés + TODO** (E2, E3) : poser d'abord un `// eslint-disable-next-line react-hooks/set-state-in-effect` sur la ligne signalée, relancer `npm run lint` ; si la règle se déplace sur une ligne suivante du même effet, encadrer le corps de l'effet par une paire `/* eslint-disable react-hooks/set-state-in-effect */ … /* eslint-enable react-hooks/set-state-in-effect */` (jamais en tête de fichier), avec un seul commentaire TODO en anglais justifiant la contrainte d'hydratation. (critères : 1, 8, 9)
- [ ] **T5 — Vérification finale et journal** : `npm run lint` puis `npm run build` verts ; dérouler la liste de vérification manuelle (scénarios 4 à 8) sur `npm run dev` ; `git diff --stat` limité aux 4 fichiers ; consigner dans la description de PR le résultat des deux commandes et la liste des points vérifiés à la main, ainsi que la raison de chaque `eslint-disable`. Si le scénario 5 révèle une réouverture indésirable du tiroir, basculer T3 sur un `eslint-disable` ciblé + TODO et le signaler dans la PR. (critères : 1, 2, 4, 5, 6, 7, 8, 9, 10)

## Tests attendus
Le dépôt n'a **ni script `test` ni framework de test** ; en ajouter un est hors périmètre. La définition de « fini » du projet (« chaque critère d'acceptation est couvert par un test ») ne peut donc pas être satisfaite telle quelle. Vérification de remplacement, assumée explicitement et à valider par l'humain :
- **Automatisé (bloquant, exécuté par la CI)** : `npm run lint` code de sortie 0 et sortie sans « error »/« warning » (critère 1) ; `npm run build` code de sortie 0 (critère 2).
- **Automatisable sans dépendance (à exécuter et à coller dans la PR)** :
  - `grep -n 'href="/"' app/partage/ShareView.tsx` → uniquement des `<Link>` ; `grep -c '<a' app/partage/ShareView.tsx` → 1 (le mailto) — critère 3 ;
  - `grep -rn "eslint-disable" app/` → au plus 2 emplacements, tous deux avec le nom de la règle — critère 9 ;
  - `git diff --stat` → 4 fichiers, tous sous `app/` — critère 10.
- **Manuel (liste de vérification à cocher dans la PR)** : critères 4, 5, 6, 7, 8, sur `npm run dev`, plus une vérification du parcours de partage sur une URL de preview Vercel en HTTPS si un test iOS est jugé nécessaire (règle projet : jamais sur localhost HTTP).
- **Non-régression future** : ces critères deviendront des tests automatisés dans la story suivante, qui installe Vitest (cf. décision 1).

## Parcours de simulation (phase 3)
- **Persona : Sarah, développeuse du projet** — Objectif : ouvrir une PR et obtenir une CI verte. Succès si : l'étape « Lint » du workflow `ci.yml` passe au vert sur la PR, sans modification de la configuration ESLint ni de la CI.
- **Persona : Leïla, destinataire d'un coup de pouce** — Objectif : ouvrir le lien reçu, cocher deux étapes, puis créer sa propre tâche. Succès si : les étapes s'affichent et se cochent comme avant, le clic sur « Décomposer ta propre tâche → » ouvre l'accueil sans page blanche ni erreur console, et le champ de capture y est utilisable immédiatement.
- **Persona : Marc, utilisateur revenant après une pause** — Objectif : retrouver sa tâche et ses pensées après rechargement, capturer une pensée, la découper. Succès si : l'état est restauré à l'identique, l'heure s'affiche dès l'hydratation, le tiroir de pensées s'ouvre/ferme normalement et reste fermé après un « découper » qui vide la liste.

## Décisions
1. **Définition de « fini » vs absence de tests** : « un test par critère d'acceptation » est remplacé, **pour cette story uniquement**, par « lint + build verts + liste de vérification manuelle cochée dans la PR ». La story suivante installe Vitest et rétablit la règle générale.
2. **Dette des 2 `eslint-disable`** : suivie par l'issue de dette `#4` (refonte `useSyncExternalStore` de `FocusFlowApp` et `FocusState`), référencée dans les TODO du code.
3. **Format de TODO** : `// TODO(#4): …`, commentaire en anglais, avec le numéro de l'issue de dette.
4. **Préchargement `<Link>`** : accepté. Aucun `prefetch` explicite sur les 3 liens.
5. **Branche de travail** : base `main` ; la branche est créée par `/factory:implement`.
6. **Écart règles/code** : aucune issue `ecart-regle` à fermer avec cette story.

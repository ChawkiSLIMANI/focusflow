---
id: US-70
titre: Prévenir avant l'envoi quand la tâche fait moins de 3 caractères
statut: approved        # draft | approved (l'humain seul valide)
validation: story Prête dans Notion — mode enchaîné
source: page Notion US-70 (base « User stories », Factory) — https://app.notion.com/p/418cab53040a8157bab3d269f5b7055d ; issue GitHub #8 (ecart-regle)
---

# US-70 — Prévenir avant l'envoi quand la tâche fait moins de 3 caractères

## Story
En tant que **personne qui décrit sa tâche**, je veux **être prévenue avant l'envoi si ma saisie fait moins de
3 caractères** afin de **ne pas attendre une réponse du serveur pour une erreur que l'interface peut détecter**.

## Contexte et ancrages (constats au 2026-11-14, `main` = `9f17b4b`)

- Serveur : `app/api/breakdown/route.ts:6-8` `sanitizeInput` = `trim()` puis retrait des caractères de contrôle ;
  `route.ts:54-57` `validateInput` refuse `text.length < 3` avec `"Décris ta tâche en quelques mots."` (400).
  Déjà couvert par `tests/breakdownValidation.test.ts:41-60`.
- Front : `app/_components/FocusFlowApp.tsx`, `submitTask` ne fait que `if (!taskText.trim() || loading) return;`
  puis `fetch("/api/breakdown")` ; le bouton `CTA` reçoit `disabled={!task.trim()}`. Le bandeau d'erreur est rendu
  si `error` est non nul, ✕ appelle `setError(null)`, `submitTask` fait `setError(null)` avant l'appel.
- `submitTask` est appelé par le bouton, par ⌘/Ctrl + Entrée (`TaskInput.tsx:40-42`) et par la transformation d'une
  pensée du dock (`transformThought`) : la garde s'applique aux trois chemins.
- Tests : Vitest, environnement `node`, pas de DOM ni de bibliothèque de test React. `tests/appFooter.test.ts`
  rend `FocusFlowApp` avec `renderToStaticMarkup` et force des valeurs initiales de `useState` par `vi.mock("react")`.
  **Aucune nouvelle dépendance.**

## Conception

1. Nouveau module `app/_lib/breakdownRequest.ts` (exports nommés) :
   - `TASK_MIN_LENGTH = 3` et `TASK_TOO_SHORT_MESSAGE = "Décris ta tâche en quelques mots."` ;
   - `requestBreakdown(task: string, mood: string, fetchImpl: typeof fetch = fetch)` qui renvoie
     `{ kind: "ignored" }` (saisie vide ou espaces seuls : aucun appel), `{ kind: "error", message }` ou
     `{ kind: "steps", steps }`. Si `task.trim().length < TASK_MIN_LENGTH` (et non vide) : `{ kind: "error",
     message: TASK_TOO_SHORT_MESSAGE }` **sans appeler `fetchImpl`**. Sinon il reprend **à l'identique** le
     traitement actuel de `submitTask` : `POST /api/breakdown`, en-tête JSON, corps `{ task, mood }` avec la tâche
     telle que saisie (non retaillée), `data.error ?? "Une erreur est survenue."` si `!res.ok || data.error`,
     `"Impossible de contacter le serveur. Vérifie ta connexion."` si l'appel ou le JSON lève.
2. `FocusFlowApp.tsx` : `submitTask` garde `if (loading) return;`, appelle `requestBreakdown` et applique le
   résultat. Pour `ignored` : rien (pas de `setTask`, pas de chargement, pas de message). Pour une erreur de
   longueur détectée avant l'envoi : `setTask(taskText)` et `setError(message)`, sans passer par l'état de chargement
   ni vider les étapes. Le bouton garde `disabled={!task.trim()}` (cliquable dès 1 caractère non blanc).
   Ni le texte du message, ni le bandeau, ni le bouton ne changent d'apparence.
3. `route.ts` n'est pas modifié (troisième couche indépendante ; le message est volontairement dupliqué et un test
   vérifie que les deux textes sont identiques).

## Critères d'acceptation

```gherkin
# language: fr
Scénario: 1 — Saisie de 1 ou 2 caractères après trim : aucun appel réseau
  Étant donné une saisie « ab », «  a  », « a » ou « \tab\n »
  Quand requestBreakdown est appelé avec un fetch espion
  Alors le fetch espion n'est jamais appelé
  Et le résultat est { kind: "error", message: "Décris ta tâche en quelques mots." }

Scénario: 2 — Message identique au serveur, affiché dans le bandeau
  Étant donné TASK_TOO_SHORT_MESSAGE
  Quand on poste « ab » à la route POST /api/breakdown (double du SDK)
  Alors la réponse 400 porte exactement le même texte que TASK_TOO_SHORT_MESSAGE
  Et un rendu de FocusFlowApp avec cette erreur dans l'état affiche le bandeau avec ce texte et le bouton ✕ (aria-label « fermer »)

Scénario: 3 — Cas limite : exactement 3 caractères après trim
  Étant donné une saisie « abc » ou «  abc  »
  Quand requestBreakdown est appelé avec un fetch espion qui répond 200 { steps }
  Alors le fetch espion est appelé une fois avec "/api/breakdown", méthode POST, corps { task: <saisie telle quelle>, mood }
  Et le résultat est { kind: "steps", steps }

Scénario: 4 — Saisie vide ou uniquement d'espaces : comportement inchangé
  Étant donné une saisie « » ou «    »
  Quand requestBreakdown est appelé avec un fetch espion
  Alors le fetch espion n'est pas appelé et le résultat est { kind: "ignored" }
  Et le rendu initial de FocusFlowApp (tâche vide) a le bouton d'envoi désactivé et aucun bandeau d'erreur

Scénario: 5 — Contrôle serveur inchangé
  Quand on poste directement « ab » puis «  a  » à POST /api/breakdown
  Alors la réponse est 400 { error: "Décris ta tâche en quelques mots." } et le SDK n'est pas appelé
  Et `git diff main -- app/api/breakdown/route.ts` est vide

Scénario: 6 — Écart #8 soldé dans les tests
  Alors `grep -c '#8' tests/ecartsConnus.test.ts` renvoie 0
  Et les autres it.todo (#7, #9, #10, #11, #13) sont toujours présents

Scénario: 7 — Caractérisation du traitement déplacé (non-régression)
  Étant donné une saisie valide
  Quand le fetch espion répond 400 { error: "X" }, puis 200 { error: "Y" }, puis 500 sans champ error, puis lève
  Alors le résultat est respectivement l'erreur "X", "Y", "Une erreur est survenue.", "Impossible de contacter le serveur. Vérifie ta connexion."
```

## Règles critiques (sabotage)
- R1 — la garde de longueur précède l'appel réseau : la supprimer, ou passer le seuil à 2 ou à 4, doit faire échouer
  un test (scénarios 1 et 3).
- R2 — la saisie vide reste ignorée sans message (scénario 4).
- R3 — le texte du message front est identique à celui du serveur (scénario 2).

## Périmètre

```scope
app/_lib/breakdownRequest.ts
app/_components/FocusFlowApp.tsx
tests/breakdownRequest.test.ts
tests/focusFlowAppShortTask.test.ts
tests/ecartsConnus.test.ts
specs/US-70-tache-trop-courte-front.md
```

Hors périmètre : `app/api/breakdown/route.ts`, `CTA.tsx`, `TaskInput.tsx`, le maximum de 500 caractères et son
compteur, les autres écarts (#7, #9, #10, #11, #13), toute nouvelle dépendance.

## Plan de tâches
- [ ] T0 — tests de caractérisation du traitement actuel (scénario 7) écrits contre `requestBreakdown` qui reprend
      le code existant à l'identique, avant toute garde (critères : 7)
- [ ] T1 — garde de longueur et message dans `requestBreakdown` (critères : 1, 3, 4)
- [ ] T2 — branchement dans `FocusFlowApp.submitTask` et tests de rendu (critères : 2, 4)
- [ ] T3 — test de parité du message et contrôle serveur (critères : 2, 5)
- [ ] T4 — retrait du `it.todo` #8 (critère : 6) ; sabotage R1-R3

## Questions ouvertes
Aucune.

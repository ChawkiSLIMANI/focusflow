"use client";

import { useState, useEffect } from "react";
import Brand from "./Brand";
import FocusState from "./FocusState";
import Hero from "./Hero";
import TaskInput from "./TaskInput";
import CTA from "./CTA";
import QuickPrompts from "./QuickPrompts";
import Thinking from "./Thinking";
import TaskRecap from "./TaskRecap";
import StepList from "./StepList";
import ProgressStrip from "./ProgressStrip";
import CaptureDock from "./CaptureDock";
import SharePanel from "./SharePanel";

export type MicroStep = {
  t: string;
  m: string;
  soft?: boolean;
};

export type Thought = {
  id: number;
  text: string;
  time: string;
  kind: string | null;
};

export type AppState = "empty" | "loading" | "results";

const LS_KEY = "focusflow_v1";

function loadPersistedState() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as {
      task: string;
      mood: string;
      steps: MicroStep[];
      checked: Record<number, boolean>;
      thoughts: Thought[];
    };
  } catch {
    return null;
  }
}

function categorizeThought(text: string): string | null {
  const lower = text.toLowerCase();
  if (/\b(idée|peut-être|si on|et si)\b/.test(lower)) return "idée";
  if (/\b(faire|appeler|envoyer|acheter|rappel|noter)\b/.test(lower)) return "todo";
  if (lower.length < 40) return "note";
  return null;
}

export default function FocusFlowApp() {
  const [task, setTask] = useState("");
  const [mood, setMood] = useState("mid");
  const [loading, setLoading] = useState(false);
  const [steps, setSteps] = useState<MicroStep[]>([]);
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  const [thoughts, setThoughts] = useState<Thought[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // Restore persisted state on mount
  // TODO(#4): restoring from localStorage must stay post-mount — this client
  // component is rendered on the server, so reading localStorage during render
  // (lazy useState initializer) would cause an SSR hydration mismatch. Moving
  // this restore/persist pair to useSyncExternalStore is the planned refactor,
  // to be done once tests cover it.
  useEffect(() => {
    const saved = loadPersistedState();
    if (saved) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (saved.task) setTask(saved.task);
      if (saved.mood) setMood(saved.mood);
      if (Array.isArray(saved.steps)) setSteps(saved.steps);
      if (saved.checked) setChecked(saved.checked);
      if (Array.isArray(saved.thoughts)) setThoughts(saved.thoughts);
    }
    setHydrated(true);
  }, []);

  // Persist state to localStorage whenever it changes (after hydration)
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({ task, mood, steps, checked, thoughts }));
    } catch {
      // quota exceeded or private mode — silently ignore
    }
  }, [hydrated, task, mood, steps, checked, thoughts]);

  const appState: AppState =
    loading ? "loading" : steps.length > 0 ? "results" : "empty";

  const doneCount = Object.values(checked).filter(Boolean).length;

  async function submitTask(taskText: string) {
    if (!taskText.trim() || loading) return;
    setTask(taskText);
    setLoading(true);
    setSteps([]);
    setChecked({});
    setError(null);
    try {
      const res = await fetch("/api/breakdown", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task: taskText, mood }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error ?? "Une erreur est survenue.");
      } else {
        setSteps(data.steps);
      }
    } catch {
      setError("Impossible de contacter le serveur. Vérifie ta connexion.");
    } finally {
      setLoading(false);
    }
  }

  async function submit() {
    await submitTask(task);
  }

  function transformThought(thought: Thought) {
    setThoughts((prev) => prev.filter((t) => t.id !== thought.id));
    submitTask(thought.text);
  }

  function addThought(text: string) {
    const time = new Date().toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    });
    const kind = categorizeThought(text);
    setThoughts((prev) =>
      [{ id: Date.now(), text, time, kind }, ...prev].slice(0, 50)
    );
  }

  function resplit(index: number) {
    setSteps((prev) => {
      const next = [...prev];
      const orig = next[index];
      const half = Math.max(2, Math.round(parseInt(orig.m) / 2));
      next.splice(
        index,
        1,
        { t: `${orig.t} — partie 1 : la commencer`, m: `${half} min` },
        { t: `${orig.t} — partie 2 : la finir`, m: `${half} min` }
      );
      return next;
    });
  }

  function reset() {
    setSteps([]);
    setChecked({});
    setTask("");
    setError(null);
  }

  return (
    <>
      <div className="relative z-10 max-w-[880px] mx-auto px-8 pt-7 pb-[180px] max-[720px]:px-[18px] max-[720px]:pb-[200px]">
        {/* Topbar */}
        <div className="flex items-center justify-between pb-8">
          <Brand />
          <FocusState count={thoughts.length} />
        </div>

        {/* Hero */}
        <Hero state={appState} />

        {/* Empty / loading state */}
        {appState !== "results" && (
          <>
            <TaskInput
              value={task}
              onChange={setTask}
              onSubmit={submit}
              mood={mood}
              setMood={setMood}
            />
            <div className="mt-[18px] flex items-center gap-[14px] flex-wrap">
              <CTA onClick={submit} disabled={!task.trim()} loading={loading} />
              <span className="font-serif italic text-ink-faint text-base max-[720px]:hidden">
                ou{" "}
                <span className="border-b border-dotted border-current">
                  ⌘ + Entrée
                </span>
              </span>
            </div>
            {error && (
              <div className="mt-4 flex items-start gap-3 bg-[#FFF0EB] border border-[rgba(255,90,31,.3)] rounded-[14px] px-4 py-3">
                <span className="text-accent text-[18px] leading-none shrink-0 mt-0.5">!</span>
                <p className="font-sans text-[14px] leading-normal text-ink flex-1">{error}</p>
                <button
                  type="button"
                  onClick={() => setError(null)}
                  className="font-mono text-[10px] text-ink-faint hover:text-ink transition-colors duration-100 cursor-default shrink-0"
                  aria-label="fermer"
                >
                  ✕
                </button>
              </div>
            )}
            {loading && <Thinking />}
            {!loading && !task && <QuickPrompts onPick={setTask} />}
          </>
        )}

        {/* Results state */}
        {appState === "results" && (
          <>
            <TaskRecap task={task} onReset={reset} />
            <StepList
              steps={steps}
              checked={checked}
              onToggle={(i) =>
                setChecked((prev) => ({ ...prev, [i]: !prev[i] }))
              }
              onResplit={resplit}
            />
            <ProgressStrip done={doneCount} total={steps.length} />
            <SharePanel task={task} steps={steps} />
          </>
        )}
      </div>

      <CaptureDock thoughts={thoughts} onAdd={addThought} onTransform={transformThought} />
    </>
  );
}

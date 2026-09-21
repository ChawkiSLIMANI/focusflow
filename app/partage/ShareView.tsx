"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { decodeSharePayload } from "../_lib/sharePayload";
import ProgressStrip from "../_components/ProgressStrip";

interface SharedStep {
  t: string;
  m: string;
  soft?: boolean;
}

interface Payload {
  task: string;
  steps: SharedStep[];
  message: string;
}

export default function ShareView() {
  const [ready, setReady] = useState(false);
  const [payload, setPayload] = useState<Payload | null>(null);
  const [steps, setSteps] = useState<SharedStep[]>([]);
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");
  const [reported, setReported] = useState(false);

  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (!hash) {
      setReady(true);
      return;
    }
    decodeSharePayload(hash).then((decoded) => {
      setPayload(decoded);
      setSteps(decoded?.steps ?? []);
      setReady(true);
    });
  }, []);

  if (!ready) return null;

  if (!payload) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-soft mb-4">
          FocusFlow
        </p>
        <h1 className="font-serif text-[32px] text-ink mb-3">Lien invalide</h1>
        <p className="font-sans text-[15px] text-ink-soft max-w-xs">
          Ce lien est malformé ou a été modifié. Demande à l&apos;expéditeur de
          t&apos;en envoyer un nouveau.
        </p>
        <Link
          href="/"
          className="mt-8 font-sans text-[14px] font-medium text-accent border-b border-accent pb-0.5"
        >
          Ouvrir FocusFlow
        </Link>
      </div>
    );
  }

  const doneCount = Object.values(checked).filter(Boolean).length;

  function toggleCheck(i: number) {
    setChecked((prev) => ({ ...prev, [i]: !prev[i] }));
  }

  function deleteStep(i: number) {
    setSteps((prev) => prev.filter((_, idx) => idx !== i));
    setChecked((prev) => {
      const next: Record<number, boolean> = {};
      Object.entries(prev).forEach(([k, v]) => {
        const idx = Number(k);
        if (idx < i) next[idx] = v;
        else if (idx > i) next[idx - 1] = v;
      });
      return next;
    });
  }

  function startEdit(i: number) {
    setEditingIndex(i);
    setEditValue(steps[i].t);
  }

  function commitEdit(i: number) {
    const trimmed = editValue.trim().slice(0, 120);
    if (trimmed.length >= 1) {
      setSteps((prev) =>
        prev.map((s, idx) => (idx === i ? { ...s, t: trimmed } : s))
      );
    }
    setEditingIndex(null);
  }

  const reportHref = `mailto:slimani.hocinechawki@gmail.com?subject=${encodeURIComponent(
    "Signalement FocusFlow"
  )}&body=${encodeURIComponent(
    `Bonjour,\n\nJe souhaite signaler le contenu de ce lien FocusFlow :\n${typeof window !== "undefined" ? window.location.href : ""}\n\nMerci.`
  )}`;

  return (
    <div className="relative z-10 max-w-[640px] mx-auto px-6 pt-8 pb-24 max-[720px]:px-4 max-[720px]:pt-6">
      <Link
        href="/"
        className="block font-mono text-[11px] uppercase tracking-[0.18em] text-ink-faint mb-8 hover:text-ink-soft transition-colors duration-100"
      >
        FocusFlow
      </Link>

      <p className="font-sans text-[13px] text-ink-soft mb-6">
        Quelqu&apos;un t&apos;a envoyé un coup de pouce via FocusFlow
      </p>

      {payload.message && (
        <div
          className="rounded-[16px] px-5 py-4 mb-6 border"
          style={{
            background: "rgba(255, 226, 210, 0.45)",
            borderColor: "rgba(255, 90, 31, 0.18)",
          }}
        >
          <p className="font-serif italic text-[20px] leading-[1.45] text-ink">
            {payload.message}
          </p>
        </div>
      )}

      <div className="bg-paper-card border border-rule rounded-[22px] px-[22px] py-4 shadow-soft mb-6">
        <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-soft mb-1.5">
          la tâche
        </div>
        <div className="font-serif text-[22px] leading-[1.3] text-ink">
          {payload.task}
        </div>
      </div>

      {steps.length > 0 && (
        <div>
          <div className="flex items-baseline justify-between mb-[18px]">
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-soft">
              — micro-étapes
            </span>
            <span className="font-mono text-[11px] text-ink-soft">
              <span className="text-accent font-semibold">{steps.length}</span>
              {" "}étapes
            </span>
          </div>

          <div className="flex flex-col gap-2">
            {steps.map((s, i) => (
              <div
                key={i}
                className="grid items-center bg-paper-card border border-rule rounded-[16px] px-[18px] py-4 pl-[14px] hover:bg-white hover:border-[#C7BFA9] transition-colors duration-100 animate-step-in max-[720px]:pl-[10px] max-[720px]:py-[14px] max-[720px]:px-[14px]"
                style={{
                  gridTemplateColumns: "44px 1fr auto auto",
                  gap: 14,
                  animationDelay: `${i * 70}ms`,
                }}
              >
                <div
                  className={`w-10 h-10 grid place-items-center border-r border-rule font-serif italic text-[28px] leading-none transition-colors duration-150 max-[720px]:w-9 max-[720px]:h-9 max-[720px]:text-[22px] ${
                    checked[i] ? "text-ink-faint" : "text-ink-soft"
                  }`}
                >
                  {String(i + 1).padStart(2, "0")}
                </div>

                <div className="min-w-0">
                  {editingIndex === i ? (
                    <input
                      autoFocus
                      maxLength={120}
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={() => commitEdit(i)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") commitEdit(i);
                        if (e.key === "Escape") setEditingIndex(null);
                      }}
                      className="w-full bg-transparent font-sans font-medium text-[17px] leading-[1.35] text-ink focus:outline-none border-b border-ink-soft max-[720px]:text-[15px]"
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => startEdit(i)}
                      className={`text-left w-full font-sans font-medium text-[17px] leading-[1.35] transition-colors duration-150 max-[720px]:text-[15px] cursor-text ${
                        checked[i]
                          ? "text-ink-faint line-through decoration-accent decoration-[1.5px]"
                          : "text-ink"
                      }`}
                    >
                      {s.t}
                    </button>
                  )}
                  <div className="flex items-center gap-[10px] mt-1 font-mono text-[11px] text-ink-soft">
                    <span className="text-accent">◷</span>
                    <span>{s.m}</span>
                    {s.soft && (
                      <span className="font-serif italic text-ink-faint">respire</span>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => deleteStep(i)}
                  aria-label="supprimer cette étape"
                  className="w-6 h-6 grid place-items-center text-ink-faint hover:text-accent transition-colors duration-100 cursor-default shrink-0"
                >
                  <span style={{ display: "block", width: 10, height: 10, position: "relative" }}>
                    <span style={{ position: "absolute", inset: 0, display: "block", width: 10, height: 1.5, background: "currentColor", top: "50%", transform: "translateY(-50%) rotate(45deg)" }} />
                    <span style={{ position: "absolute", inset: 0, display: "block", width: 10, height: 1.5, background: "currentColor", top: "50%", transform: "translateY(-50%) rotate(-45deg)" }} />
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => toggleCheck(i)}
                  aria-label={checked[i] ? "marquer non-terminé" : "terminer"}
                  className={`w-7 h-7 rounded-full border-[1.5px] flex items-center justify-center transition-all duration-150 shrink-0 cursor-default ${
                    checked[i] ? "bg-accent border-accent" : "border-rule hover:border-ink-soft"
                  }`}
                >
                  {checked[i] && (
                    <span style={{ display: "block", width: 5, height: 9, borderRight: "2px solid white", borderBottom: "2px solid white", transform: "rotate(45deg) translate(-1px, -1px)" }} />
                  )}
                </button>
              </div>
            ))}
          </div>

          <ProgressStrip done={doneCount} total={steps.length} />
        </div>
      )}

      {steps.length === 0 && (
        <p className="font-serif italic text-[18px] text-ink-soft text-center mt-8">
          Toutes les étapes ont été supprimées.
        </p>
      )}

      <div className="mt-12 flex flex-col items-center gap-3">
        <p className="font-mono text-[11px] text-ink-faint">Ce lien n&apos;expire pas.</p>
        <Link
          href="/"
          className="font-sans text-[13px] text-ink-soft border border-dashed border-rule rounded-full px-4 py-2 hover:border-ink-soft hover:text-ink transition-colors duration-100"
        >
          Décomposer ta propre tâche →
        </Link>
        <div className="mt-4">
          {reported ? (
            <p className="font-mono text-[11px] text-ink-faint">Signalement envoyé, merci.</p>
          ) : (
            <a
              href={reportHref}
              onClick={() => setReported(true)}
              className="font-mono text-[11px] text-ink-faint hover:text-ink-soft transition-colors duration-100"
            >
              Signaler ce contenu
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

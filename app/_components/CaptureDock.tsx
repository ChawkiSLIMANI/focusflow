"use client";

import { useState, useRef, useEffect } from "react";
import type { Thought } from "./FocusFlowApp";

interface Props {
  thoughts: Thought[];
  onAdd: (text: string) => void;
  onTransform: (thought: Thought) => void;
}

export default function CaptureDock({ thoughts, onAdd, onTransform }: Props) {
  const [val, setVal] = useState("");
  const [open, setOpen] = useState(false);
  const sendRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close drawer on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // Derived state: the drawer is never visible while the list is empty.
  const isOpen = open && thoughts.length > 0;

  function fireConfetti() {
    if (!sendRef.current) return;
    const r = sendRef.current.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    for (let i = 0; i < 10; i++) {
      const dot = document.createElement("div");
      dot.className = "confetti-dot";
      const angle = (Math.PI * 2 * i) / 10 + Math.random() * 0.4;
      const rad = 30 + Math.random() * 36;
      dot.style.setProperty("--tx", `${Math.cos(angle) * rad}px`);
      dot.style.setProperty("--ty", `${Math.sin(angle) * rad - 20}px`);
      dot.style.left = `${cx}px`;
      dot.style.top = `${cy}px`;
      document.body.appendChild(dot);
      setTimeout(() => dot.remove(), 1000);
    }
  }

  function submit() {
    const trimmed = val.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setVal("");
    fireConfetti();
  }

  function handleTransform(thought: Thought) {
    setOpen(false);
    onTransform(thought);
  }

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none px-8 pb-5 max-[720px]:px-[14px] max-[720px]:pb-[14px]"
      style={{
        paddingTop: 60,
        background: "linear-gradient(180deg, transparent 0%, #F2EDE3 40%)",
      }}
    >
      <div className="max-w-[880px] mx-auto pointer-events-auto">

        {/* Thoughts drawer panel */}
        <div
          ref={panelRef}
          className="overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
          style={{
            maxHeight: isOpen ? 320 : 0,
            opacity: isOpen ? 1 : 0,
            marginBottom: isOpen ? 8 : 0,
          }}
        >
          <div className="bg-paper-card border border-rule rounded-[18px] overflow-hidden shadow-soft">
            {/* Panel header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-rule">
              <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-soft">
                {thoughts.length} pensée{thoughts.length > 1 ? "s" : ""} capturée{thoughts.length > 1 ? "s" : ""}
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="font-mono text-[10px] text-ink-faint hover:text-ink transition-colors duration-100 cursor-default"
                aria-label="fermer"
              >
                ✕
              </button>
            </div>

            {/* Thoughts list */}
            <div className="max-h-[240px] overflow-y-auto">
              {thoughts.map((th) => (
                <div
                  key={th.id}
                  className="flex items-start gap-3 px-4 py-3 border-b border-rule last:border-0 hover:bg-paper transition-colors duration-100 group"
                >
                  <span className="font-mono text-[10px] uppercase tracking-[0.06em] text-ink-faint shrink-0 pt-0.5">
                    {th.time}
                  </span>
                  <span className="font-sans text-[14px] leading-[1.45] text-ink flex-1">
                    {th.text}
                  </span>
                  {th.kind && (
                    <span className="font-mono text-[10px] text-accent-deep bg-accent-soft px-[7px] py-0.5 rounded-[4px] shrink-0 self-start">
                      {th.kind}
                    </span>
                  )}
                  {/* Transform action */}
                  <button
                    type="button"
                    onClick={() => handleTransform(th)}
                    className="shrink-0 font-mono text-[10px] text-ink-faint border border-rule rounded-full px-2.5 py-1 hover:bg-ink hover:text-paper hover:border-ink active:scale-95 transition-all duration-100 cursor-default whitespace-nowrap"
                    aria-label="découper en micro-étapes"
                  >
                    → découper
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Capture bar */}
        <div className="flex items-center gap-[14px] bg-ink rounded-full shadow-dock pl-[22px] pr-[6px] py-[6px] focus-within:-translate-y-[3px] focus-within:shadow-dock-hover transition-all duration-150">
          {/* Capture tag */}
          <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-[rgba(242,237,227,.5)] border-r border-[rgba(242,237,227,.16)] pr-[14px] shrink-0 whitespace-nowrap max-[720px]:hidden">
            capture rapide
          </span>

          {/* Input */}
          <input
            type="text"
            value={val}
            onChange={(e) => setVal(e.target.value.slice(0, 200))}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                submit();
              }
            }}
            placeholder="Une pensée, une idée, une distraction…"
            className="flex-1 bg-transparent text-paper text-[16px] font-sans outline-none caret-accent placeholder:font-serif placeholder:italic placeholder:text-[18px] placeholder:text-[rgba(242,237,227,.4)]"
          />

          {/* Thoughts toggle — only when thoughts exist */}
          {thoughts.length > 0 && (
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-label={isOpen ? "fermer les pensées" : "voir les pensées capturées"}
              className={`shrink-0 flex items-center gap-1 font-mono text-[10px] rounded-full px-2.5 py-1.5 transition-all duration-150 cursor-default whitespace-nowrap ${
                isOpen
                  ? "bg-accent text-ink"
                  : "bg-[rgba(255,255,255,.12)] text-[rgba(242,237,227,.7)] hover:bg-[rgba(255,255,255,.2)]"
              }`}
            >
              <span>{isOpen ? "▼" : "▲"}</span>
              <span>{thoughts.length}</span>
            </button>
          )}

          {/* Enter hint */}
          <span className="font-mono text-[10px] text-[rgba(242,237,227,.45)] shrink-0 max-[720px]:hidden">
            ⏎
          </span>

          {/* Send button */}
          <button
            ref={sendRef}
            type="button"
            onClick={submit}
            aria-label="capturer"
            className="w-11 h-11 rounded-full bg-accent text-ink flex items-center justify-center text-[18px] font-light shrink-0 hover:scale-[1.07] hover:rotate-90 hover:bg-[#FF7A47] active:scale-[.95] transition-all duration-150"
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
}

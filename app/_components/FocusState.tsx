"use client";

import { useState, useEffect } from "react";

function Pill({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex items-center gap-1.5 font-mono text-[11px] text-ink-soft bg-[rgba(14,11,7,.04)] border border-rule rounded-full px-2.5 py-[6px] leading-none ${className}`}
    >
      {children}
    </div>
  );
}

export default function FocusState({ count }: { count: number }) {
  const [now, setNow] = useState<Date | null>(null);

  // TODO(#4): the clock must stay client-only — the server renders no time at
  // all (now === null), and this first synchronous setNow is what shows it
  // right after mount instead of 30s later. Reading the time during render
  // would cause an SSR hydration mismatch. Planned refactor: useSyncExternalStore
  // with a module-level cached date and a getServerSnapshot returning null,
  // to be done once tests cover it.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const time = now?.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="flex items-center gap-2">
      <Pill>
        <span className="w-1.5 h-1.5 rounded-full bg-ok shrink-0 animate-pulse-ok" />
        <span>focus actif</span>
      </Pill>

      {time && (
        <Pill className="max-[720px]:hidden">
          <span>{time}</span>
        </Pill>
      )}

      <Pill>
        <span className="text-ink font-semibold">{count}</span>
        <span className="max-[720px]:hidden"> pensées capturées</span>
      </Pill>
    </div>
  );
}

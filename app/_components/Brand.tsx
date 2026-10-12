export default function Brand({ versionLabel }: { versionLabel?: string | null }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-2.5 h-2.5 rounded-full bg-accent shrink-0 animate-breathe" />
      <span className="font-serif text-[22px] text-ink leading-none">
        Focus<span className="italic">Flow</span>
      </span>
      {versionLabel ? (
        <span className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-ink-soft border border-rule rounded-full px-[7px] py-[3px] leading-none">
          {versionLabel}
        </span>
      ) : null}
    </div>
  );
}

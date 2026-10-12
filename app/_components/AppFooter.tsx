import { getAppVersionLabel } from "../_lib/appVersion";

// Server component: reads package.json through appVersion, never shipped to the browser.
export default function AppFooter() {
  const label = getAppVersionLabel();
  if (label === null) return null;

  return (
    <footer className="py-8 text-center font-mono text-[11px] text-ink-faint">
      {label}
    </footer>
  );
}

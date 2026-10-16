interface ProgressBarProps {
  value: number;
  max: number;
}

export function ProgressBar({ value, max }: ProgressBarProps) {
  const safeMax = Math.max(1, max);
  const widthPct = Math.max(2, (value / safeMax) * 100);
  return <span className="sh" style={{ width: `${widthPct}%` }} />;
}

interface ProgressBarProps {
  value: number;
  max: number;
}

export function ProgressBar({ value, max }: ProgressBarProps) {
  const safeMax = Math.max(1, max);
  const widthPct = Math.max(2, Math.min(100, (value / safeMax) * 100));
  return (
    <div className="progress-track" aria-hidden="true">
      <div className="progress-fill" style={{ width: `${widthPct}%` }} />
    </div>
  );
}

interface DeltaBadgeProps {
  cur: number | null | undefined;
  prev: number | null | undefined;
  label: string;
}

export function DeltaBadge({ cur, prev, label }: DeltaBadgeProps) {
  if (prev == null || cur == null) return null;
  if (prev === 0) {
    if (cur === 0) return null;
    return (
      <span className="d up">
        신규 <small>{label}</small>
      </span>
    );
  }
  const p = ((cur - prev) / Math.abs(prev)) * 100;
  if (Math.abs(p) < 0.05) {
    return (
      <span className="d flat">
        ― <small>{label}</small>
      </span>
    );
  }
  return (
    <span className={`d ${p > 0 ? 'up' : 'down'}`}>
      {p > 0 ? '▲' : '▼'} {Math.abs(p).toFixed(1)}% <small>{label}</small>
    </span>
  );
}

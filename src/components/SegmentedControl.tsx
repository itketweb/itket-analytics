interface SegmentedControlProps<T extends string> {
  items: Array<[T, string]>;
  value: T;
  onChange: (next: T) => void;
  id?: string;
  className?: string;
  fullWidth?: boolean;
  size?: 'sm' | 'md';
  ariaLabel?: string;
}

export function SegmentedControl<T extends string>({
  items,
  value,
  onChange,
  id,
  className = '',
  fullWidth = false,
  size = 'sm',
  ariaLabel,
}: SegmentedControlProps<T>) {
  const classes = [
    'seg',
    fullWidth ? 'full' : '',
    size === 'md' ? 'seg-md' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <span className={classes} id={id} role="group" aria-label={ariaLabel}>
      {items.map(([k, label]) => (
        <button
          key={k}
          type="button"
          className={k === value ? 'on' : ''}
          aria-pressed={k === value}
          onClick={() => onChange(k)}
        >
          {label}
        </button>
      ))}
    </span>
  );
}


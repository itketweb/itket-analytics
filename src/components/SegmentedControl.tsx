interface SegmentedControlProps<T extends string> {
  items: Array<[T, string]>;
  value: T;
  onChange: (next: T) => void;
}

export function SegmentedControl<T extends string>({
  items,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  return (
    <span className="seg">
      {items.map(([k, label]) => (
        <button
          key={k}
          type="button"
          className={k === value ? 'on' : ''}
          onClick={() => onChange(k)}
        >
          {label}
        </button>
      ))}
    </span>
  );
}

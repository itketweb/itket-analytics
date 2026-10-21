import React, { useEffect, useId, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';

export interface DropdownOption<T extends string | number> {
  value: T;
  label: React.ReactNode;
  title?: string;
  disabled?: boolean;
}

interface DropdownProps<T extends string | number> {
  options: DropdownOption<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  className?: string;
  id?: string;
}

export function Dropdown<T extends string | number>({
  options,
  value,
  onChange,
  ariaLabel,
  className = '',
  id,
}: DropdownProps<T>): React.ReactElement {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const selectedIdx = options.findIndex((o) => o.value === value);
  const selected = options[selectedIdx];

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    listRef.current?.focus({ preventScroll: true });
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  useEffect(() => {
    if (!open || active < 0) return;
    listRef.current
      ?.querySelector<HTMLElement>(`[data-idx="${active}"]`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [open, active]);

  const openList = () => {
    setActive(selectedIdx);
    setOpen(true);
  };

  const close = () => {
    setOpen(false);
    triggerRef.current?.focus({ preventScroll: true });
  };

  const pick = (idx: number) => {
    const opt = options[idx];
    if (!opt || opt.disabled) return;
    close();
    if (opt.value !== value) onChange(opt.value);
  };

  const step = (from: number, dir: 1 | -1) => {
    for (let i = from + dir; i >= 0 && i < options.length; i += dir) {
      if (!options[i].disabled) return i;
    }
    return from;
  };

  const onListKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') setActive((a) => step(a, 1));
    else if (e.key === 'ArrowUp') setActive((a) => step(a, -1));
    else if (e.key === 'Home') setActive(step(-1, 1));
    else if (e.key === 'End') setActive(step(options.length, -1));
    else if (e.key === 'Enter' || e.key === ' ') pick(active);
    else if (e.key === 'Escape' || e.key === 'Tab') close();
    else return;
    e.preventDefault();
  };

  return (
    <div
      className={`dd${open ? ' open' : ''}${className ? ` ${className}` : ''}`}
      ref={rootRef}
      id={id}
    >
      <button
        type="button"
        className="dd-trigger"
        ref={triggerRef}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={ariaLabel}
        onClick={() => (open ? close() : openList())}
      >
        <span>{selected ? selected.label : String(value)}</span>
        <ChevronDown size={14} className="dd-chev" aria-hidden="true" />
      </button>

      {open && (
        <div
          className="dd-menu"
          id={listId}
          ref={listRef}
          role="listbox"
          tabIndex={-1}
          aria-label={ariaLabel}
          onKeyDown={onListKey}
        >
          {options.map((opt, idx) => {
            const isSelected = opt.value === value;
            const isActive = idx === active;
            return (
              <div
                key={String(opt.value)}
                role="option"
                data-idx={idx}
                aria-selected={isSelected}
                aria-disabled={opt.disabled || undefined}
                className={`dd-opt${isSelected ? ' on' : ''}${isActive ? ' active' : ''}${
                  opt.disabled ? ' disabled' : ''
                }`}
                title={opt.title}
                onClick={() => pick(idx)}
                onMouseEnter={() => !opt.disabled && setActive(idx)}
              >
                <span>{opt.label}</span>
                {isSelected && (
                  <Check size={14} className="dd-check" aria-hidden="true" />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

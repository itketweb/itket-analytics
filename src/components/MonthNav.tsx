import { useEffect, useRef } from 'react';
import type { MonthData } from '../types/analytics';
import { isGap } from '../utils/metrics';

interface MonthNavProps {
  currentYear: string;
  selectedPeriod: string;
  isPage?: boolean;
  months: Record<string, MonthData>;
  onSelectPeriod: (period: string, keepDrawer?: boolean) => void;
}

export function MonthNav({
  currentYear,
  selectedPeriod,
  isPage = false,
  months,
  onSelectPeriod,
}: MonthNavProps) {
  const monsRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const mo = monsRef.current;
    if (!mo) return;
    const on = mo.querySelector<HTMLElement>('.m.on');
    if (on && mo.scrollWidth > mo.clientWidth) {
      mo.scrollLeft = on.offsetLeft - (mo.clientWidth - on.offsetWidth) / 2;
    }
  }, [selectedPeriod, isPage]);

  if (!currentYear) return null;

  return (
    <nav className="mons" id="mons" ref={monsRef}>
      <button
        type="button"
        className={`m all ${!isPage && selectedPeriod === currentYear ? 'on' : ''}`}
        onClick={() => onSelectPeriod(currentYear, false)}
      >
        연간
      </button>
      {Array.from({ length: 12 }, (_, i) => {
        const k = `${currentYear}-${String(i + 1).padStart(2, '0')}`;
        const mData = months[k];
        const gap = isGap(mData);
        const enabled = Boolean(mData && !gap);
        return (
          <button
            key={k}
            type="button"
            className={`m ${!isPage && selectedPeriod === k ? 'on' : ''}`}
            disabled={!enabled}
            title={
              gap
                ? '방문 데이터 미집계 기간입니다 (회원가입 실적은 정상 집계)'
                : undefined
            }
            onClick={() => onSelectPeriod(k, false)}
          >
            {i + 1}월
          </button>
        );
      })}
    </nav>
  );
}

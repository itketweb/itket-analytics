import { useEffect, useRef, useState } from 'react';

const MIN_CHART_WIDTH = 280;
const DEFAULT_WIDTH_FALLBACK = 860;
const CARD_HORIZONTAL_PADDING = 42;

export function useChartWidth(): [React.RefObject<HTMLDivElement | null>, number] {
  const ref = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState<number>(() => {
    if (typeof window === 'undefined') return 820;
    const mainEl = document.getElementById('main');
    return Math.max(
      MIN_CHART_WIDTH,
      Math.round((mainEl?.clientWidth || DEFAULT_WIDTH_FALLBACK) - CARD_HORIZONTAL_PADDING),
    );
  });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth;
      if (w > 0) {
        setWidth((prev) =>
          Math.abs(w - prev) >= 4 ? Math.max(MIN_CHART_WIDTH, Math.round(w)) : prev,
        );
      }
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return [ref, width];
}

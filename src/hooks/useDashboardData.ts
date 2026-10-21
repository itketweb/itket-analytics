import { useCallback, useEffect, useMemo, useState } from 'react';
import type { DashboardPayload, MonthData } from '../types/analytics';

const DEFAULT_DATA: DashboardPayload = {
  names: {},
  godoSignups: null,
  godoQuotes: null,
  title: '아이티켓 애널리틱스',
  siteUrl: 'https://itket.com',
  internal: { state: 'pending', since: null },
  meta: { updated: null },
  months: {},
  liveUrl: '',
};

const CURRENT_MONTH_POLL_MS = 300_000; // 5 minutes

export function useDashboardData() {
  const [data, setData] = useState<DashboardPayload>(() => {
    const w = typeof window !== 'undefined' ? window.__DATA__ : undefined;
    return w && typeof w === 'object' ? w : DEFAULT_DATA;
  });

  const keys = useMemo(() => Object.keys(data.months).sort(), [data.months]);
  const years = useMemo(
    () => [...new Set(keys.map((k) => k.slice(0, 4)))],
    [keys],
  );
  const latestKey = keys[keys.length - 1] || '';

  const pollCur = useCallback(async () => {
    if (!data.liveUrl || document.visibilityState === 'hidden') return;
    try {
      const res = await fetch(`${data.liveUrl}?mode=cur`);
      const payload = (await res.json()) as {
        months?: Record<string, MonthData>;
        updated?: string;
      };
      if (!payload.months) return;

      setData((prev) => {
        let changed = false;
        const nextMonths = { ...prev.months };
        for (const [k, monthVal] of Object.entries(payload.months!)) {
          const old = nextMonths[k];
          if (!old || old.updated !== monthVal.updated) {
            nextMonths[k] = monthVal;
            changed = true;
          }
        }
        const nextUpdated =
          payload.updated && payload.updated !== prev.meta.updated
            ? payload.updated
            : prev.meta.updated;
        if (nextUpdated !== prev.meta.updated) {
          changed = true;
        }
        if (!changed) return prev;
        return {
          ...prev,
          months: nextMonths,
          meta: { ...prev.meta, updated: nextUpdated },
        };
      });
    } catch {
      // Ignore transient network errors during background polling
    }
  }, [data.liveUrl]);

  useEffect(() => {
    if (!data.liveUrl) return;
    pollCur();
    const timer = setInterval(pollCur, CURRENT_MONTH_POLL_MS);
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        pollCur();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [data.liveUrl, pollCur]);

  return { data, keys, years, latestKey };
}

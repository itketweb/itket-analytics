import { useCallback, useEffect, useMemo, useState } from 'react';
import type { MonthData } from '../types/analytics';

interface RouteState {
  isPage: boolean;
  pageQ: string;
  pageM: string;
  sel: string;
}

function parseLocationHash(
  keys: string[],
  years: string[],
  months: Record<string, MonthData>,
): RouteState {
  const latestKey = keys[keys.length - 1] || '';
  const raw = typeof location !== 'undefined' ? location.hash.slice(1) : '';
  const parts = raw.split('/');

  if (parts[0] === 'page') {
    let q = '';
    try {
      q = decodeURIComponent(parts[1] || '');
    } catch {
      q = '';
    }
    const m = /^\d{4}-\d{2}$/.test(parts[2] || '') ? parts[2] : latestKey;
    return {
      isPage: true,
      pageQ: q,
      pageM: m,
      sel: latestKey,
    };
  }

  const validSel =
    raw && (months[raw] || years.includes(raw)) ? raw : latestKey;
  return {
    isPage: false,
    pageQ: '',
    pageM: latestKey,
    sel: validSel,
  };
}

export function useHashRoute(
  keys: string[],
  years: string[],
  months: Record<string, MonthData>,
) {
  const latestKey = keys[keys.length - 1] || '';
  const initialRoute = useMemo(
    () => parseLocationHash(keys, years, months),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const [isPage, setIsPage] = useState(initialRoute.isPage);
  const [pageQ, setPageQ] = useState(initialRoute.pageQ);
  const [pageM, setPageM] = useState(initialRoute.pageM);
  const [sel, setSel] = useState(initialRoute.sel);

  useEffect(() => {
    const onHashChange = () => {
      const next = parseLocationHash(keys, years, months);
      setIsPage(next.isPage);
      if (next.isPage) {
        setPageQ(next.pageQ);
        setPageM((prevM) => next.pageM || prevM || latestKey);
      } else {
        setSel(next.sel);
      }
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, [keys, years, months, latestKey]);

  const selectPeriod = useCallback((period: string) => {
    setIsPage(false);
    setSel(period);
    history.replaceState(null, '', `#${period}`);
    window.scrollTo({ top: 0 });
  }, []);

  const openPage = useCallback(
    (query?: string, month?: string) => {
      const trimmed = (query ?? '').trim();
      const targetM = month || pageM || latestKey;
      setIsPage(true);
      setPageQ(trimmed);
      setPageM(targetM);
      history.replaceState(
        null,
        '',
        `#page${trimmed ? `/${encodeURIComponent(trimmed)}/${targetM}` : ''}`,
      );
      window.scrollTo({ top: 0 });
    },
    [pageM, latestKey],
  );

  const resetRoute = useCallback(() => {
    setIsPage(false);
    setSel(latestKey);
    history.replaceState(null, '', location.pathname + location.search);
    window.scrollTo({ top: 0 });
  }, [latestKey]);

  return {
    isPage,
    pageQ,
    pageM: pageM || latestKey,
    sel,
    setPageM,
    selectPeriod,
    openPage,
    resetRoute,
  };
}

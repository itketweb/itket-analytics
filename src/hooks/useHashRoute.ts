import { useCallback, useEffect, useMemo, useState } from 'react';
import type { MonthData, ViewTab } from '../types/analytics';

interface RouteState {
  isPage: boolean;
  pageQ: string;
  pageM: string;
  sel: string;
  tab: ViewTab;
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
      tab: 'page',
    };
  }

  // 탭 지정 해시 지원: #conversion, #content, #conversion/2026-10 등
  const firstPart = parts[0];
  let tab: ViewTab = 'overview';
  let periodPart = '';

  if (firstPart === 'conversion' || firstPart === 'content' || firstPart === 'overview') {
    tab = firstPart as ViewTab;
    periodPart = parts[1] || '';
  } else {
    periodPart = firstPart;
  }

  const validSel =
    periodPart && (months[periodPart] || years.includes(periodPart)) ? periodPart : latestKey;

  return {
    isPage: false,
    pageQ: '',
    pageM: latestKey,
    sel: validSel,
    tab,
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
  const [currentTab, setCurrentTab] = useState<ViewTab>(initialRoute.tab);

  useEffect(() => {
    const onHashChange = () => {
      const next = parseLocationHash(keys, years, months);
      setIsPage(next.isPage);
      setCurrentTab(next.tab);
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

  const openPage = useCallback(
    (query?: string, month?: string) => {
      const trimmed = (query ?? '').trim();
      const targetM = month || pageM || latestKey;
      setIsPage(true);
      setCurrentTab('page');
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

  const selectPeriod = useCallback((period: string) => {
    setIsPage(false);
    setSel(period);
    const hash = currentTab === 'overview' ? `#${period}` : `#${currentTab}/${period}`;
    history.replaceState(null, '', hash);
    window.scrollTo({ top: 0 });
  }, [currentTab]);

  const selectTab = useCallback((tab: ViewTab) => {
    if (tab === 'page') {
      openPage('', sel);
      return;
    }
    setIsPage(false);
    setCurrentTab(tab);
    const hash = tab === 'overview' ? `#${sel}` : `#${tab}/${sel}`;
    history.replaceState(null, '', hash);
    window.scrollTo({ top: 0 });
  }, [sel, openPage]);

  const resetRoute = useCallback(() => {
    setIsPage(false);
    setCurrentTab('overview');
    setSel(latestKey);
    history.replaceState(null, '', location.pathname + location.search);
    window.scrollTo({ top: 0 });
  }, [latestKey]);

  return {
    isPage,
    currentTab,
    pageQ,
    pageM: pageM || latestKey,
    sel,
    setPageM,
    selectPeriod,
    selectTab,
    openPage,
    resetRoute,
  };
}

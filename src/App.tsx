import { useCallback, useEffect, useMemo, useState } from 'react';
import { Header } from './components/Header';
import { LivePanel } from './components/LivePanel';
import { MonthView } from './components/MonthView';
import { PageAnalysisView } from './components/PageAnalysisView';
import { Sidebar } from './components/Sidebar';
import { YearView } from './components/YearView';
import type {
  ConvByKey,
  DashboardPayload,
  MetricKey,
  MonthData,
  ShopTabKey,
} from './types/analytics';

const DEFAULT_DATA: DashboardPayload = {
  names: {},
  godoSignups: null,
  title: '아이티켓 애널리틱스',
  siteUrl: 'https://itket.com',
  internal: { state: 'pending', since: null },
  meta: { updated: null },
  months: {},
  liveUrl: '',
};

function getInitialDark(): boolean {
  if (typeof document === 'undefined') return false;
  const r = document.documentElement;
  if (r.dataset.theme) return r.dataset.theme === 'dark';
  return window.matchMedia('(prefers-color-scheme:dark)').matches;
}

function parseLocationHash(
  keys: string[],
  years: string[],
  months: Record<string, MonthData>,
): { isPage: boolean; pageQ: string; pageM: string; sel: string } {
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

export function App() {
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

  const initialRoute = useMemo(
    () => parseLocationHash(keys, years, data.months),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const [isPage, setIsPage] = useState(initialRoute.isPage);
  const [pageQ, setPageQ] = useState(initialRoute.pageQ);
  const [pageM, setPageM] = useState(initialRoute.pageM);
  const [sel, setSel] = useState(initialRoute.sel);

  const [chartMetric, setChartMetric] = useState<MetricKey>('activeUsers');
  const [annMetric, setAnnMetric] = useState<MetricKey>('sessions');
  const [shopTab, setShopTab] = useState<ShopTabKey>('goods');
  const [convSel, setConvSel] = useState<string>('estimate');
  const [convBy, setConvBy] = useState<ConvByKey>('byMedium');

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isDark, setIsDark] = useState(getInitialDark);

  useEffect(() => {
    document.body.classList.toggle('lock', drawerOpen);
  }, [drawerOpen]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawerOpen(false);
    };
    const onResize = () => {
      if (window.innerWidth > 768) setDrawerOpen(false);
    };
    const onHashChange = () => {
      const next = parseLocationHash(keys, years, data.months);
      setIsPage(next.isPage);
      if (next.isPage) {
        setPageQ(next.pageQ);
        setPageM((prevM) => next.pageM || prevM || latestKey);
      } else {
        setSel(next.sel);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', onResize);
    window.addEventListener('hashchange', onHashChange);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('hashchange', onHashChange);
    };
  }, [keys, years, data.months, latestKey]);

  const pollCur = useCallback(async () => {
    if (!data.liveUrl || document.visibilityState === 'hidden') return;
    try {
      const res = await fetch(`${data.liveUrl}?mode=cur`);
      const j = (await res.json()) as {
        months?: Record<string, MonthData>;
        updated?: string;
      };
      if (!j.months) return;
      setData((prev) => {
        let changed = false;
        const nextMonths = { ...prev.months };
        for (const k of Object.keys(j.months!)) {
          const old = nextMonths[k];
          if (!old || old.updated !== j.months![k].updated) {
            nextMonths[k] = j.months![k];
            changed = true;
          }
        }
        const nextUpdated =
          j.updated && j.updated !== prev.meta.updated
            ? j.updated
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
      // ignore transient network errors
    }
  }, [data.liveUrl]);

  useEffect(() => {
    if (!data.liveUrl) return;
    pollCur();
    const timer = setInterval(pollCur, 300000);
    const onVis = () => {
      if (document.visibilityState === 'visible') {
        pollCur();
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [data.liveUrl, pollCur]);

  const handleToggleTheme = () => {
    const r = document.documentElement;
    const dark = r.dataset.theme
      ? r.dataset.theme === 'dark'
      : window.matchMedia('(prefers-color-scheme:dark)').matches;
    const nextTheme = dark ? 'light' : 'dark';
    r.dataset.theme = nextTheme;
    try {
      localStorage.setItem('theme', nextTheme);
    } catch {
      // ignore storage quota errors
    }
    setIsDark(nextTheme === 'dark');
  };

  const handleGoHome = () => {
    setIsPage(false);
    setConvSel('estimate');
    setConvBy('byMedium');
    setChartMetric('activeUsers');
    setAnnMetric('sessions');
    setShopTab('goods');
    setSel(latestKey);
    history.replaceState(null, '', location.pathname + location.search);
    setDrawerOpen(false);
    window.scrollTo({ top: 0 });
  };

  const handleSelectPeriod = (period: string, keepDrawer = false) => {
    setIsPage(false);
    setSel(period);
    history.replaceState(null, '', `#${period}`);
    if (!keepDrawer) setDrawerOpen(false);
    window.scrollTo({ top: 0 });
  };

  const handleOpenPage = (q?: string, m?: string) => {
    const trimmed = (q ?? '').trim();
    const targetM = m || pageM || latestKey;
    setIsPage(true);
    setPageQ(trimmed);
    setPageM(targetM);
    history.replaceState(
      null,
      '',
      `#page${trimmed ? `/${encodeURIComponent(trimmed)}/${targetM}` : ''}`,
    );
    setDrawerOpen(false);
    window.scrollTo({ top: 0 });
  };

  return (
    <div className="app">
      <Sidebar
        title={data.title}
        open={drawerOpen}
        isPage={isPage}
        sel={sel}
        years={years}
        months={data.months}
        onCloseDrawer={() => setDrawerOpen(false)}
        onGoHome={handleGoHome}
        onGoDashboard={() => handleSelectPeriod(latestKey, false)}
        onGoPageAnalysis={() => handleOpenPage(pageQ, pageM)}
        onSelectPeriod={handleSelectPeriod}
      />

      <div className="wrap">
        <Header
          isPage={isPage}
          sel={sel}
          updated={data.meta.updated}
          drawerOpen={drawerOpen}
          isDark={isDark}
          onOpenDrawer={() => setDrawerOpen(true)}
          onToggleTheme={handleToggleTheme}
        />

        <div className="cont">
          <LivePanel liveUrl={data.liveUrl} />

          <main id="main">
            {isPage ? (
              <PageAnalysisView
                pageQ={pageQ}
                pageM={pageM || latestKey}
                keys={keys}
                months={data.months}
                names={data.names}
                liveUrl={data.liveUrl}
                onOpenPage={(q, m) => handleOpenPage(q, m)}
                onChangeMonthOnly={(m) => setPageM(m)}
              />
            ) : !keys.length ? (
              <div className="empty">
                아직 수집된 데이터가 없습니다.
                <br />
                저장소의 Actions에서 “Update Dashboard”를 실행하면 첫 수집이 시작됩니다.
              </div>
            ) : /^\d{4}$/.test(sel) ? (
              <YearView
                year={sel}
                months={data.months}
                godoSignups={data.godoSignups}
                annMetric={annMetric}
                onChangeAnnMetric={setAnnMetric}
                onSelectMonth={(mKey) => handleSelectPeriod(mKey, false)}
              />
            ) : (
              <MonthView
                monthKey={sel}
                months={data.months}
                names={data.names}
                internal={data.internal}
                chartMetric={chartMetric}
                shopTab={shopTab}
                convSel={convSel}
                convBy={convBy}
                onChangeChartMetric={setChartMetric}
                onChangeShopTab={setShopTab}
                onChangeConvSel={setConvSel}
                onChangeConvBy={setConvBy}
                onOpenPage={(q) => handleOpenPage(q, sel)}
              />
            )}
          </main>
        </div>

        <div className="foot">
          출처: Google Analytics 4 기준입니다. 고도몰 통계와는 측정 방식이 달라, 인기 상품·카테고리·게시판 순위는 거의 같지만 방문자는 한가한 날 GA4가 적고, 내부 새로고침 트래픽이 있으면 페이지뷰가 크게 벌어질 수 있습니다.
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Header } from './components/Header';
import { LivePanel } from './components/LivePanel';
import { MonthView } from './components/MonthView';
import { PageAnalysisView } from './components/PageAnalysisView';
import { Sidebar } from './components/Sidebar';
import { YearView } from './components/YearView';
import { useDashboardData } from './hooks/useDashboardData';
import { useHashRoute } from './hooks/useHashRoute';
import { useTheme } from './hooks/useTheme';
import type { ConvByKey, MetricKey, ShopTabKey } from './types/analytics';

export function App() {
  const { data, keys, years, latestKey } = useDashboardData();
  const {
    isPage,
    pageQ,
    pageM,
    sel,
    setPageM,
    selectPeriod,
    openPage,
    resetRoute,
  } = useHashRoute(keys, years, data.months);
  const { isDark, toggleTheme } = useTheme();

  const [chartMetric, setChartMetric] = useState<MetricKey>('activeUsers');
  const [annMetric, setAnnMetric] = useState<MetricKey>('sessions');
  const [shopTab, setShopTab] = useState<ShopTabKey>('goods');
  const [convSel, setConvSel] = useState<string>('estimate');
  const [convBy, setConvBy] = useState<ConvByKey>('byMedium');
  const [drawerOpen, setDrawerOpen] = useState(false);

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

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  const handleGoHome = () => {
    setConvSel('estimate');
    setConvBy('byMedium');
    setChartMetric('activeUsers');
    setAnnMetric('sessions');
    setShopTab('goods');
    setDrawerOpen(false);
    resetRoute();
  };

  const handleSelectPeriod = (period: string, keepDrawer = false) => {
    selectPeriod(period);
    if (!keepDrawer) setDrawerOpen(false);
  };

  const handleOpenPage = (q?: string, m?: string) => {
    openPage(q, m);
    setDrawerOpen(false);
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
          onToggleTheme={toggleTheme}
        />

        <div className="cont">
          <LivePanel liveUrl={data.liveUrl} />

          <main id="main">
            {isPage ? (
              <PageAnalysisView
                pageQ={pageQ}
                pageM={pageM}
                keys={keys}
                months={data.months}
                names={data.names}
                liveUrl={data.liveUrl}
                onOpenPage={handleOpenPage}
                onChangeMonthOnly={setPageM}
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

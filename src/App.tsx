import { useEffect, useState } from 'react';
import { ExportModal } from './components/ExportModal';
import { Header } from './components/Header';
import { LivePanel } from './components/LivePanel';
import { MonthView } from './components/MonthView';
import { PageAnalysisView } from './components/PageAnalysisView';
import { PageDrawer } from './components/PageDrawer';
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
    currentTab,
    pageQ,
    pageM,
    sel,
    setPageM,
    selectPeriod,
    selectTab,
    openPage,
    resetRoute,
  } = useHashRoute(keys, years, data.months);
  const { isDark, toggleTheme } = useTheme();

  const [chartMetric, setChartMetric] = useState<MetricKey>('activeUsers');
  const [annMetric, setAnnMetric] = useState<MetricKey>('sessions');
  const [shopTab, setShopTab] = useState<ShopTabKey>('goods');
  const [convBy, setConvBy] = useState<ConvByKey>('byMedium');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);

  // 슬라이드오버 Drawer 상태
  const [pageDrawerQuery, setPageDrawerQuery] = useState<string | null>(null);

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
    setConvBy('byMedium');
    setChartMetric('activeUsers');
    setAnnMetric('sessions');
    setShopTab('goods');
    setDrawerOpen(false);
    resetRoute();
  };

  const handleSelectPeriod = (period: string, keepDrawer = false) => {
    selectPeriod(period);
    setPageDrawerQuery(null);
    if (!keepDrawer) setDrawerOpen(false);
  };

  const handleOpenPage = (q?: string, m?: string) => {
    openPage(q, m);
    setPageDrawerQuery(null);
    setDrawerOpen(false);
  };

  // 테이블 행 클릭 시 슬라이드오버 Drawer 오픈
  const handleOpenDrawerPage = (q: string) => {
    setPageDrawerQuery(q);
  };

  const handleExportExcel = () => {
    setExportModalOpen(true);
  };

  return (
    <div className="app">
      <Sidebar
        title={data.title}
        open={drawerOpen}
        currentTab={currentTab}
        sel={sel}
        years={years}
        months={data.months}
        onCloseDrawer={() => setDrawerOpen(false)}
        onGoHome={handleGoHome}
        onSelectTab={(tab) => {
          selectTab(tab);
          setDrawerOpen(false);
        }}
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
          onExportExcel={handleExportExcel}
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
                onBackToDashboard={() => handleSelectPeriod(pageM || latestKey, false)}
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
                currentTab={currentTab as 'overview' | 'conversion' | 'content'}
                chartMetric={chartMetric}
                shopTab={shopTab}
                convBy={convBy}
                onChangeChartMetric={setChartMetric}
                onChangeShopTab={setShopTab}
                onChangeConvBy={setConvBy}
                onOpenPage={(q) => handleOpenDrawerPage(q)}
              />
            )}
          </main>
        </div>
      </div>

      <ExportModal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        data={data}
        currentSel={sel}
        keys={keys}
        years={years}
      />

      <PageDrawer
        isOpen={!!pageDrawerQuery}
        onClose={() => setPageDrawerQuery(null)}
        pageQ={pageDrawerQuery || ''}
        pageM={sel}
        keys={keys}
        months={data.months}
        names={data.names}
        liveUrl={data.liveUrl}
        onOpenFullPage={(q, m) => handleOpenPage(q, m)}
      />
    </div>
  );
}

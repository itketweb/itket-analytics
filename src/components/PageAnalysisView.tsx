import { useEffect, useState } from 'react';
import { usePageAnalysis } from '../hooks/usePageAnalysis';
import type {
  MonthData,
  NamesMap,
  PageAnalysisResult,
} from '../types/analytics';
import { fmt } from '../utils/format';
import { isGap, SUSP_MIN_PV, SUSP_RATIO } from '../utils/metrics';
import {
  buildPageDailySeries,
  buildPageKpis,
} from '../utils/pageAnalysis';
import { DailyChart } from './BarChart';
import { KpiCardsGrid } from './KpiCardsGrid';
import { PageAnalysisDetails } from './PageAnalysisDetails';
import { PageAnalysisSkeleton } from './PageAnalysisSkeleton';
import { PageHeader } from './PageHeader';
import { PageSearchCard } from './PageSearchCard';
import { SourceNotice, type SourceLinkItem } from './SourceNotice';

const PAGE_ANALYSIS_SOURCES: SourceLinkItem[] = [
  { label: 'Google Analytics 4 API', href: 'https://analytics.google.com/' },
  { label: '아이티켓 공식 스토어', href: 'https://itket.com' },
  { label: 'URL·상품번호 실시간 검색 및 진입 세션별 전환율 집계 (10분 캐시)' },
];

interface PageAnalysisViewProps {
  pageQ: string;
  pageM: string;
  keys: string[];
  months: Record<string, MonthData>;
  names: NamesMap;
  liveUrl: string;
  onOpenPage: (query: string, month?: string) => void;
  onChangeMonthOnly: (month: string) => void;
  onBackToDashboard?: () => void;
}

export function PageAnalysisView({
  pageQ,
  pageM,
  keys,
  months,
  names,
  liveUrl,
  onOpenPage,
  onChangeMonthOnly,
  onBackToDashboard,
}: PageAnalysisViewProps) {
  const [inputQ, setInputQ] = useState(pageQ);
  const { pageRes, pageBusy, fallbackSeries } = usePageAnalysis(
    pageQ,
    pageM,
    liveUrl,
    keys,
    months,
  );

  useEffect(() => {
    setInputQ(pageQ);
  }, [pageQ]);

  const validMonths = keys
    .slice()
    .reverse()
    .filter((k) => !isGap(months[k]));
  const latestMonth = months[keys[keys.length - 1]] || ({} as MonthData);
  const topPages = (latestMonth.pages || []).slice(0, 8).map((p) => p.pagePath);
  const topGoods = (latestMonth.goods || [])
    .slice(0, 5)
    .map(
      (g) =>
        [
          g.id,
          (names && names.goods && names.goods[g.id]) || `상품 #${g.id}`,
        ] as const,
    );

  const renderResult = (r: PageAnalysisResult) => {
    const t = r.total || {};
    const views = t.screenPageViews || 0;
    const rMonth = r.month || pageM;
    if (!views) {
      return (
        <div className="card">
          <div className="empty">
            “{r.q || pageQ}” 이(가) 포함된 페이지의 {rMonth} 조회 기록이 없습니다.
            <br />
            주소 일부나 상품번호를 확인해 보세요.
          </div>
        </div>
      );
    }

    const { dates, views: sv } = buildPageDailySeries(r, rMonth);
    const ratio = t.activeUsers ? views / t.activeUsers : 0;
    const kpiItems = buildPageKpis(r);

    const ago = r.at
      ? Math.max(0, Math.round((Date.now() - new Date(r.at).getTime()) / 60000))
      : 0;

    return (
      <>
        {ratio > SUSP_RATIO && views > SUSP_MIN_PV && (
          <div className="note">
            ⚠ 방문자 1명당 조회수가 {ratio.toFixed(1)}배입니다. 내부 새로고침·자동 접속일 수 있습니다(회사 IP 제외 설정 전 데이터에는 직원 접속이 섞여 있습니다).
          </div>
        )}
        {(r.errors || []).length > 0 && (
          <div className="note">
            일부 항목을 가져오지 못했습니다: {(r.errors || []).join(' / ')}
          </div>
        )}

        <KpiCardsGrid
          id="kpisPageAnalysis"
          ariaLabel="페이지 분석 핵심 지표"
          items={kpiItems}
        />

        <section
          className="card card-page-daily-views"
          id="sectionPageDailyViews"
          aria-labelledby="headingPageDailyViews"
        >
          <h2 id="headingPageDailyViews">
            <span>
              일별 조회수 — “{r.q || pageQ}”{' '}
              <span className="sub-title">
                {rMonth}
                {r.partial ? ' (진행 중)' : ''} ·{' '}
                {ago < 1 ? '방금' : `${ago}분 전`} 조회
              </span>
            </span>
          </h2>
          <DailyChart vals={sv} dates={dates} unit="" />
        </section>

        <PageAnalysisDetails
          result={r}
          currentMonth={rMonth}
          query={pageQ}
          onOpenPage={onOpenPage}
        />
      </>
    );
  };

  let bodyContent: React.ReactNode = null;
  if (!pageQ) {
    bodyContent = (
      <section className="card card-empty" id="sectionPageEmpty">
        <div className="empty">
          위에서 페이지를 고르거나 주소·상품번호를 입력해 조회하세요.
        </div>
      </section>
    );
  } else if (pageBusy || !pageRes) {
    bodyContent = <PageAnalysisSkeleton query={pageQ} />;
  } else if (pageRes.offline || pageRes.error) {
    const why = pageRes.offline
      ? '이 화면에는 수집기 주소가 없어 실시간 조회를 할 수 없습니다(로컬 빌드). 저장된 상위 50개 페이지 데이터로만 보여 드립니다.'
      : pageRes.error;
    const has = fallbackSeries.some((r) => r.views != null);
    bodyContent = (
      <section className="card card-page-fallback" id="sectionPageFallback">
        <div className="note mb-sm">{why}</div>
        {has ? (
          <div className="tw">
            <table>
              <thead>
                <tr>
                  <th>월</th>
                  <th className="n">조회수</th>
                  <th className="n">방문자</th>
                </tr>
              </thead>
              <tbody>
                {fallbackSeries
                  .filter((r) => r.ok)
                  .map((r) => (
                    <tr key={r.month}>
                      <td>{r.month}</td>
                      <td className="n">{fmt(r.views)}</td>
                      <td className="n">{fmt(r.users)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty">저장된 상위 페이지에 없는 주소입니다.</div>
        )}
      </section>
    );
  } else {
    bodyContent = renderResult(pageRes);
  }

  return (
    <>
      <PageHeader
        id="pageHeaderAnalysis"
        eyebrow="PAGE INTELLIGENCE · 페이지 분석 리포트"
        title="상세 페이지 성과 분석"
        icon={
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
        }
        meta={<span className="tag">실시간 API 연동</span>}
      />

      <PageSearchCard
        inputQ={inputQ}
        pageM={pageM}
        validMonths={validMonths}
        topPages={topPages}
        topGoods={topGoods}
        onInputChange={setInputQ}
        onSubmit={(q, m) => onOpenPage(q, m)}
        onSelectQuickTag={(q) => onOpenPage(q, pageM)}
        onChangeMonth={(nextM) => {
          if (pageQ) {
            onOpenPage(pageQ, nextM);
          } else {
            onChangeMonthOnly(nextM);
          }
        }}
        onBackToDashboard={onBackToDashboard}
      />

      {bodyContent}

      <SourceNotice sources={PAGE_ANALYSIS_SOURCES} />
    </>
  );
}

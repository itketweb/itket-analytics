import type {
  ConvByKey,
  InternalFilterConfig,
  MetricKey,
  MonthData,
  NamesMap,
  ShopTabKey,
} from '../types/analytics';
import { k2v, METRICS, okM, prevKey, suspOf, yoyKey } from '../utils/metrics';
import { DailyChart } from './BarChart';
import { ConversionSection } from './ConversionSection';
import { MonthViewSkeleton } from './DashboardSkeleton';
import { InternalFilterNote } from './InternalFilterNote';
import { MonthKpiCards } from './MonthKpiCards';
import { PageHeader } from './PageHeader';
import { PopularPagesCard } from './PopularPagesCard';
import { SegmentedControl } from './SegmentedControl';
import { ShopCard } from './ShopCard';
import { WhyCard } from './WhyCard';
import { SecSrc, type SourceLinkItem } from './SecSrc';

const MONTH_SOURCES: SourceLinkItem[] = [
  { label: 'Google Analytics 4 API', href: 'https://analytics.google.com/' },
  { label: '아이티켓 공식 스토어', href: 'https://itket.com' },
  { label: '방문자·세션·PV·체류시간 및 전환(견적·가입·주문) 집계' },
];

interface MonthViewProps {
  monthKey: string;
  months: Record<string, MonthData>;
  names: NamesMap;
  internal: InternalFilterConfig;
  currentTab: 'overview' | 'conversion' | 'content';
  chartMetric: MetricKey;
  shopTab: ShopTabKey;
  convBy: ConvByKey;
  onChangeChartMetric: (m: MetricKey) => void;
  onChangeShopTab: (tab: ShopTabKey) => void;
  onChangeConvBy: (by: ConvByKey) => void;
  onOpenPage: (query: string) => void;
}

export function MonthView({
  monthKey,
  months,
  names,
  internal,
  currentTab,
  chartMetric,
  shopTab,
  convBy,
  onChangeChartMetric,
  onChangeShopTab,
  onChangeConvBy,
  onOpenPage,
}: MonthViewProps) {
  const m = months[monthKey];
  if (!m) {
    return <MonthViewSkeleton />;
  }

  const prev = okM(months, prevKey(monthKey));
  const yoy = okM(months, yoyKey(monthKey));
  const partialDays = m.partial ? m.daily.length : null;

  const series = m.daily.map((r) => k2v(r, m));
  const sp = suspOf(m);

  return (
    <>
      <PageHeader
        id="pageHeaderMonth"
        eyebrow={
          currentTab === 'conversion'
            ? 'CONVERSION INTELLIGENCE · 목표 달성 성과'
            : currentTab === 'content'
              ? 'PAGES & PRODUCTS · 트래픽 및 인기 항목'
              : 'MONTHLY PERFORMANCE · 월간 실적 리포트'
        }
        title={
          currentTab === 'conversion'
            ? `${monthKey.slice(0, 4)}년 ${+monthKey.slice(5)}월 전환 성과 분석`
            : currentTab === 'content'
              ? `${monthKey.slice(0, 4)}년 ${+monthKey.slice(5)}월 페이지 · 상품 랭킹`
              : `${monthKey.slice(0, 4)}년 ${+monthKey.slice(5)}월 실적 분석`
        }
        icon={
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="18" height="18" x="3" y="4" rx="2" />
            <path d="M3 10h18" />
            <path d="M8 2v4" />
            <path d="M16 2v4" />
          </svg>
        }
        meta={
          m.partial ? (
            <span className="tag warn">진행 중 ({m.daily.length}일차)</span>
          ) : (
            <span className="tag ok">마감 완료</span>
          )
        }
      />

      <InternalFilterNote internal={internal} monthKey={monthKey} />

      {m.partial && (
        <div className="note">
          진행 중인 달입니다 ({m.daily.length}일차까지 집계). 전월 대비는 같은 기간끼리 비교합니다.
        </div>
      )}

      {/* 1. 종합 요약 (overview): KPI 요약 카드 + 일별 추이 차트 + 분석 각주 */}
      {currentTab === 'overview' && (
        <>
          <MonthKpiCards
            monthData={m}
            prevMonthData={prev}
            yoyMonthData={yoy}
            suspExcess={sp.excess}
          />

          <section
            className="card card-daily-chart"
            id="sectionDailyChart"
            aria-labelledby="headingDailyChart"
          >
            <h2 id="headingDailyChart">
              <span>일별 추이</span>
              <SegmentedControl
                items={METRICS}
                value={chartMetric}
                onChange={onChangeChartMetric}
              />
            </h2>
            <DailyChart
              vals={series.map((r) => r[chartMetric])}
              dates={m.daily.map((r) => r.date)}
              unit={chartMetric === 'signups' ? '건' : ''}
            />
          </section>

          <WhyCard />
        </>
      )}

      {/* 2. 전환 분석 (conversion): 견적/가입/주문 3대 전환 통합 분석 표 */}
      {currentTab === 'conversion' && (
        <ConversionSection
          monthData={m}
          prevMonthData={prev}
          partialDays={partialDays}
          names={names}
          convBy={convBy}
          onChangeConvBy={onChangeConvBy}
          onOpenPage={onOpenPage}
        />
      )}

      {/* 3. 페이지 · 상품 (content): 인기 페이지 TOP 15 + 고도몰 상품/카테고리/게시판 */}
      {currentTab === 'content' && (
        <>
          <PopularPagesCard
            pages={m.pages}
            totalViews={m.total.screenPageViews}
            susp={sp}
            names={names}
            onOpenPage={onOpenPage}
          />

          <ShopCard
            monthData={m}
            names={names}
            shopTab={shopTab}
            onChangeShopTab={onChangeShopTab}
            onOpenPage={onOpenPage}
          />
        </>
      )}

      <SecSrc sources={MONTH_SOURCES} />
    </>
  );
}

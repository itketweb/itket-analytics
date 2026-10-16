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
import { InternalFilterNote } from './InternalFilterNote';
import { MonthKpiCards } from './MonthKpiCards';
import { PopularPagesCard } from './PopularPagesCard';
import { SegmentedControl } from './SegmentedControl';
import { ShopCard } from './ShopCard';
import { WhyCard } from './WhyCard';

interface MonthViewProps {
  monthKey: string;
  months: Record<string, MonthData>;
  names: NamesMap;
  internal: InternalFilterConfig;
  chartMetric: MetricKey;
  shopTab: ShopTabKey;
  convSel: string;
  convBy: ConvByKey;
  onChangeChartMetric: (m: MetricKey) => void;
  onChangeShopTab: (tab: ShopTabKey) => void;
  onChangeConvSel: (id: string) => void;
  onChangeConvBy: (by: ConvByKey) => void;
  onOpenPage: (query: string) => void;
}

export function MonthView({
  monthKey,
  months,
  names,
  internal,
  chartMetric,
  shopTab,
  convSel,
  convBy,
  onChangeChartMetric,
  onChangeShopTab,
  onChangeConvSel,
  onChangeConvBy,
  onOpenPage,
}: MonthViewProps) {
  const m = months[monthKey];
  if (!m) {
    return <div className="empty">데이터 없음</div>;
  }

  const prev = okM(months, prevKey(monthKey));
  const yoy = okM(months, yoyKey(monthKey));
  const partialDays = m.partial ? m.daily.length : null;

  const series = m.daily.map((r) => k2v(r, m));
  const sp = suspOf(m);

  return (
    <>
      <InternalFilterNote internal={internal} monthKey={monthKey} />

      {m.partial && (
        <div className="note">
          진행 중인 달입니다 ({m.daily.length}일차까지 집계). 전월 대비는 같은 기간끼리 비교합니다.
        </div>
      )}

      <MonthKpiCards
        monthData={m}
        prevMonthData={prev}
        yoyMonthData={yoy}
        suspExcess={sp.excess}
      />

      <ConversionSection
        monthData={m}
        prevMonthData={prev}
        partialDays={partialDays}
        names={names}
        convSel={convSel}
        convBy={convBy}
        onChangeConvSel={onChangeConvSel}
        onChangeConvBy={onChangeConvBy}
        onOpenPage={onOpenPage}
      />

      <div className="card">
        <h2>
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
      </div>

      <PopularPagesCard
        pages={m.pages}
        totalViews={m.total.screenPageViews}
        susp={sp}
        onOpenPage={onOpenPage}
      />

      <ShopCard
        monthData={m}
        names={names}
        shopTab={shopTab}
        onChangeShopTab={onChangeShopTab}
        onOpenPage={onOpenPage}
      />

      <WhyCard />
    </>
  );
}

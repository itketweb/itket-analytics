import type {
  GodomallSignups,
  MetricKey,
  MonthData,
} from '../types/analytics';
import { isGap, metricOf, METRICS, okM } from '../utils/metrics';
import { MonthlyChart } from './BarChart';
import { DeltaBadge } from './DeltaBadge';
import { KpiCardsGrid } from './KpiCardsGrid';
import { SegmentedControl } from './SegmentedControl';
import { YearSummaryTable } from './YearSummaryTable';

interface YearViewProps {
  year: string;
  months: Record<string, MonthData>;
  godoSignups: GodomallSignups | null;
  annMetric: MetricKey;
  onChangeAnnMetric: (m: MetricKey) => void;
  onSelectMonth: (monthKey: string) => void;
}

const ANNUAL_KPI_DEFS: Array<[string, MetricKey]> = [
  ['세션', 'sessions'],
  ['페이지뷰', 'screenPageViews'],
  ['신규 방문자', 'newUsers'],
  ['회원가입', 'signups'],
];

export function YearView({
  year,
  months,
  godoSignups,
  annMetric,
  onChangeAnnMetric,
  onSelectMonth,
}: YearViewProps) {
  const ks = Array.from(
    { length: 12 },
    (_, i) => `${year}-${String(i + 1).padStart(2, '0')}`,
  );
  const val = (k: string, key: MetricKey) =>
    months[k] ? metricOf(months[k], key) : 0;
  const vals = ks.map((k) => val(k, annMetric));
  const sum = (key: MetricKey) => ks.reduce((a, k) => a + val(k, key), 0);

  const py = Number(year) - 1;
  const psum = (key: MetricKey): number | null => {
    const all = Array.from(
      { length: 12 },
      (_, i) => months[`${py}-${String(i + 1).padStart(2, '0')}`],
    );
    if (all.some((m) => !m || isGap(m))) return null;
    return all.reduce((a, m) => a + metricOf(m, key), 0);
  };

  const haveCount = ks.filter((k) => okM(months, k)).length;

  const kpiItems = ANNUAL_KPI_DEFS.map(([label, key]) => {
    const total = sum(key);
    return {
      label: `${label} (${year}년 누계)`,
      value: total,
      badge:
        haveCount === 12 ? (
          <DeltaBadge cur={total} prev={psum(key)} label="전년" />
        ) : null,
    };
  });

  return (
    <>
      <KpiCardsGrid items={kpiItems} />

      <div className="card">
        <h2>
          <span>월별 추이</span>
          <SegmentedControl
            items={METRICS}
            value={annMetric}
            onChange={onChangeAnnMetric}
          />
        </h2>
        <MonthlyChart
          vals={vals}
          have={ks.map((k) => Boolean(okM(months, k)))}
          partial={ks.map((k) => Boolean(months[k] && months[k].partial))}
          unit={annMetric === 'signups' ? '건' : ''}
          sumOk
          onSelectMonthIndex={(idx) => {
            const target = ks[idx];
            if (okM(months, target)) {
              onSelectMonth(target);
            }
          }}
        />
      </div>

      <YearSummaryTable
        year={year}
        ks={ks}
        months={months}
        godoSignups={godoSignups}
        onSelectMonth={onSelectMonth}
      />
    </>
  );
}

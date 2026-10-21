import type {
  GodomallQuotes,
  GodomallSignups,
  MetricKey,
  MonthData,
} from '../types/analytics';
import { fmt } from '../utils/format';
import { metricOf, METRICS, okM } from '../utils/metrics';
import { MonthlyChart } from './BarChart';
import { DeltaBadge } from './DeltaBadge';
import { KpiCardsGrid } from './KpiCardsGrid';
import { PageHeader } from './PageHeader';
import { SegmentedControl } from './SegmentedControl';
import { YearSummaryTable } from './YearSummaryTable';
import { SecSrc, type SourceLinkItem } from './SecSrc';

const YEAR_SOURCES: SourceLinkItem[] = [
  { label: 'Google Analytics 4 API', href: 'https://analytics.google.com/' },
  { label: '아이티켓 공식 온라인 스토어', href: 'https://itket.com' },
  { label: '연간 월별 누적 방문자·세션·페이지뷰 + 고도몰 실회원가입 집계' },
];

interface YearViewProps {
  year: string;
  months: Record<string, MonthData>;
  godoSignups: GodomallSignups | null;
  godoQuotes?: GodomallQuotes | null;
  annMetric: MetricKey;
  onChangeAnnMetric: (m: MetricKey) => void;
  onSelectMonth: (monthKey: string) => void;
}

const ANNUAL_KPI_DEFS: Array<[string, MetricKey]> = [
  ['방문자', 'activeUsers'],
  ['신규 방문자', 'newUsers'],
  ['세션', 'sessions'],
  ['페이지뷰', 'screenPageViews'],
  ['회원가입', 'signups'],
];

export function YearView({
  year,
  months,
  godoSignups,
  godoQuotes,
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

  // 현재 연도에서 실제 데이터가 있는 월 목록 (측정 누락 제외)
  const validMonths = ks.filter((k) => okM(months, k));
  const isFullYear = validMonths.length === 12;
  const prevLabel = isFullYear ? '전년' : '전년 동기간';

  // 비교 대상 전년도 월 목록 (해당 월과 1:1 매칭)
  const py = Number(year) - 1;
  const pyMonths = validMonths.map((k) => `${py}-${k.slice(5)}`);
  const hasPyData =
    pyMonths.length > 0 && pyMonths.every((k) => okM(months, k));

  const psum = (key: MetricKey): number | null => {
    if (!hasPyData) return null;
    return pyMonths.reduce((a, k) => a + val(k, key), 0);
  };

  const kpiItems = ANNUAL_KPI_DEFS.map(([label, key]) => {
    const total = sum(key);
    const prevVal = psum(key);

    let tooltip: string | undefined = undefined;
    if (key === 'activeUsers') {
      tooltip = `${year}년 일별 방문자 합산 (고도몰 통계와 동일한 방식)`;
    }

    return {
      label: `${label} (${year}년${isFullYear ? '' : ' 누계'})`,
      value: total,
      badge:
        prevVal != null ? (
          <DeltaBadge cur={total} prev={prevVal} label={prevLabel} />
        ) : null,
      sub: (
        <div className="l sub1 sub-top" title={tooltip}>
          {prevVal != null ? `${prevLabel} ${fmt(prevVal)}` : `${prevLabel} ―`}
        </div>
      ),
    };
  });

  return (
    <>
      <PageHeader
        id="pageHeaderYear"
        eyebrow="ANNUAL REPORT · 연간 성과 리포트"
        title={`${year}년 연간 성과 요약`}
        icon={
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 3v18h18" />
            <path d="m19 9-5 5-4-4-3 3" />
          </svg>
        }
        meta={
          <span className="tag">
            {isFullYear ? '12개월 전체 집계' : `${validMonths.length}개월 누적`}
          </span>
        }
      />

      <KpiCardsGrid
        id="kpisAnnual"
        ariaLabel="연간 누계 핵심 성과 지표"
        items={kpiItems}
      />

      <section
        className="card card-monthly-chart"
        id="sectionMonthlyChart"
        aria-labelledby="headingMonthlyChart"
      >
        <h2 id="headingMonthlyChart">
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
      </section>

      <YearSummaryTable
        year={year}
        ks={ks}
        months={months}
        godoSignups={godoSignups}
        godoQuotes={godoQuotes}
        onSelectMonth={onSelectMonth}
      />

      <SecSrc sources={YEAR_SOURCES} />
    </>
  );
}

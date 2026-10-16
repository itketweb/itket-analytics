import type {
  GodomallSignups,
  MetricKey,
  MonthData,
} from '../types/analytics';
import { fmt } from '../utils/format';
import { isGap, metricOf, METRICS, okM } from '../utils/metrics';
import { MonthlyChart } from './BarChart';
import { DeltaBadge } from './DeltaBadge';
import { SegmentedControl } from './SegmentedControl';

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

const TABLE_METRICS: MetricKey[] = [
  'activeUsers',
  'sessions',
  'screenPageViews',
  'newUsers',
  'signups',
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

  return (
    <>
      <div className="kpis">
        {ANNUAL_KPI_DEFS.map(([label, key]) => (
          <div key={key} className="kpi">
            <div className="l">
              {label} ({year}년 누계)
            </div>
            <div className="v">{fmt(sum(key))}</div>
            {haveCount === 12 && (
              <DeltaBadge cur={sum(key)} prev={psum(key)} label="전년" />
            )}
          </div>
        ))}
      </div>

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

      <div className="card">
        <h2>
          <span>
            월별 요약{' '}
            <span className="sub-title">
              행을 누르면 해당 월로 이동 · 방문자는 일별 방문자의 합(고도몰 통계와 같은 방식) · * 는 방문 측정이 빠진 달에 고도몰 통계에서 직접 확인한 회원가입 수(참고용)
            </span>
          </span>
        </h2>

        <div className="tw">
          <table className="stk">
            <thead>
              <tr>
                <th>월</th>
                <th className="n">방문자(일 합)</th>
                <th className="n">세션</th>
                <th className="n">페이지뷰</th>
                <th className="n">신규 방문자</th>
                <th className="n">회원가입</th>
              </tr>
            </thead>
            <tbody>
              {ks.map((k, i) => {
                const m = okM(months, k);
                const gap = isGap(months[k]);
                const godoVal =
                  godoSignups && godoSignups.monthly[k] != null
                    ? `${godoSignups.monthly[k]}*`
                    : '―';
                return (
                  <tr
                    key={k}
                    className={m ? 'link' : ''}
                    onClick={m ? () => onSelectMonth(k) : undefined}
                  >
                    <td>
                      {i + 1}월
                      {m && m.partial && <span className="muted"> (진행 중)</span>}
                    </td>
                    {gap ? (
                      <>
                        <td className="n warn-text" colSpan={4}>
                          집계 없음 — 방문 측정이 빠진 구간(측정 누락 추정)
                        </td>
                        <td
                          className="n"
                          title="고도몰 통계 → 회원가입 수에서 직접 확인한 값 (참고용)"
                        >
                          {godoVal}
                        </td>
                      </>
                    ) : m ? (
                      TABLE_METRICS.map((key) => (
                        <td key={key} className="n">
                          {fmt(metricOf(m, key))}
                        </td>
                      ))
                    ) : (
                      <td className="n muted" colSpan={5}>
                        ―
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td>
                  <b>합계</b>
                </td>
                <td className="n">
                  <b>{fmt(sum('activeUsers'))}</b>
                </td>
                {(['sessions', 'screenPageViews', 'newUsers', 'signups'] as MetricKey[]).map(
                  (key) => (
                    <td key={key} className="n">
                      <b>{fmt(sum(key))}</b>
                    </td>
                  ),
                )}
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </>
  );
}

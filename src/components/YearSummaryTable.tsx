import type {
  GodomallSignups,
  MetricKey,
  MonthData,
} from '../types/analytics';
import { fmt } from '../utils/format';
import { isGap, metricOf, okM } from '../utils/metrics';

interface YearSummaryTableProps {
  year: string;
  ks: string[];
  months: Record<string, MonthData>;
  godoSignups: GodomallSignups | null;
  onSelectMonth: (monthKey: string) => void;
}

const TABLE_METRICS: MetricKey[] = [
  'activeUsers',
  'sessions',
  'screenPageViews',
  'newUsers',
  'signups',
];

export function YearSummaryTable({
  ks,
  months,
  godoSignups,
  onSelectMonth,
}: YearSummaryTableProps) {
  const val = (k: string, key: MetricKey) =>
    months[k] ? metricOf(months[k], key) : 0;
  const sum = (key: MetricKey) => ks.reduce((a, k) => a + val(k, key), 0);

  return (
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
  );
}

import type {
  GodomallQuotes,
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
  godoQuotes?: GodomallQuotes | null;
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
  godoQuotes,
  onSelectMonth,
}: YearSummaryTableProps) {
  const val = (k: string, key: MetricKey) =>
    months[k] ? metricOf(months[k], key) : 0;
  const sum = (key: MetricKey) => ks.reduce((a, k) => a + val(k, key), 0);
  const quoteSum = ks.reduce((a, k) => {
    if (godoQuotes && godoQuotes.monthly[k] != null) return a + godoQuotes.monthly[k];
    const m = okM(months, k);
    return a + (m?.conv?.total?.estimate?.sessions || 0);
  }, 0);

  return (
    <section
      className="card card-year-summary"
      id="sectionYearSummary"
      aria-labelledby="headingYearSummary"
    >
      <div className="card-head-bar">
        <h2 id="headingYearSummary">
          <span>월별 요약</span>
          <span className="sub-title">행을 누르면 해당 월 상세 분석으로 이동</span>
        </h2>
      </div>

      <div className="tw">
        <table className="stk">
          <thead>
            <tr>
              <th className="th-month">월</th>
              <th className="n th-stat">방문자(일 합)</th>
              <th className="n th-stat">세션</th>
              <th className="n th-stat">페이지뷰</th>
              <th className="n th-stat">신규 방문자</th>
              <th className="n th-stat">회원가입</th>
              <th className="n th-stat">견적요청</th>
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
              const godoEstVal =
                godoQuotes && godoQuotes.monthly[k] != null
                  ? `${godoQuotes.monthly[k]}*`
                  : m?.conv?.total?.estimate?.sessions != null
                    ? `${m.conv.total.estimate.sessions}`
                    : '―';
              return (
                <tr
                  key={k}
                  className={m ? 'link' : 'na'}
                  onClick={m ? () => onSelectMonth(k) : undefined}
                >
                  <td>
                    {i + 1}월
                    {m && m.partial && <span className="muted"> (진행 중)</span>}
                  </td>
                  {gap ? (
                    <>
                      <td
                        className="td-notice muted"
                        colSpan={4}
                        title="해당 기간은 방문 데이터가 집계되지 않은 기간입니다 (회원가입·견적 실적은 정상 집계)"
                      >
                        방문 데이터 미집계 기간
                      </td>
                      <td
                        className="n"
                        title="고도몰 통계 → 회원가입 수에서 직접 확인한 값 (참고용)"
                      >
                        {godoVal}
                      </td>
                      <td
                        className="n"
                        title="고도몰 DB 견적 실접수 건수 (참고용)"
                      >
                        {godoEstVal}
                      </td>
                    </>
                  ) : m ? (
                    <>
                      {TABLE_METRICS.map((key) => (
                        <td key={key} className="n">
                          {fmt(metricOf(m, key))}
                        </td>
                      ))}
                      <td className="n" title="고도몰 DB 견적 실접수 건수">
                        {godoEstVal}
                      </td>
                    </>
                  ) : (
                    <td className="td-notice muted" colSpan={6}>
                      ―
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="tr-total">
              <td className="td-month td-total-label">
                <span className="total-label">합계</span>
              </td>
              <td className="n td-stat td-total-val">
                <b>{fmt(sum('activeUsers'))}</b>
              </td>
              {(['sessions', 'screenPageViews', 'newUsers', 'signups'] as MetricKey[]).map(
                (key) => (
                  <td key={key} className="n td-stat td-total-val">
                    <b>{fmt(sum(key))}</b>
                  </td>
                ),
              )}
              <td className="n td-stat td-total-val">
                <b>{fmt(quoteSum)}*</b>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
      <div className="tbl-foot">
        <div className="foot-left">
          <b>방문자</b> 일별 합산 · <b>세션·PV·신규</b> GA4 기준 · <b>회원가입·견적요청</b> (*고도몰 DB 실접수)
        </div>
        <div className="foot-right">
          단위: 명·회·건
        </div>
      </div>
    </section>
  );
}

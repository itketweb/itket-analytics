import type { PageAnalysisResult } from '../types/analytics';
import { fmt, pct } from '../utils/format';
import { ProgressBar } from './ProgressBar';

interface PageAnalysisDetailsProps {
  result: PageAnalysisResult;
  currentMonth: string;
  query: string;
  onOpenPage: (query: string, month?: string) => void;
}

export function PageAnalysisDetails({
  result: r,
  currentMonth,
  query,
  onOpenPage,
}: PageAnalysisDetailsProps) {
  const mrows = (r.monthly || []).slice(-14).reverse();
  const mmx = Math.max(1, ...(mrows || []).map((x) => x.screenPageViews));
  const smax = Math.max(1, ...(r.sources || []).map((x) => x.sessions));
  const en = r.entry || { sessions: 0, conv: {}, byMedium: {} };

  return (
    <>
      <div className="grid">
        <section
          className="card card-page-monthly"
          id="cardPageMonthly"
          aria-labelledby="headingPageMonthly"
        >
          <h2 id="headingPageMonthly">월별 추이</h2>
          <div className="tw">
            {mrows.length > 0 ? (
              <table>
                <thead>
                  <tr>
                    <th>월 (누르면 이동)</th>
                    <th className="n">조회수</th>
                    <th className="n">방문자</th>
                  </tr>
                </thead>
                <tbody>
                  {mrows.map((x) => {
                    const isCur = x.month === currentMonth;
                    return (
                      <tr
                        key={x.month}
                        className={isCur ? '' : 'go'}
                        onClick={
                          isCur ? undefined : () => onOpenPage(query, x.month)
                        }
                      >
                        <td>
                          {x.month}
                          {isCur ? ' ◀' : ''}
                          <ProgressBar value={x.screenPageViews} max={mmx} />
                        </td>
                        <td className="n">{fmt(x.screenPageViews)}</td>
                        <td className="n">{fmt(x.activeUsers)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="empty">데이터 없음</div>
            )}
          </div>
        </section>

        <section
          className="card card-page-sources"
          id="cardPageSources"
          aria-labelledby="headingPageSources"
        >
          <h2 id="headingPageSources">유입 매체</h2>
          <div className="tw">
            {(r.sources || []).length > 0 ? (
              <table>
                <thead>
                  <tr>
                    <th>유입 매체</th>
                    <th className="n">세션</th>
                    <th className="n">조회수</th>
                  </tr>
                </thead>
                <tbody>
                  {(r.sources || []).map((x) => (
                    <tr key={x.sessionSourceMedium}>
                      <td>
                        <span className="tx" title={x.sessionSourceMedium}>
                          {x.sessionSourceMedium}
                        </span>
                        <ProgressBar value={x.sessions} max={smax} />
                      </td>
                      <td className="n">{fmt(x.sessions)}</td>
                      <td className="n">{fmt(x.screenPageViews)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="empty">데이터 없음</div>
            )}
          </div>
        </section>
      </div>

      <div className="grid">
        <section
          className="card card-page-conversions"
          id="cardPageConversions"
          aria-labelledby="headingPageConversions"
        >
          <h2 id="headingPageConversions">전환 (이 페이지로 시작한 방문)</h2>
          <div className="tw">
            {en.sessions > 0 ? (
              <>
                <table>
                  <thead>
                    <tr>
                      <th>전환</th>
                      <th className="n">전환 세션</th>
                      <th className="n">전환율</th>
                      <th className="hm">많이 전환한 유입</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(r.defs || []).map((d) => {
                      const s = en.conv[d.id] || 0;
                      const meds = (en.byMedium[d.id] || [])
                        .slice(0, 3)
                        .map((x) => `${x.k} ${fmt(x.s)}`)
                        .join(' · ');
                      return (
                        <tr key={d.id}>
                          <td>{d.name}</td>
                          <td className="n">{fmt(s)}</td>
                          <td className="n rate">{pct(s, en.sessions)}</td>
                          <td className="hm muted">{meds || '―'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div className="tbl-foot">
                  <div className="foot-left">
                    첫 랜딩 방문({fmt(en.sessions)}회) 기준 전환 도달 세션 및 전환율 (GA4)
                  </div>
                  <div className="foot-right">
                    단위: 세션·%
                  </div>
                </div>
              </>
            ) : (
              <div className="empty">
                이 페이지로 처음 들어온 방문이 없어 전환율을 계산할 수 없습니다 (다른 페이지에서 넘어온 조회만 있음).
              </div>
            )}
          </div>
        </section>

        <section
          className="card card-page-devices"
          id="cardPageDevices"
          aria-labelledby="headingPageDevices"
        >
          <h2 id="headingPageDevices">기기</h2>
          <div className="tw">
            {(r.devices || []).length > 0 ? (
              <table>
                <thead>
                  <tr>
                    <th>기기</th>
                    <th className="n">방문자</th>
                    <th className="n">조회수</th>
                  </tr>
                </thead>
                <tbody>
                  {(r.devices || []).map((x) => (
                    <tr key={x.deviceCategory}>
                      <td>{x.deviceCategory}</td>
                      <td className="n">{fmt(x.activeUsers)}</td>
                      <td className="n">{fmt(x.screenPageViews)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="empty">데이터 없음</div>
            )}
          </div>
        </section>
      </div>

      <div className="grid">
        <section
          className="card card-page-urls"
          id="cardPageUrls"
          aria-labelledby="headingPageUrls"
        >
          <h2 id="headingPageUrls">합쳐진 주소 (상위 15)</h2>
          <div className="tw">
            {(r.urls || []).length > 0 ? (
              <table>
                <thead>
                  <tr>
                    <th>주소(쿼리 포함)</th>
                    <th className="n">조회수</th>
                    <th className="n">방문자</th>
                  </tr>
                </thead>
                <tbody>
                  {(r.urls || []).map((x) => (
                    <tr key={x.pagePathPlusQueryString}>
                      <td>
                        <span
                          className="tx"
                          title={x.pagePathPlusQueryString}
                        >
                          {x.pagePathPlusQueryString}
                        </span>
                      </td>
                      <td className="n">{fmt(x.screenPageViews)}</td>
                      <td className="n">{fmt(x.activeUsers)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="empty">데이터 없음</div>
            )}
          </div>
        </section>

        <section
          className="card card-page-events"
          id="cardPageEvents"
          aria-labelledby="headingPageEvents"
        >
          <h2 id="headingPageEvents">이 페이지에서 발생한 이벤트</h2>
          <div className="tw">
            {(r.events || []).length > 0 ? (
              <table>
                <thead>
                  <tr>
                    <th>이벤트</th>
                    <th className="n">횟수</th>
                  </tr>
                </thead>
                <tbody>
                  {(r.events || []).map((x) => (
                    <tr key={x.eventName}>
                      <td>{x.eventName}</td>
                      <td className="n">{fmt(x.eventCount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="empty">데이터 없음</div>
            )}
          </div>
        </section>
      </div>
    </>
  );
}

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
        <div className="card">
          <h2>월별 추이</h2>
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
        </div>

        <div className="card">
          <h2>유입 매체</h2>
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
        </div>
      </div>

      <div className="grid">
        <div className="card">
          <h2>전환 (이 페이지로 시작한 방문)</h2>
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
                <p className="hint">
                  이 페이지로 <b>처음 들어온 방문</b> {fmt(en.sessions)}회 중 전환 화면까지 간 세션입니다. 이 페이지를 거쳐 간 모든 전환이 아니라 “여기서 시작한” 전환입니다.
                </p>
              </>
            ) : (
              <div className="empty">
                이 페이지로 처음 들어온 방문이 없어 전환율을 계산할 수 없습니다 (다른 페이지에서 넘어온 조회만 있음).
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <h2>기기</h2>
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
        </div>
      </div>

      <div className="grid">
        <div className="card">
          <h2>합쳐진 주소 (상위 15)</h2>
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
        </div>

        <div className="card">
          <h2>이 페이지에서 발생한 이벤트</h2>
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
        </div>
      </div>
    </>
  );
}

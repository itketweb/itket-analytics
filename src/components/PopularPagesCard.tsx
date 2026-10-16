import type { PageRow } from '../types/analytics';
import { dur, fmt } from '../utils/format';
import { ProgressBar } from './ProgressBar';
import { SuspiciousPageNote } from './SuspiciousPageNote';

interface SuspResult {
  list: PageRow[];
  excess: number;
}

interface PopularPagesCardProps {
  pages: PageRow[];
  totalViews: number;
  susp: SuspResult;
  onOpenPage: (query: string) => void;
}

export function PopularPagesCard({
  pages,
  totalViews,
  susp,
  onOpenPage,
}: PopularPagesCardProps) {
  const pmax = Math.max(1, ...pages.map((p) => p.screenPageViews));

  return (
    <div className="card">
      <h2>인기 페이지</h2>
      <div className="tw">
        {pages.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>페이지</th>
                <th className="n">조회수</th>
                <th className="n">방문자</th>
                <th className="n hm">체류</th>
              </tr>
            </thead>
            <tbody>
              {pages.slice(0, 15).map((p) => {
                const isSusp = susp.list.includes(p);
                return (
                  <tr
                    key={p.pagePath}
                    className="go"
                    title="누르면 이 페이지의 상세 통계"
                    onClick={() => onOpenPage(p.pagePath)}
                  >
                    <td>
                      <span className="tx" title={p.pagePath}>
                        {isSusp && (
                          <>
                            <span
                              className="flag"
                              title="방문자 대비 조회수 과다"
                            >
                              ⚠
                            </span>{' '}
                          </>
                        )}
                        {p.pagePath}
                      </span>
                      <ProgressBar value={p.screenPageViews} max={pmax} />
                    </td>
                    <td className="n">{fmt(p.screenPageViews)}</td>
                    <td className="n">{fmt(p.activeUsers)}</td>
                    <td className="n hm">
                      {dur(
                        p.activeUsers
                          ? p.userEngagementDuration / p.activeUsers
                          : 0,
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="empty">데이터 없음</div>
        )}
      </div>
      <SuspiciousPageNote
        count={susp.list.length}
        excess={susp.excess}
        totalViews={totalViews}
      />
    </div>
  );
}

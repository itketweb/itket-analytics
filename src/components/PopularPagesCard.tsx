import { useMemo } from 'react';
import { AlertTriangle } from 'lucide-react';
import type { NamesMap, PageRow } from '../types/analytics';
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
  names?: NamesMap;
  onOpenPage: (query: string) => void;
}

function formatPageLabel(path: string, names?: NamesMap) {
  const goodsMatch = path.match(/[?&]goodsNo=(\d+)/);
  if (goodsMatch && names?.goods?.[goodsMatch[1]]) {
    return {
      title: names.goods[goodsMatch[1]],
      sub: path,
      isGoods: true,
    };
  }
  if (path === '/' || path === '/main/index.php') {
    return { title: '홈 / 메인', sub: path, isGoods: false };
  }
  return { title: path, sub: null, isGoods: false };
}

export function PopularPagesCard({
  pages,
  totalViews,
  susp,
  names,
  onOpenPage,
}: PopularPagesCardProps) {
  const pmax = useMemo(
    () => Math.max(1, ...pages.map((p) => p.screenPageViews)),
    [pages],
  );

  return (
    <section
      className="card card-popular-pages"
      id="sectionPopularPages"
      aria-labelledby="headingPopularPages"
    >
      <div className="card-head-bar">
        <h2 id="headingPopularPages">인기 페이지</h2>
      </div>
      <div className="tw">
        {pages.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th className="th-rank">#</th>
                <th className="th-page">페이지</th>
                <th className="n th-stat">조회수</th>
                <th className="n th-stat">방문자</th>
                <th className="n hm th-stat">체류</th>
              </tr>
            </thead>
            <tbody>
              {pages.slice(0, 15).map((p, idx) => {
                const isSusp = susp.list.includes(p);
                const info = formatPageLabel(p.pagePath, names);
                return (
                  <tr
                    key={p.pagePath}
                    className="go"
                    title="누르면 이 페이지의 상세 통계"
                    onClick={() => onOpenPage(p.pagePath)}
                  >
                    <td className="td-rank">
                      <span
                        className={`rank-badge ${idx === 0 ? 'top-1' : idx === 1 ? 'top-2' : idx === 2 ? 'top-3' : ''}`}
                      >
                        {idx + 1}
                      </span>
                    </td>
                    <td className="td-page">
                      <span className="tx" title={p.pagePath}>
                        {isSusp && (
                          <span
                            className="flag flag-warning"
                            title="방문자 대비 조회수 과다 (새로고침 추정)"
                          >
                            <AlertTriangle size={12} aria-hidden="true" />
                          </span>
                        )}
                        {info.isGoods ? (
                          <span className="goods-tag">상품</span>
                        ) : null}
                        <b className="page-title">{info.title}</b>
                        {info.sub && (
                          <span className="muted page-sub"> {info.sub}</span>
                        )}
                      </span>
                      <ProgressBar value={p.screenPageViews} max={pmax} />
                    </td>
                    <td className="n td-stat">{fmt(p.screenPageViews)}</td>
                    <td className="n td-stat">{fmt(p.activeUsers)}</td>
                    <td className="n hm td-stat">
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
      <div className="tbl-foot">
        <div className="foot-left">
          <b>조회수·방문자</b> GA4 경로 기준 · <b>체류시간</b> 평균 참여 시간 · 행 클릭 시 상세 분석 서랍
        </div>
        <div className="foot-right">
          단위: 회·명
        </div>
      </div>
      <SuspiciousPageNote
        count={susp.list.length}
        excess={susp.excess}
        totalViews={totalViews}
      />
    </section>
  );
}

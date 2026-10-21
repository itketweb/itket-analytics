import type { NamesMap, PageAnalysisResult } from '../types/analytics';
import { dur } from './format';

/**
 * 쿼리(URL, 상품번호 등)로부터 화면 표시용 제목과 부제목을 도출합니다.
 */
export function resolvePageTitle(
  query: string,
  names?: NamesMap,
): { title: string; sub: string } {
  let title = query;
  let sub = '';

  const goodsMatch =
    query.match(/[?&]goodsNo=(\d+)/) || query.match(/^goodsNo=(\d+)/);

  if (goodsMatch && names?.goods?.[goodsMatch[1]]) {
    title = names.goods[goodsMatch[1]];
    sub = `상품번호 #${goodsMatch[1]} · ${query}`;
  } else if (query === '/' || query === '/main/index.php') {
    title = '홈 / 메인';
    sub = query;
  }

  return { title, sub };
}

/**
 * 페이지 분석 결과로부터 일별 날짜 목록과 조회수 배열을 생성합니다.
 */
export function buildPageDailySeries(
  result: PageAnalysisResult,
  targetMonth: string,
): { dates: string[]; views: number[] } {
  const days = result.partial
    ? +new Date()
        .toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' })
        .slice(8)
    : new Date(+targetMonth.slice(0, 4), +targetMonth.slice(5), 0).getDate();

  const dmap: Record<string, { date: string; screenPageViews: number }> = {};
  (result.daily || []).forEach((x) => {
    dmap[x.date] = x;
  });

  const dates = Array.from(
    { length: days },
    (_, i) => `${targetMonth}-${String(i + 1).padStart(2, '0')}`,
  );
  const views = dates.map((d) => (dmap[d] ? dmap[d].screenPageViews : 0));

  return { dates, views };
}

/**
 * 페이지 분석 상단 5대 핵심 KPI 아이템 배열을 생성합니다.
 */
export function buildPageKpis(result: PageAnalysisResult): Array<{
  label: string;
  value: string | number;
}> {
  const t = result.total || {};
  const totalViews = t.screenPageViews || 0;
  const activeUsers = t.activeUsers || 0;

  return [
    { label: '조회수', value: totalViews },
    { label: '방문자', value: activeUsers },
    { label: '세션', value: t.sessions || 0 },
    {
      label: '처음 들어온 방문',
      value: (result.entry || { sessions: 0 }).sessions,
    },
    {
      label: '방문자당 체류시간',
      value: dur(
        activeUsers ? (t.userEngagementDuration || 0) / activeUsers : 0,
      ),
    },
  ];
}

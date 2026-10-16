import type {
  ConvByKey,
  DailyMetric,
  DailyMetricWithSignups,
  MetricKey,
  MonthData,
  NamesMap,
  PageRow,
  ShopItem,
  ShopTabKey,
} from '../types/analytics';

export const METRICS: Array<[MetricKey, string]> = [
  ['activeUsers', '방문자'],
  ['sessions', '세션'],
  ['screenPageViews', '페이지뷰'],
  ['newUsers', '신규 방문자'],
  ['signups', '회원가입'],
];

export const CONV_BY: Array<[ConvByKey, string]> = [
  ['byMedium', '유입 매체'],
  ['byChannel', '채널'],
  ['byCampaign', '캠페인'],
  ['byLanding', '랜딩 페이지'],
  ['byGoods', '상품'],
  ['byDevice', '기기'],
];

export const SUSP_MIN_PV = 500;
export const SUSP_RATIO = 10;
export const NORMAL_RATIO = 2;

export const signups = (m: MonthData): number =>
  (m.signups || []).reduce((a, r) => a + r.count, 0);

// 방문자는 고도몰 통계와 같은 방식(일별 방문자의 합)으로 센다. GA4의 월 중복 제거 값은 m.total.activeUsers(순 방문자).
export const dailySum = (m: MonthData, k: Exclude<MetricKey, 'signups'>): number =>
  m.daily.reduce((a, r) => a + (r[k] || 0), 0);

export const metricOf = (m: MonthData, k: MetricKey): number =>
  k === 'signups'
    ? signups(m)
    : k === 'activeUsers'
      ? dailySum(m, 'activeUsers')
      : m.total[k];

export const suspOf = (m: MonthData): { list: PageRow[]; excess: number } => {
  const list = (m.pages || []).filter(
    (p) =>
      p.screenPageViews > SUSP_MIN_PV &&
      p.screenPageViews / Math.max(1, p.activeUsers) > SUSP_RATIO,
  );
  const excess = list.reduce(
    (a, p) => a + p.screenPageViews - p.activeUsers * NORMAL_RATIO,
    0,
  );
  return { list, excess };
};

export const sumDays = (m: MonthData, k: MetricKey, n: number): number =>
  k === 'signups'
    ? (m.signups || [])
        .filter((r) => +r.date.slice(8) <= n)
        .reduce((a, r) => a + r.count, 0)
    : m.daily
        .filter((r) => +r.date.slice(8) <= n)
        .reduce((a, r) => a + r[k], 0);

export const prevKey = (k: string): string => {
  const [y, mo] = k.split('-').map(Number);
  return mo === 1 ? `${y - 1}-12` : `${y}-${String(mo - 1).padStart(2, '0')}`;
};

export const yoyKey = (k: string): string =>
  `${+k.slice(0, 4) - 1}-${k.slice(5)}`;

// 방문 기록이 사실상 없는 달(세션 100 미만, 진행 중인 달 제외) — 비교·합산에서 제외한다
export const isGap = (m?: MonthData): boolean =>
  !!m && !m.partial && m.total.sessions < 100;

export const okM = (
  months: Record<string, MonthData>,
  k: string,
): MonthData | undefined => {
  const m = months[k];
  return m && !isGap(m) ? m : undefined;
};

export const k2v = (r: DailyMetric, m: MonthData): DailyMetricWithSignups => {
  const s = (m.signups || []).find((x) => x.date === r.date);
  return { ...r, signups: s ? s.count : 0 };
};

export const convDaily = (m: MonthData, id: string, n: number | null): number =>
  ((m.conv && m.conv.daily[id]) || [])
    .filter((r) => !n || +r.date.slice(8) <= n)
    .reduce((a, r) => a + r.count, 0);

const GENERIC_TITLE = /^아이티켓 - /;

export const shopItemName = (
  names: NamesMap | undefined,
  shopTab: ShopTabKey,
  r: ShopItem,
): string =>
  (names && names[shopTab] && names[shopTab]?.[r.id]) ||
  (r.title && !GENERIC_TITLE.test(r.title) ? r.title : `#${r.id} (이름 확인 중)`);

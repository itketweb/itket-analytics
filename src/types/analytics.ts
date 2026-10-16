export type MetricKey = 'activeUsers' | 'sessions' | 'screenPageViews' | 'newUsers' | 'signups';
export type ShopTabKey = 'goods' | 'categories' | 'boards';
export type ConvByKey = 'byMedium' | 'byChannel' | 'byCampaign' | 'byLanding' | 'byGoods' | 'byDevice';

export interface TotalMetrics {
  activeUsers: number;
  newUsers: number;
  sessions: number;
  screenPageViews: number;
  userEngagementDuration: number;
  engagedSessions: number;
}

export interface DailyMetric extends TotalMetrics {
  date: string;
}

export interface DailyMetricWithSignups extends DailyMetric {
  signups: number;
}

export interface PageRow {
  pagePath: string;
  screenPageViews: number;
  activeUsers: number;
  userEngagementDuration: number;
}

export interface SourceRow {
  sessionSourceMedium: string;
  sessions: number;
  activeUsers: number;
  newUsers?: number;
  engagedSessions?: number;
}

export interface ChannelRow {
  sessionDefaultChannelGroup: string;
  sessions: number;
  activeUsers: number;
}

export interface CampaignRow {
  sessionCampaignName: string;
  sessionSourceMedium: string;
  sessions: number;
  activeUsers: number;
}

export interface DeviceRow {
  deviceCategory: string;
  activeUsers: number;
  sessions: number;
}

export interface SignupRow {
  date: string;
  count: number;
}

export interface ConversionDef {
  id: string;
  name: string;
  path: string;
}

export interface ConversionTotalItem {
  sessions: number;
  users?: number;
}

export interface ConversionRow {
  k: string;
  s: number;
  n: number;
  u?: number;
}

export interface ConversionData {
  defs: ConversionDef[];
  total: Record<string, ConversionTotalItem>;
  daily: Record<string, SignupRow[]>;
  byMedium?: Record<string, ConversionRow[]>;
  byChannel?: Record<string, ConversionRow[]>;
  byCampaign?: Record<string, ConversionRow[]>;
  byLanding?: Record<string, ConversionRow[]>;
  byGoods?: Record<string, ConversionRow[]>;
  byDevice?: Record<string, ConversionRow[]>;
}

export interface EventRow {
  eventName: string;
  eventCount: number;
  totalUsers: number;
  keyEvents?: number;
}

export interface KeyBySourceRow {
  sessionSourceMedium: string;
  sessions: number;
  keyEvents: number;
}

export interface EcomRow {
  name: string;
  viewed: number;
  cart: number;
  bought: number;
}

export interface ShopItem {
  id: string;
  title?: string;
  views: number;
}

export interface MonthData {
  v?: number;
  month: string;
  partial?: boolean;
  updated?: string;
  total: TotalMetrics;
  daily: DailyMetric[];
  pages: PageRow[];
  sources?: SourceRow[];
  channels?: ChannelRow[];
  campaigns?: CampaignRow[];
  devices?: DeviceRow[];
  signups?: SignupRow[];
  signupSource?: string;
  conv?: ConversionData;
  events?: EventRow[];
  keyBySource?: KeyBySourceRow[];
  ecom?: EcomRow[];
  goods?: ShopItem[];
  categories?: ShopItem[];
  boards?: ShopItem[];
  shopUpdated?: string;
}

export interface NamesMap {
  goods?: Record<string, string>;
  categories?: Record<string, string>;
  boards?: Record<string, string>;
}

export interface GodomallSignups {
  checkedAt?: string;
  monthly: Record<string, number>;
  daily?: Record<string, number>;
}

export interface InternalFilterConfig {
  state: 'pending' | 'testing' | 'active';
  since: string | null;
}

export interface MetaInfo {
  updated: string | null;
  failed?: number;
}

export interface DashboardPayload {
  names: NamesMap;
  godoSignups: GodomallSignups | null;
  title: string;
  siteUrl: string;
  internal: InternalFilterConfig;
  meta: MetaInfo;
  months: Record<string, MonthData>;
  liveUrl: string;
}

export interface LiveMinuteRow {
  minutesAgo: number | string;
  activeUsers: number;
}

export interface LivePageRow {
  unifiedScreenName: string;
  activeUsers: number;
}

export interface LiveDeviceRow {
  deviceCategory: string;
  activeUsers: number;
}

export interface LivePayload {
  at: string;
  activeUsers: number;
  stale?: boolean;
  minutes?: LiveMinuteRow[];
  pages?: LivePageRow[];
  devices?: LiveDeviceRow[];
  error?: string;
}

export interface PageAnalysisUrlRow {
  pagePathPlusQueryString: string;
  screenPageViews: number;
  activeUsers: number;
}

export interface PageAnalysisMonthlyRow {
  month: string;
  screenPageViews: number;
  activeUsers: number;
}

export interface PageAnalysisSourceRow {
  sessionSourceMedium: string;
  sessions: number;
  screenPageViews: number;
}

export interface PageAnalysisDeviceRow {
  deviceCategory: string;
  activeUsers: number;
  screenPageViews: number;
}

export interface PageAnalysisEventRow {
  eventName: string;
  eventCount: number;
}

export interface PageAnalysisEntry {
  sessions: number;
  conv: Record<string, number>;
  byMedium: Record<string, Array<{ k: string; s: number }>>;
}

export interface PageAnalysisResult {
  q?: string;
  month?: string;
  partial?: boolean;
  at?: string;
  offline?: boolean;
  error?: string;
  errors?: string[];
  total?: {
    screenPageViews?: number;
    activeUsers?: number;
    sessions?: number;
    userEngagementDuration?: number;
  };
  daily?: Array<{ date: string; screenPageViews: number }>;
  monthly?: PageAnalysisMonthlyRow[];
  sources?: PageAnalysisSourceRow[];
  devices?: PageAnalysisDeviceRow[];
  urls?: PageAnalysisUrlRow[];
  events?: PageAnalysisEventRow[];
  defs?: ConversionDef[];
  entry?: PageAnalysisEntry;
}

declare global {
  interface Window {
    __DATA__?: DashboardPayload;
  }
}

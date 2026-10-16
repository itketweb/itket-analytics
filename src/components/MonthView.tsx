import type {
  ConvByKey,
  InternalFilterConfig,
  MetricKey,
  MonthData,
  NamesMap,
  ShopTabKey,
} from '../types/analytics';
import { dur, fmt } from '../utils/format';
import {
  k2v,
  metricOf,
  METRICS,
  okM,
  prevKey,
  sumDays,
  suspOf,
  SUSP_RATIO,
  yoyKey,
} from '../utils/metrics';
import { DailyChart } from './BarChart';
import { ConversionSection } from './ConversionSection';
import { DeltaBadge } from './DeltaBadge';
import { ProgressBar } from './ProgressBar';
import { SegmentedControl } from './SegmentedControl';
import { ShopCard } from './ShopCard';
import { WhyCard } from './WhyCard';

interface MonthViewProps {
  monthKey: string;
  months: Record<string, MonthData>;
  names: NamesMap;
  internal: InternalFilterConfig;
  chartMetric: MetricKey;
  shopTab: ShopTabKey;
  convSel: string;
  convBy: ConvByKey;
  onChangeChartMetric: (m: MetricKey) => void;
  onChangeShopTab: (tab: ShopTabKey) => void;
  onChangeConvSel: (id: string) => void;
  onChangeConvBy: (by: ConvByKey) => void;
  onOpenPage: (query: string) => void;
}

const KPI_DEFS: Array<[string, MetricKey]> = [
  ['방문자 (일별 합)', 'activeUsers'],
  ['신규 방문자', 'newUsers'],
  ['세션', 'sessions'],
  ['페이지뷰', 'screenPageViews'],
  ['회원가입', 'signups'],
];

export function MonthView({
  monthKey,
  months,
  names,
  internal,
  chartMetric,
  shopTab,
  convSel,
  convBy,
  onChangeChartMetric,
  onChangeShopTab,
  onChangeConvSel,
  onChangeConvBy,
  onOpenPage,
}: MonthViewProps) {
  const m = months[monthKey];
  if (!m) {
    return <div className="empty">데이터 없음</div>;
  }

  const prev = okM(months, prevKey(monthKey));
  const yoy = okM(months, yoyKey(monthKey));
  const partialDays = m.partial ? m.daily.length : null;

  const st = internal?.state || 'pending';
  const since = internal?.since;
  const showInternalNote = !(
    st === 'active' &&
    since &&
    monthKey.slice(0, 7) > since.slice(0, 7)
  );

  const avgDur = m.total.activeUsers
    ? m.total.userEngagementDuration / m.total.activeUsers
    : 0;
  const prevAvgDur =
    prev && prev.total.activeUsers
      ? prev.total.userEngagementDuration / prev.total.activeUsers
      : null;

  const series = m.daily.map((r) => k2v(r, m));
  const pmax = Math.max(1, ...m.pages.map((p) => p.screenPageViews));
  const sp = suspOf(m);

  return (
    <>
      {showInternalNote && (
        <div className="note flex-note">
          <span className="tag warn">내부 IP</span>
          <span>
            {st === 'active' && since ? (
              <>
                회사 IP 접속은 <b>{since}부터</b> GA4에서 제외됩니다. 이 달에는 그 이전 직원 접속이 섞여 있을 수 있습니다.
              </>
            ) : st === 'testing' ? (
              <>
                회사 IP 제외 필터가 <b>테스트 중</b>입니다(데이터는 아직 제외되지 않음). 확인 후 “활성”으로 바꾸면 그날부터 제외됩니다.
              </>
            ) : (
              <>
                <b>회사 IP 접속이 아직 제외되지 않았습니다.</b> 직원 접속·새로고침이 방문자·조회수·전환에 섞여 있습니다. GA4 내부 트래픽 필터 설정이 필요합니다(README “회사 IP 제외”).
              </>
            )}
          </span>
        </div>
      )}

      {m.partial && (
        <div className="note">
          진행 중인 달입니다 ({m.daily.length}일차까지 집계). 전월 대비는 같은 기간끼리 비교합니다.
        </div>
      )}

      <div className="kpis">
        {KPI_DEFS.map(([label, key]) => {
          const cur = metricOf(m, key);
          return (
            <div key={key} className="kpi">
              <div className="l">{label}</div>
              <div className="v">{fmt(cur)}</div>
              {partialDays ? (
                prev && (
                  <DeltaBadge
                    cur={cur}
                    prev={sumDays(prev, key, partialDays)}
                    label="전월 동기간"
                  />
                )
              ) : (
                <>
                  <DeltaBadge
                    cur={cur}
                    prev={prev ? metricOf(prev, key) : null}
                    label="전월"
                  />
                  <DeltaBadge
                    cur={cur}
                    prev={yoy ? metricOf(yoy, key) : null}
                    label="전년"
                  />
                </>
              )}
              {key === 'activeUsers' && (
                <div
                  className="l sub1 sub-top"
                  title="한 달 동안 같은 사람을 한 번만 센 값(GA4 기본 방식)입니다. 위 값은 고도몰 통계와 같이 '날마다 온 사람'을 더한 값입니다."
                >
                  순 방문자 {fmt(m.total.activeUsers)}
                </div>
              )}
              {key === 'screenPageViews' && sp.excess > 0 && (
                <div
                  className="l sub1 sub-warn"
                  title={`방문자 1명당 조회수가 ${SUSP_RATIO}배를 넘는 페이지의 초과분(내부 새로고침 의심)을 뺀 추정값입니다. 고도몰 통계와 비교할 때 참고하세요.`}
                >
                  ⚠ 의심분 제외 ≈ {fmt(cur - sp.excess)}
                </div>
              )}
              {key === 'signups' && m.signupSource === 'join_ok' && (
                <div
                  className="l sub-tight"
                  title="이 사이트는 가입 완료 시 GA4 sign_up 이벤트를 보내지 않아, 가입 완료 화면(/member/join_ok.php)을 본 사용자 수를 세었습니다. 고도몰 통계와 비교해 보세요."
                >
                  가입 완료 화면 기준
                </div>
              )}
            </div>
          );
        })}

        <div className="kpi">
          <div className="l">방문자당 체류시간</div>
          <div className="v">{dur(avgDur)}</div>
          {!partialDays && (
            <DeltaBadge cur={avgDur} prev={prevAvgDur} label="전월" />
          )}
        </div>
      </div>

      <ConversionSection
        monthData={m}
        prevMonthData={prev}
        partialDays={partialDays}
        names={names}
        convSel={convSel}
        convBy={convBy}
        onChangeConvSel={onChangeConvSel}
        onChangeConvBy={onChangeConvBy}
        onOpenPage={onOpenPage}
      />

      <div className="card">
        <h2>
          <span>일별 추이</span>
          <SegmentedControl
            items={METRICS}
            value={chartMetric}
            onChange={onChangeChartMetric}
          />
        </h2>
        <DailyChart
          vals={series.map((r) => r[chartMetric])}
          dates={m.daily.map((r) => r.date)}
          unit={chartMetric === 'signups' ? '건' : ''}
        />
      </div>

      <div className="card">
        <h2>인기 페이지</h2>
        <div className="tw">
          {m.pages.length > 0 ? (
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
                {m.pages.slice(0, 15).map((p) => {
                  const isSusp = sp.list.includes(p);
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
        {sp.list.length > 0 && (
          <div className="note susp-note">
            ⚠ 표시된 페이지는 방문자 1명당 조회수가 {SUSP_RATIO}배를 넘어 내부 새로고침·자동 접속일 수 있습니다. 초과분 약 {fmt(sp.excess)}뷰(이 달 전체 페이지뷰의{' '}
            {((sp.excess / Math.max(1, m.total.screenPageViews)) * 100).toFixed(0)}
            %)를 빼면 고도몰 통계와 거의 같아집니다. 고도몰은 이런 조회를 제외하는 것으로 보입니다.
          </div>
        )}
      </div>

      <ShopCard
        monthData={m}
        names={names}
        shopTab={shopTab}
        onChangeShopTab={onChangeShopTab}
        onOpenPage={onOpenPage}
      />

      <WhyCard />
    </>
  );
}

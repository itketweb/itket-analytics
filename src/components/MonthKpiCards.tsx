import type { MetricKey, MonthData } from '../types/analytics';
import { dur, fmt } from '../utils/format';
import { metricOf, sumDays, SUSP_RATIO } from '../utils/metrics';
import { DeltaBadge } from './DeltaBadge';
import { KpiCardsGrid, type KpiItem } from './KpiCardsGrid';

interface MonthKpiCardsProps {
  monthData: MonthData;
  prevMonthData?: MonthData | null;
  yoyMonthData?: MonthData | null;
  suspExcess: number;
}

const KPI_DEFS: Array<[string, MetricKey]> = [
  ['방문자 (일별 합)', 'activeUsers'],
  ['신규 방문자', 'newUsers'],
  ['세션', 'sessions'],
  ['페이지뷰', 'screenPageViews'],
  ['회원가입', 'signups'],
];

export function MonthKpiCards({
  monthData: m,
  prevMonthData: prev,
  yoyMonthData: yoy,
  suspExcess,
}: MonthKpiCardsProps) {
  const partialDays = m.partial ? m.daily.length : null;

  const avgDur = m.total.activeUsers
    ? m.total.userEngagementDuration / m.total.activeUsers
    : 0;
  const prevAvgDur =
    prev && prev.total.activeUsers
      ? prev.total.userEngagementDuration / prev.total.activeUsers
      : null;

  const items: KpiItem[] = KPI_DEFS.map(([label, key]) => {
    const cur = metricOf(m, key);
    const badge = partialDays ? (
      prev ? (
        <DeltaBadge
          cur={cur}
          prev={sumDays(prev, key, partialDays)}
          label="전월 동기간"
        />
      ) : null
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
    );

    let sub: React.ReactNode = null;
    if (key === 'activeUsers') {
      sub = (
        <div
          className="l sub1 sub-top"
          title="한 달 동안 같은 사람을 한 번만 센 값(GA4 기본 방식)입니다. 위 값은 고도몰 통계와 같이 '날마다 온 사람'을 더한 값입니다."
        >
          순 방문자 {fmt(m.total.activeUsers)}
        </div>
      );
    } else if (key === 'screenPageViews' && suspExcess > 0) {
      sub = (
        <div
          className="l sub1 sub-warn"
          title={`방문자 1명당 조회수가 ${SUSP_RATIO}배를 넘는 페이지의 초과분(내부 새로고침 의심)을 뺀 추정값입니다. 고도몰 통계와 비교할 때 참고하세요.`}
        >
          ⚠ 의심분 제외 ≈ {fmt(cur - suspExcess)}
        </div>
      );
    } else if (key === 'signups' && m.signupSource === 'join_ok') {
      sub = (
        <div
          className="l sub-tight"
          title="이 사이트는 가입 완료 시 GA4 sign_up 이벤트를 보내지 않아, 가입 완료 화면(/member/join_ok.php)을 본 사용자 수를 세었습니다. 고도몰 통계와 비교해 보세요."
        >
          가입 완료 화면 기준
        </div>
      );
    }

    return {
      label,
      value: cur,
      badge,
      sub,
    };
  });

  items.push({
    label: '방문자당 체류시간',
    value: dur(avgDur),
    badge: !partialDays ? (
      <DeltaBadge cur={avgDur} prev={prevAvgDur} label="전월" />
    ) : null,
    sub: null,
  });

  return <KpiCardsGrid items={items} />;
}

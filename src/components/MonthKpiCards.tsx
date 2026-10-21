import type { GodomallQuotes, GodomallSignups, MetricKey, MonthData } from '../types/analytics';
import { dur, fmt } from '../utils/format';
import { metricOf, sumDays } from '../utils/metrics';
import { DeltaBadge } from './DeltaBadge';
import { KpiCardsGrid, type KpiItem } from './KpiCardsGrid';

interface MonthKpiCardsProps {
  monthData: MonthData;
  prevMonthData?: MonthData | null;
  yoyMonthData?: MonthData | null;
  suspExcess: number;
  godoSignups?: GodomallSignups | null;
  godoQuotes?: GodomallQuotes | null;
}

const KPI_DEFS: Array<[string, MetricKey]> = [
  ['방문자', 'activeUsers'],
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
  godoSignups,
}: MonthKpiCardsProps) {
  const partialDays = m.partial ? m.daily.length : null;
  const prevLabel = partialDays ? '전월 동기간' : '전월';

  // 체류시간 계산
  let curDur = 0;
  let prevAvgDur: number | null = null;

  if (partialDays) {
    const curDurSum = m.daily.reduce((a, r) => a + (r.userEngagementDuration || 0), 0);
    const curUsersSum = m.daily.reduce((a, r) => a + (r.activeUsers || 0), 0);
    curDur = curUsersSum ? curDurSum / curUsersSum : 0;

    if (prev) {
      const prevPart = prev.daily.filter((r) => +r.date.slice(8) <= partialDays);
      const prevDurSum = prevPart.reduce((a, r) => a + (r.userEngagementDuration || 0), 0);
      const prevUsersSum = prevPart.reduce((a, r) => a + (r.activeUsers || 0), 0);
      prevAvgDur = prevUsersSum ? prevDurSum / prevUsersSum : 0;
    }
  } else {
    curDur = m.total.activeUsers
      ? m.total.userEngagementDuration / m.total.activeUsers
      : 0;
    prevAvgDur =
      prev && prev.total.activeUsers
        ? prev.total.userEngagementDuration / prev.total.activeUsers
        : null;
  }

  const items: KpiItem[] = KPI_DEFS.map(([label, key]) => {
    const isSignup = key === 'signups';
    const godoSign =
      isSignup && godoSignups && godoSignups.monthly[m.month] != null
        ? godoSignups.monthly[m.month]
        : null;
    const prevGodoSign =
      isSignup && godoSignups && prev && godoSignups.monthly[prev.month] != null
        ? godoSignups.monthly[prev.month]
        : null;
    const yoyGodoSign =
      isSignup && godoSignups && yoy && godoSignups.monthly[yoy.month] != null
        ? godoSignups.monthly[yoy.month]
        : null;

    const cur = godoSign != null ? godoSign : metricOf(m, key);
    const prevVal =
      godoSign != null
        ? prevGodoSign
        : partialDays
          ? (prev ? sumDays(prev, key, partialDays) : null)
          : (prev ? metricOf(prev, key) : null);
    const yoyVal =
      godoSign != null
        ? yoyGodoSign
        : (yoy ? metricOf(yoy, key) : null);

    const badge = partialDays ? (
      prevVal != null ? (
        <DeltaBadge
          cur={cur}
          prev={prevVal}
          label="전월 동기간"
        />
      ) : null
    ) : (
      <>
        <DeltaBadge
          cur={cur}
          prev={prevVal}
          label="전월"
        />
        <DeltaBadge
          cur={cur}
          prev={yoyVal}
          label="전년"
        />
      </>
    );

    let tooltip: string | undefined = undefined;
    if (key === 'activeUsers') {
      tooltip = `순 방문자(월 중복 제거): ${fmt(m.total.activeUsers)}명\n(표시된 값은 고도몰 통계와 동일한 일별 방문자 합산입니다)`;
    } else if (key === 'screenPageViews' && suspExcess > 0) {
      tooltip = `의심분(새로고침 추정) 약 ${fmt(suspExcess)}뷰 제외 시 ≈ ${fmt(cur - suspExcess)}뷰`;
    } else if (isSignup && godoSign != null) {
      tooltip = `고도몰 DB 실가입자 수: ${godoSign}명 (GA4 완료화면 세션: ${metricOf(m, 'signups')}명)`;
    } else if (key === 'signups' && m.signupSource === 'join_ok') {
      tooltip = '가입 완료 화면(/member/join_ok.php)을 본 사용자 수 기준';
    }

    const sub = (
      <div className="l sub1 sub-top" title={tooltip}>
        {prevVal != null ? `${prevLabel} ${fmt(prevVal)}` : `${prevLabel} ―`}
      </div>
    );

    return {
      label,
      value: cur,
      badge,
      sub,
    };
  });

  items.push({
    label: '방문자당 체류시간',
    value: dur(curDur),
    badge: prevAvgDur != null ? (
      <DeltaBadge
        cur={curDur}
        prev={prevAvgDur}
        label={prevLabel}
      />
    ) : null,
    sub: (
      <div className="l sub1 sub-top">
        {prevAvgDur != null ? `${prevLabel} ${dur(prevAvgDur)}` : `${prevLabel} ―`}
      </div>
    ),
  });

  return (
    <KpiCardsGrid
      items={items}
      id="kpisMonth"
      ariaLabel="월간 핵심 성과 지표"
    />
  );
}

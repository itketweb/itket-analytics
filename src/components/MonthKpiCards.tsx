import type { GodomallQuotes, MetricKey, MonthData } from '../types/analytics';
import { dur, fmt } from '../utils/format';
import { convDaily, godoCount, metricOf, sumDays } from '../utils/metrics';
import { DeltaBadge } from './DeltaBadge';
import { KpiCardsGrid, type KpiItem } from './KpiCardsGrid';

interface MonthKpiCardsProps {
  monthData: MonthData;
  prevMonthData?: MonthData | null;
  yoyMonthData?: MonthData | null;
  suspExcess: number;
  godoQuotes?: GodomallQuotes | null;
  godoQuotesLoading?: boolean;
}

const KPI_DEFS: Array<[string, MetricKey]> = [
  ['방문자', 'activeUsers'],
  ['신규 방문자', 'newUsers'],
  ['세션', 'sessions'],
  ['페이지뷰', 'screenPageViews'],
];

export function MonthKpiCards({
  monthData: m,
  prevMonthData: prev,
  yoyMonthData: yoy,
  suspExcess,
  godoQuotes,
  godoQuotesLoading,
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
    const cur = metricOf(m, key);
    const prevVal = partialDays
      ? (prev ? sumDays(prev, key, partialDays) : null)
      : (prev ? metricOf(prev, key) : null);
    const yoyVal = yoy ? metricOf(yoy, key) : null;

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

  // 견적 요청: 견적문의 시트 실접수 우선, 시트 연동 실패 시 GA4 완료화면 세션
  const godoEst = godoCount(godoQuotes, m.month, partialDays);
  const ga4Est = (m.conv?.total?.estimate || { sessions: 0 }).sessions;
  const estCur = godoEst != null ? godoEst : ga4Est;
  const estPrev =
    godoEst != null
      ? godoCount(godoQuotes, prev?.month, partialDays)
      : prev && prev.conv
        ? partialDays
          ? convDaily(prev, 'estimate', partialDays)
          : (prev.conv.total.estimate || { sessions: 0 }).sessions
        : null;
  const estYoy =
    godoEst != null
      ? godoCount(godoQuotes, yoy?.month, null)
      : yoy && yoy.conv
        ? (yoy.conv.total.estimate || { sessions: 0 }).sessions
        : null;
  const estCurForDelta =
    godoEst == null && partialDays ? convDaily(m, 'estimate', partialDays) : estCur;

  items.unshift({
    label: !godoQuotesLoading && godoEst != null ? '견적 요청 (실제 접수)' : '견적 요청',
    value: estCur,
    loading: !!godoQuotesLoading,
    badge: partialDays ? (
      estPrev != null ? (
        <DeltaBadge cur={estCurForDelta} prev={estPrev} label="전월 동기간" />
      ) : null
    ) : (
      <>
        <DeltaBadge cur={estCur} prev={estPrev} label="전월" />
        <DeltaBadge cur={estCur} prev={estYoy} label="전년" />
      </>
    ),
    sub: (
      <div
        className="l sub1 sub-top"
        title={
          godoEst != null
            ? `견적문의 시트 실접수: ${fmt(godoEst)}건 (GA4 완료화면 세션: ${fmt(ga4Est)}건)`
            : '시트 연동 실패 — GA4 견적 완료화면(/dbk/dbk_estimate_complete.php) 세션 기준'
        }
      >
        {estPrev != null ? `${prevLabel} ${fmt(estPrev)}` : `${prevLabel} ―`}
      </div>
    ),
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

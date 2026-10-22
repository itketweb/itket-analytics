import { useMemo } from 'react';
import type {
  ConvByKey,
  ConversionDef,
  GodomallQuotes,
  GodomallSignups,
  MonthData,
  NamesMap,
} from '../types/analytics';
import { fmt, pct } from '../utils/format';
import { CONV_BY, convDaily } from '../utils/metrics';
import { DeltaBadge } from './DeltaBadge';
import { KpiCardsGrid } from './KpiCardsGrid';
import { ProgressBar } from './ProgressBar';
import { SegmentedControl } from './SegmentedControl';

interface ConversionSectionProps {
  monthData: MonthData;
  prevMonthData?: MonthData;
  partialDays: number | null;
  names: NamesMap;
  godoSignups?: GodomallSignups | null;
  godoQuotes?: GodomallQuotes | null;
  godoQuotesLoading?: boolean;
  convBy: ConvByKey;
  onChangeConvBy: (by: ConvByKey) => void;
  onOpenPage: (query: string) => void;
}

interface IntegratedRow {
  k: string;
  n: number;
  u?: number;
  convs: Record<string, number>;
  totalConv: number;
}

function getDefShortName(d: ConversionDef): string {
  if (d.id === 'estimate') return '견적 요청';
  if (d.id === 'signup') return '회원가입';
  if (d.id === 'order') return '주문';
  return d.name.replace(/\s*완료\s*$/, '') || d.name;
}

function buildConversionRows(
  monthData: MonthData,
  convBy: ConvByKey,
  defs: ConversionDef[],
): IntegratedRow[] {
  const c = monthData.conv;
  if (!c) return [];

  // 1. 유입 매체
  if (convBy === 'byMedium') {
    const maps: Record<string, Map<string, number>> = {};
    for (const d of defs) {
      maps[d.id] = new Map((c.byMedium?.[d.id] || []).map((r) => [r.k, r.s]));
    }
    return (monthData.sources || []).slice(0, 15).map((x) => {
      const convs: Record<string, number> = {};
      let totalConv = 0;
      for (const d of defs) {
        const s = maps[d.id]?.get(x.sessionSourceMedium) || 0;
        convs[d.id] = s;
        totalConv += s;
      }
      return {
        k: x.sessionSourceMedium,
        n: x.sessions,
        u: x.activeUsers,
        convs,
        totalConv,
      };
    });
  }

  // 2. 채널
  if (convBy === 'byChannel') {
    const maps: Record<string, Map<string, number>> = {};
    for (const d of defs) {
      maps[d.id] = new Map((c.byChannel?.[d.id] || []).map((r) => [r.k, r.s]));
    }
    return (monthData.channels || []).slice(0, 15).map((x) => {
      const convs: Record<string, number> = {};
      let totalConv = 0;
      for (const d of defs) {
        const s = maps[d.id]?.get(x.sessionDefaultChannelGroup) || 0;
        convs[d.id] = s;
        totalConv += s;
      }
      return {
        k: x.sessionDefaultChannelGroup,
        n: x.sessions,
        u: x.activeUsers,
        convs,
        totalConv,
      };
    });
  }

  // 3. 이벤트 기반 집계 (랜딩, 상품, 캠페인)
  const map = new Map<string, { k: string; n: number; convs: Record<string, number> }>();
  for (const d of defs) {
    const rows = c[convBy]?.[d.id] || [];
    for (const r of rows) {
      if (!map.has(r.k)) {
        map.set(r.k, { k: r.k, n: r.n, convs: {} });
      }
      const item = map.get(r.k)!;
      item.convs[d.id] = r.s;
      if (r.n > item.n) item.n = r.n;
    }
  }

  const merged = Array.from(map.values()).map((r) => {
    let totalConv = 0;
    for (const d of defs) {
      totalConv += r.convs[d.id] || 0;
    }
    return {
      k: r.k,
      n: r.n,
      convs: r.convs,
      totalConv,
    };
  });

  merged.sort((a, b) => b.totalConv - a.totalConv || b.n - a.n);
  return merged.slice(0, 15);
}

const FALLBACK_DEFS: ConversionDef[] = [
  { id: 'estimate', name: '견적 요청', path: '/dbk/dbk_estimate_complete.php' },
  { id: 'signup', name: '회원가입 완료', path: '/member/join_ok.php' },
  { id: 'order', name: '주문 완료', path: '/order/order_end.php' },
];

export function ConversionSection({
  monthData,
  prevMonthData,
  partialDays,
  names,
  godoSignups,
  godoQuotes,
  godoQuotesLoading,
  convBy,
  onChangeConvBy,
  onOpenPage,
}: ConversionSectionProps) {
  const c = monthData.conv;
  const defs = c?.defs || FALLBACK_DEFS;
  const isSourceBased = convBy === 'byMedium' || convBy === 'byChannel';
  const rows = useMemo(
    () => (c ? buildConversionRows(monthData, convBy, defs) : []),
    [monthData, convBy, defs, c],
  );

  const mx = useMemo(
    () => Math.max(1, ...rows.map((r) => (isSourceBased ? r.n : r.totalConv))),
    [rows, isSourceBased],
  );
  const clickable = convBy === 'byLanding' || convBy === 'byGoods';
  const colHeader = CONV_BY.find((x) => x[0] === convBy)?.[1] || '';

  const renderRowName = (r: IntegratedRow) => {
    if (convBy === 'byCampaign') {
      const [camp, md] = r.k.split(' | ');
      return (
        <>
          {camp} <span className="muted">· {md || ''}</span>
        </>
      );
    }
    if (convBy === 'byGoods') {
      const gName =
        (names && names.goods && names.goods[r.k]) || `상품 #${r.k}`;
      return (
        <>
          {gName} <span className="muted">#{r.k}</span>
        </>
      );
    }
    return r.k;
  };

  const getRowQuery = (r: IntegratedRow) =>
    convBy === 'byGoods'
      ? `goodsNo=${r.k}`
      : convBy === 'byLanding'
        ? r.k
        : '';

  return (
    <>
      <KpiCardsGrid
        id="kpisConversion"
        ariaLabel="전환 목표별 지표"
        items={defs.map((d) => {
          const t = c?.total?.[d.id] || { sessions: 0, users: 0 };
          const isEstimate = d.id === 'estimate';
          const isSignup = d.id === 'signup';

          const godoEst =
            isEstimate && godoQuotes && godoQuotes.monthly
              ? godoQuotes.monthly[monthData.month]
              : null;
          const prevGodoEst =
            isEstimate && godoQuotes && prevMonthData && godoQuotes.monthly
              ? godoQuotes.monthly[prevMonthData.month]
              : null;

          const godoSign =
            isSignup && godoSignups && godoSignups.monthly
              ? godoSignups.monthly[monthData.month]
              : null;
          const prevGodoSign =
            isSignup && godoSignups && prevMonthData && godoSignups.monthly
              ? godoSignups.monthly[prevMonthData.month]
              : null;

          const isLoading = !!godoQuotesLoading;
          const actualCount = isEstimate ? godoEst : isSignup ? godoSign : null;
          const prevActualCount = isEstimate ? prevGodoEst : isSignup ? prevGodoSign : null;

          const cur = actualCount != null ? actualCount : t.sessions;
          const pv =
            actualCount != null
              ? prevActualCount
              : prevMonthData && prevMonthData.conv
                ? partialDays
                  ? convDaily(prevMonthData, d.id, partialDays)
                  : (prevMonthData.conv.total[d.id] || {}).sessions
                : null;

          const cats =
            isEstimate && godoQuotes && godoQuotes.byCategory
              ? godoQuotes.byCategory[monthData.month]
              : null;

          return {
            label: !isLoading && actualCount != null ? `${d.name} (실제 접수)` : d.name,
            value: cur,
            loading: isLoading,
            badge:
              pv != null ? (
                <DeltaBadge
                  cur={
                    actualCount != null
                      ? cur
                      : partialDays
                        ? convDaily(monthData, d.id, partialDays)
                        : cur
                  }
                  prev={pv}
                  label={partialDays ? '전월 동기간' : '전월'}
                />
              ) : null,
            sub:
              actualCount != null ? (
                cats ? (
                  <div
                    className="l sub1 sub-top"
                    style={{ fontSize: '0.8em', color: 'var(--text-muted, #64748b)', lineHeight: 1.3 }}
                  >
                    {Object.entries(cats)
                      .map(([k, v]) => `${k} ${v}`)
                      .join(' · ')}
                  </div>
                ) : null
              ) : null,
          };
        })}
      />

      <p style={{ fontSize: '0.72rem', color: 'var(--text-muted, #94a3b8)', margin: '-0.25rem 0 0.75rem', lineHeight: 1.5 }}>
        견적 요청 실제 접수 건수는 고도몰 견적문의 시트(접수날짜 열) 기준이며 5분 캐시로 조회됩니다.
        시트보다 <b>많을 경우</b> 행 삭제 직후 캐시가 남은 것이며 5분 내 해소됩니다.
        시트보다 <b>적을 경우</b> 접수날짜가 비어 있는 행이 있거나, 최근 추가된 행이 아직 반영되지 않은 것입니다.
      </p>

      <section
        className="card card-conversion"
        id="sectionConversion"
        aria-labelledby="headingConversion"
      >
        <div className="card-head-bar">
          <h2 id="headingConversion">
            <span>전환 분석</span>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 400,
                color: 'var(--text-muted, #64748b)',
                marginLeft: '8px',
              }}
            >
              (유입 경로별 추적은 GA4 웹 세션 기준)
            </span>
          </h2>
          <SegmentedControl
            items={CONV_BY}
            value={convBy}
            onChange={onChangeConvBy}
          />
        </div>

        <div className="tw">
          {rows.length > 0 ? (
            <table>
              <thead>
                <tr>
                  <th className="th-entity">{colHeader}</th>
                  <th className="n th-stat th-traffic">세션</th>
                  {isSourceBased && <th className="n hm th-stat th-traffic">방문자</th>}
                  {defs.map((d) => (
                    <th
                      key={d.id}
                      className="n th-stat th-conv"
                      title={`${d.name} (${d.path})`}
                    >
                      {getDefShortName(d)}
                    </th>
                  ))}
                  <th className="n th-stat th-conv-total">전체 전환</th>
                  <th className="n th-stat th-rate">전환율</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const q = getRowQuery(r);
                  const barVal = isSourceBased ? r.n : r.totalConv;
                  return (
                    <tr
                      key={r.k}
                      className={clickable ? 'go' : ''}
                      onClick={clickable && q ? () => onOpenPage(q) : undefined}
                    >
                      <td className="td-entity">
                        <span className="tx" title={r.k}>
                          {renderRowName(r)}
                        </span>
                        <ProgressBar value={barVal} max={mx} />
                      </td>
                      <td className="n td-stat th-traffic">{fmt(r.n)}</td>
                      {isSourceBased && (
                        <td className="n hm td-stat th-traffic">
                          {r.u != null ? fmt(r.u) : '-'}
                        </td>
                      )}
                      {defs.map((d) => {
                        const val = r.convs[d.id] || 0;
                        return (
                          <td key={d.id} className="n td-stat th-conv">
                            {val > 0 ? (
                              <span className="conv-num active">{fmt(val)}</span>
                            ) : (
                              <span className="conv-num zero">0</span>
                            )}
                          </td>
                        );
                      })}
                      <td className="n td-stat th-conv-total">
                        {r.totalConv > 0 ? (
                          <span className="conv-total-pill">{fmt(r.totalConv)}</span>
                        ) : (
                          <span className="conv-num zero">0</span>
                        )}
                      </td>
                      <td className="n td-stat th-rate rate">
                        {r.totalConv > 0 ? (
                          <span className="rate-badge">{pct(r.totalConv, r.n)}</span>
                        ) : (
                          <span className="rate-zero">0.0%</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="empty" style={{ padding: '2.5rem 1rem', textAlign: 'center' }}>
              {!c
                ? '이 달은 GA4 유입 경로별 세션 전환 수집(2026년 8월 도입) 이전 기간입니다. 상단 고도몰 DB 실접수 건수를 참고해 주세요.'
                : '이 기준으로 집계된 전환이 없습니다.'}
            </div>
          )}
        </div>

        <div className="tbl-foot">
          <div className="foot-left">
            <b>전환</b> 목표 화면 도달 세션(견적·가입·주문) ·{' '}
            <b>전환율</b> 전환 세션 ÷ 전체 세션 · <b>랜딩·상품</b> 첫 진입 기준
            {clickable ? ' · 행 클릭 시 상세 분석 이동' : ''}
          </div>
          <div className="foot-right">
            단위: 세션·%
          </div>
        </div>
      </section>
    </>
  );
}

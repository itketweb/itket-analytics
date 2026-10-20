import { useMemo } from 'react';
import type {
  ConvByKey,
  ConversionDef,
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

export function ConversionSection({
  monthData,
  prevMonthData,
  partialDays,
  names,
  convBy,
  onChangeConvBy,
  onOpenPage,
}: ConversionSectionProps) {
  const c = monthData.conv;
  if (!c) {
    return (
      <section className="card card-conversion-empty" id="sectionConversionEmpty">
        <h2>전환</h2>
        <div className="empty">
          이 달의 전환 집계가 아직 없습니다.
          <br />
          수집기(Apps Script)를 새 버전으로 배포하면 과거 월부터 채워집니다 (README 참고).
        </div>
      </section>
    );
  }

  const defs = c?.defs || [];
  const isSourceBased = convBy === 'byMedium' || convBy === 'byChannel';
  const rows = useMemo(
    () => buildConversionRows(monthData, convBy, defs),
    [monthData, convBy, defs],
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
          const t = c.total[d.id] || { sessions: 0 };
          const cur = t.sessions;
          const pv =
            prevMonthData && prevMonthData.conv
              ? partialDays
                ? convDaily(prevMonthData, d.id, partialDays)
                : (prevMonthData.conv.total[d.id] || {}).sessions
              : null;
          return {
            label: d.name,
            value: cur,
            badge:
              pv != null ? (
                <DeltaBadge
                  cur={
                    partialDays ? convDaily(monthData, d.id, partialDays) : cur
                  }
                  prev={pv}
                  label={partialDays ? '전월 동기간' : '전월'}
                />
              ) : null,
            sub: (
              <div
                className="l sub1 sub-top"
                title={`${d.path} 화면을 본 세션 수 ÷ 전체 세션`}
              >
                전환율 {pct(cur, monthData.total.sessions)}
              </div>
            ),
          };
        })}
      />

      <section
        className="card card-conversion"
        id="sectionConversion"
        aria-labelledby="headingConversion"
      >
        <div className="card-head-bar">
          <h2 id="headingConversion">
            <span>전환 분석</span>
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
            <div className="empty">이 기준으로 집계된 전환이 없습니다.</div>
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

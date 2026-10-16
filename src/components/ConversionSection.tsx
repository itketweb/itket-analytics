import type {
  ConvByKey,
  ConversionRow,
  MonthData,
  NamesMap,
} from '../types/analytics';
import { fmt, pct } from '../utils/format';
import { CONV_BY, convDaily } from '../utils/metrics';
import { DeltaBadge } from './DeltaBadge';
import { SegmentedControl } from './SegmentedControl';

interface ConversionSectionProps {
  monthData: MonthData;
  prevMonthData?: MonthData;
  partialDays: number | null;
  names: NamesMap;
  convSel: string;
  convBy: ConvByKey;
  onChangeConvSel: (id: string) => void;
  onChangeConvBy: (by: ConvByKey) => void;
  onOpenPage: (query: string) => void;
}

const AUTO_KEY_EVENT_RE =
  /^(page_view|session_start|first_visit|scroll|user_engagement|click)$/;

export function ConversionSection({
  monthData,
  prevMonthData,
  partialDays,
  names,
  convSel,
  convBy,
  onChangeConvSel,
  onChangeConvBy,
  onOpenPage,
}: ConversionSectionProps) {
  const c = monthData.conv;
  if (!c) {
    return (
      <div className="card">
        <h2>전환</h2>
        <div className="empty">
          이 달의 전환 집계가 아직 없습니다.
          <br />
          수집기(Apps Script)를 새 버전으로 배포하면 과거 월부터 채워집니다 (README 참고).
        </div>
      </div>
    );
  }

  const defs = c.defs || [];
  const activeConvSel = defs.some((d) => d.id === convSel)
    ? convSel
    : defs[0]?.id || 'estimate';
  const def = defs.find((d) => d.id === activeConvSel) || {
    id: activeConvSel,
    name: '',
    path: '',
  };

  const convRows: ConversionRow[] =
    (c[convBy] && c[convBy]?.[activeConvSel]) || [];

  const isSourceBased =
    convBy === 'byMedium' || convBy === 'byChannel' || convBy === 'byDevice';
  const hasConv = convBy !== 'byDevice';

  let rows: ConversionRow[] = [];
  if (convBy === 'byMedium') {
    rows = (monthData.sources || []).slice(0, 15).map((x) => {
      const cr = convRows.find((r) => r.k === x.sessionSourceMedium);
      return {
        k: x.sessionSourceMedium,
        n: x.sessions,
        u: x.activeUsers,
        s: cr ? cr.s : 0,
      };
    });
  } else if (convBy === 'byChannel') {
    rows = (monthData.channels || []).slice(0, 15).map((x) => {
      const cr = convRows.find((r) => r.k === x.sessionDefaultChannelGroup);
      return {
        k: x.sessionDefaultChannelGroup,
        n: x.sessions,
        u: x.activeUsers,
        s: cr ? cr.s : 0,
      };
    });
  } else if (convBy === 'byDevice') {
    rows = (monthData.devices || []).slice(0, 15).map((x) => {
      const cr = convRows.find((r) => r.k === x.deviceCategory);
      return {
        k: x.deviceCategory,
        n: x.sessions,
        u: x.activeUsers,
        s: cr ? cr.s : 0,
      };
    });
  } else {
    rows = convRows.slice(0, 15);
  }

  const mx = Math.max(1, ...rows.map((r) => (isSourceBased ? r.n : r.s)));
  const clickable = convBy === 'byLanding' || convBy === 'byGoods';
  const colHeader = CONV_BY.find((x) => x[0] === convBy)?.[1] || '';

  const renderRowName = (r: ConversionRow) => {
    if (convBy === 'byCampaign') {
      const [camp, md] = r.k.split(' | ');
      return (
        <>
          {camp} <span style={{ color: 'var(--sub)' }}>· {md || ''}</span>
        </>
      );
    }
    if (convBy === 'byGoods') {
      const gName =
        (names && names.goods && names.goods[r.k]) || `상품 #${r.k}`;
      return (
        <>
          {gName} <span style={{ color: 'var(--sub)' }}>#{r.k}</span>
        </>
      );
    }
    return r.k;
  };

  const getRowQuery = (r: ConversionRow) =>
    convBy === 'byGoods'
      ? `goodsNo=${r.k}`
      : convBy === 'byLanding'
        ? r.k
        : '';

  const ev = monthData.events || [];
  const badKey = ev
    .filter((e) => (e.keyEvents ?? 0) > 0 && AUTO_KEY_EVENT_RE.test(e.eventName))
    .map((e) => e.eventName);
  const kb = badKey.length ? [] : (monthData.keyBySource || []).slice(0, 6);
  const hasKeyEventsCol = ev.some((e) => e.keyEvents != null);
  const showExtra = ev.length > 0 || Boolean(monthData.ecom && monthData.ecom.length);

  return (
    <>
      <div className="kpis">
        {defs.map((d) => {
          const t = c.total[d.id] || { sessions: 0 };
          const cur = t.sessions;
          const pv =
            prevMonthData && prevMonthData.conv
              ? partialDays
                ? convDaily(prevMonthData, d.id, partialDays)
                : (prevMonthData.conv.total[d.id] || {}).sessions
              : null;
          return (
            <div key={d.id} className="kpi">
              <div className="l">{d.name}</div>
              <div className="v">{fmt(cur)}</div>
              {pv != null && (
                <DeltaBadge
                  cur={partialDays ? convDaily(monthData, d.id, partialDays) : cur}
                  prev={pv}
                  label={partialDays ? '전월 동기간' : '전월'}
                />
              )}
              <div
                className="l sub1"
                style={{ marginTop: '0.25rem' }}
                title={`${d.path} 화면을 본 세션 수 ÷ 전체 세션`}
              >
                전환율 {pct(cur, monthData.total.sessions)}
              </div>
            </div>
          );
        })}
      </div>

      <div className="card">
        <h2>
          <span>전환 분석</span>
          <span className="seg">
            {defs.map((d) => (
              <button
                key={d.id}
                type="button"
                className={d.id === activeConvSel ? 'on' : ''}
                onClick={() => onChangeConvSel(d.id)}
              >
                {d.name}
              </button>
            ))}
          </span>
        </h2>

        <div style={{ margin: '-0.25rem 0 0.75rem' }}>
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
                  <th>{colHeader}</th>
                  {isSourceBased && (
                    <>
                      <th className="n">세션</th>
                      <th className="n hm">방문자</th>
                    </>
                  )}
                  {hasConv && (
                    <>
                      <th className="n">전환 세션</th>
                      {!isSourceBased && <th className="n hm">전체 세션</th>}
                      <th className="n">전환율</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const q = getRowQuery(r);
                  const barVal = isSourceBased ? r.n : r.s;
                  return (
                    <tr
                      key={r.k}
                      className={clickable ? 'go' : ''}
                      onClick={clickable && q ? () => onOpenPage(q) : undefined}
                    >
                      <td>
                        <span className="tx" title={r.k}>
                          {renderRowName(r)}
                        </span>
                        <span
                          className="sh"
                          style={{
                            width: `${Math.max(2, (barVal / mx) * 100)}%`,
                          }}
                        />
                      </td>
                      {isSourceBased && (
                        <>
                          <td className="n">{fmt(r.n)}</td>
                          <td className="n hm">{fmt(r.u)}</td>
                        </>
                      )}
                      {hasConv && (
                        <>
                          <td className="n">{fmt(r.s)}</td>
                          {!isSourceBased && <td className="n hm">{fmt(r.n)}</td>}
                          <td className="n rate">{pct(r.s, r.n)}</td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="empty">이 기준으로 집계된 전환이 없습니다.</div>
          )}
        </div>

        <p className="hint">
          전환 = <b>{def.path || ''}</b> 화면을 본 세션(같은 방문이 여러 번 봐도 1). 전환율 = 전환 세션 ÷ 같은 조건의 전체 세션.{' '}
          {clickable ? '행을 누르면 그 페이지의 상세 통계를 봅니다. ' : ''}
          랜딩 페이지·상품은 <b>방문의 첫 화면</b> 기준입니다(그 상품을 보다가 다른 경로로 전환한 방문은 포함되지 않음).
        </p>

        {showExtra && (
          <details style={{ marginTop: '0.75rem' }}>
            <summary
              style={{
                cursor: 'pointer',
                fontSize: '0.875rem',
                color: 'var(--ink2)',
              }}
            >
              GA4가 받고 있는 이벤트 · 주요 이벤트(전환) 설정 현황
            </summary>
            <p className="hint">
              전환 화면 기준 집계가 정확한지 확인하는 용도입니다.{' '}
              {badKey.length > 0 ? (
                <>
                  <b style={{ color: 'var(--warn)' }}>
                    ⚠ GA4에서 {badKey.join('·')} 같은 자동 이벤트가 “주요 이벤트”로 표시되어 있어, 주요 이벤트 기준 수치는 전환으로 쓸 수 없습니다.
                  </b>{' '}
                  GA4 관리 → 이벤트에서 이들을 해제하고 estimate_complete(견적 완료)·홈페이지_견적문의·주문 완료 이벤트만 표시하면 정확해집니다. 그때까지는 위 “전환 화면 기준” 수치를 쓰세요.
                </>
              ) : kb.length > 0 ? (
                'GA4에 “주요 이벤트”로 표시된 이벤트가 있어 아래 매체별 수치도 함께 보여 드립니다.'
              ) : (
                'GA4에서 “주요 이벤트”로 표시된 이벤트가 없습니다.'
              )}
            </p>

            <div className="tw">
              <table>
                <thead>
                  <tr>
                    <th>이벤트</th>
                    <th className="n">발생 횟수</th>
                    <th className="n hm">사용자</th>
                    {hasKeyEventsCol && <th className="n">주요 이벤트</th>}
                  </tr>
                </thead>
                <tbody>
                  {ev.slice(0, 20).map((e) => (
                    <tr key={e.eventName}>
                      <td>{e.eventName}</td>
                      <td className="n">{fmt(e.eventCount)}</td>
                      <td className="n hm">{fmt(e.totalUsers)}</td>
                      {hasKeyEventsCol && (
                        <td className="n">
                          {e.keyEvents ? fmt(e.keyEvents) : '―'}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {kb.length > 0 && (
              <>
                <p className="hint" style={{ marginTop: '0.75rem' }}>
                  <b>주요 이벤트 기준 · 유입 매체별</b>
                </p>
                <div className="tw">
                  <table>
                    <thead>
                      <tr>
                        <th>매체</th>
                        <th className="n">세션</th>
                        <th className="n">주요 이벤트</th>
                      </tr>
                    </thead>
                    <tbody>
                      {kb.map((r) => (
                        <tr key={r.sessionSourceMedium}>
                          <td>{r.sessionSourceMedium}</td>
                          <td className="n">{fmt(r.sessions)}</td>
                          <td className="n">{fmt(r.keyEvents)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {monthData.ecom && monthData.ecom.length > 0 && (
              <>
                <p className="hint" style={{ marginTop: '0.75rem' }}>
                  <b>이커머스 상품 지표</b> (GA4 상품 이벤트가 전송될 때만 표시)
                </p>
                <div className="tw">
                  <table>
                    <thead>
                      <tr>
                        <th>상품</th>
                        <th className="n">조회</th>
                        <th className="n">장바구니</th>
                        <th className="n">구매</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthData.ecom.slice(0, 15).map((e, idx) => (
                        <tr key={idx}>
                          <td>
                            <span className="tx" title={e.name}>
                              {e.name}
                            </span>
                          </td>
                          <td className="n">{fmt(e.viewed)}</td>
                          <td className="n">{fmt(e.cart)}</td>
                          <td className="n">{fmt(e.bought)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </details>
        )}
      </div>
    </>
  );
}

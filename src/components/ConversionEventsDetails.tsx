import type { EcomRow, EventRow, KeyBySourceRow } from '../types/analytics';
import { fmt } from '../utils/format';

const AUTO_KEY_EVENT_RE =
  /^(page_view|session_start|first_visit|scroll|user_engagement|click)$/;

interface ConversionEventsDetailsProps {
  events?: EventRow[];
  keyBySource?: KeyBySourceRow[];
  ecom?: EcomRow[];
}

export function ConversionEventsDetails({
  events = [],
  keyBySource = [],
  ecom = [],
}: ConversionEventsDetailsProps) {
  if (events.length === 0 && ecom.length === 0) {
    return null;
  }

  const badKey = events
    .filter((e) => (e.keyEvents ?? 0) > 0 && AUTO_KEY_EVENT_RE.test(e.eventName))
    .map((e) => e.eventName);
  const kb = badKey.length ? [] : keyBySource.slice(0, 6);
  const hasKeyEventsCol = events.some((e) => e.keyEvents != null);

  return (
    <details className="conv-details">
      <summary>GA4가 받고 있는 이벤트 · 주요 이벤트(전환) 설정 현황</summary>
      <p className="hint">
        전환 화면 기준 집계가 정확한지 확인하는 용도입니다.{' '}
        {badKey.length > 0 ? (
          <>
            <b className="warn-text">
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
            {events.slice(0, 20).map((e) => (
              <tr key={e.eventName}>
                <td>{e.eventName}</td>
                <td className="n">{fmt(e.eventCount)}</td>
                <td className="n hm">{fmt(e.totalUsers)}</td>
                {hasKeyEventsCol && (
                  <td className="n">{e.keyEvents ? fmt(e.keyEvents) : '―'}</td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {kb.length > 0 && (
        <>
          <p className="hint section-gap">
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

      {ecom.length > 0 && (
        <>
          <p className="hint section-gap">
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
                {ecom.slice(0, 15).map((e, idx) => (
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
  );
}

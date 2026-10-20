import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useLivePolling } from '../hooks/useLivePolling';
import { agoText, computeOdometer, fmt } from '../utils/format';
import { LivePanelSkeleton } from './LivePanelSkeleton';

interface LivePanelProps {
  liveUrl: string;
}

const DEVICE_LABELS: Record<string, string> = {
  desktop: 'PC',
  mobile: '모바일',
  tablet: '태블릿',
};

export function LivePanel({ liveUrl }: LivePanelProps) {
  const { live, err, paused, rollFrom, deltaInfo, nowMs } =
    useLivePolling(liveUrl);
  const [collapsed, setCollapsed] = useState(() => {
    try {
      const saved = localStorage.getItem('itket_live_collapsed');
      return saved !== 'false';
    } catch {
      return true;
    }
  });

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('itket_live_collapsed', String(next));
      } catch {
        // ignore storage errors
      }
      return next;
    });
  };

  if (!liveUrl) {
    return <div id="liveBox" />;
  }

  if (paused) {
    return (
      <div id="liveBox">
        <div className="live">
          <div>
            <div className="l lh">
              <span className="dot off" />
              실시간 일시정지
            </div>
            <div className="n msg">오래 사용하지 않아 갱신을 멈췄습니다</div>
            <div className="l">화면을 누르거나 움직이면 다시 시작합니다</div>
          </div>
        </div>
      </div>
    );
  }

  if (!live) {
    if (err) {
      return (
        <div id="liveBox">
          <div className="live">
            <div>
              <div className="l lh">
                <span className="dot off" />
                실시간
              </div>
              <div className="n msg">연결 대기 중…</div>
            </div>
          </div>
        </div>
      );
    }
    return <LivePanelSkeleton />;
  }

  const dev = (live.devices || [])
    .map(
      (r) =>
        `${DEVICE_LABELS[r.deviceCategory] || r.deviceCategory} ${fmt(r.activeUsers)}`,
    )
    .join(' · ');

  const ago = Math.max(
    0,
    Math.round((nowMs - new Date(live.at).getTime()) / 1000),
  );
  const showDelta = deltaInfo && deltaInfo.until > nowMs;
  const odoDigits =
    rollFrom != null ? computeOdometer(rollFrom, live.activeUsers) : null;

  if (collapsed) {
    return (
      <div id="liveBox">
        <div className="live live-collapsed" id="livePanel">
          <div className="live-collapsed-content">
            <span className={`dot${live.stale ? ' off' : ''}`} />
            <span className="live-collapsed-label">실시간 접속</span>
            <b className="live-collapsed-val">{fmt(live.activeUsers)}명</b>
            {showDelta && (
              <span className={`chip ${deltaInfo.d > 0 ? 'up' : 'down'}`}>
                {deltaInfo.d > 0 ? '▲ +' : '▼ '}
                {deltaInfo.d}
              </span>
            )}
            <span className="live-collapsed-sub">
              ({dev || '집계 중'} · {agoText(ago)})
            </span>
          </div>
          <button
            type="button"
            className="btn-live-toggle"
            onClick={toggleCollapsed}
            aria-label="실시간 접속 현황 자세히 보기"
            title="실시간 접속 현황 자세히 보기"
          >
            <span>자세히 보기</span>
            <ChevronDown size={14} aria-hidden="true" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div id="liveBox">
      <section className="live" id="livePanel" aria-label="실시간 접속 현황">
        <button
          type="button"
          className="btn-live-toggle live-toggle-abs"
          onClick={toggleCollapsed}
          aria-label="실시간 패널 접기"
          title="실시간 패널 접기"
        >
          <span>접기</span>
          <ChevronUp size={14} aria-hidden="true" />
        </button>
        <div className="live-stat" id="liveStatBox">
          <div className="l lh">
            <span className={`dot${live.stale ? ' off' : ''}`} />
            지금 접속 중 (최근 30분)
          </div>
          <div className="n">
            {odoDigits
              ? odoDigits.map((d, idx) =>
                  d.same ? (
                    <span key={idx}>{d.newChar}</span>
                  ) : (
                    <span
                      key={idx}
                      className={`roll ${d.dir}${d.gone ? ' gone' : ''}`}
                    >
                      <i aria-hidden="true">{d.oldChar}</i>
                      <b>{d.newChar}</b>
                    </span>
                  ),
                )
              : fmt(live.activeUsers)}
            명
            {showDelta && (
              <span className={`chip ${deltaInfo.d > 0 ? 'up' : 'down'}`}>
                {deltaInfo.d > 0 ? '▲ +' : '▼ '}
                {deltaInfo.d}
              </span>
            )}
          </div>
          <div className="l">
            {dev || '\u00a0'} ·{' '}
            <time id="liveAgo" data-at={live.at} dateTime={live.at}>
              {agoText(ago)}
            </time>{' '}
            갱신{live.stale ? ' · 조회 한도로 지연(최근 성공값)' : ''}
          </div>
        </div>

        <div className="live-pages" id="livePagesBox">
          <div className="l lh">지금 보는 페이지</div>
          <ul>
            {(live.pages || []).length > 0 ? (
              (live.pages || []).slice(0, 5).map((r, idx) => (
                <li key={idx}>
                  <span title={r.unifiedScreenName}>
                    {r.unifiedScreenName || '(제목 없음)'}
                  </span>
                  <span>{fmt(r.activeUsers)}명</span>
                </li>
              ))
            ) : (
              <li>
                <span className="muted">지금 보는 페이지 없음</span>
              </li>
            )}
          </ul>
        </div>
      </section>
    </div>
  );
}

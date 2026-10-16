import { useLivePolling } from '../hooks/useLivePolling';
import { agoText, computeOdometer, fmt } from '../utils/format';

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
    return (
      <div id="liveBox">
        <div className="live">
          <div>
            <div className="l lh">
              <span className="dot off" />
              실시간
            </div>
            <div className="n msg">{err ? '연결 대기 중…' : '불러오는 중…'}</div>
          </div>
        </div>
      </div>
    );
  }

  const mins = Array<number>(30).fill(0);
  (live.minutes || []).forEach((r) => {
    const i = +r.minutesAgo;
    if (i >= 0 && i < 30) mins[29 - i] = r.activeUsers;
  });
  const mx = Math.max(1, ...mins);

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

  return (
    <div id="liveBox">
      <div className="live">
        <div>
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
            <span id="liveAgo" data-at={live.at}>
              {agoText(ago)}
            </span>{' '}
            갱신{live.stale ? ' · 조회 한도로 지연(최근 성공값)' : ''}
          </div>
        </div>

        <div>
          <div className="l lh">분당 접속자 (30분)</div>
          <svg viewBox="0 0 300 44" preserveAspectRatio="none" role="img">
            {mins.map((v, i) => {
              const barH = Math.max(1.5, (v / mx) * 42);
              return (
                <rect
                  key={i}
                  className="b"
                  x={i * 10 + 1}
                  y={44 - barH}
                  width={8}
                  height={barH}
                  rx={1.5}
                >
                  <title>
                    {30 - i}분 전: {v}명
                  </title>
                </rect>
              );
            })}
          </svg>
        </div>

        <div>
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
      </div>
    </div>
  );
}

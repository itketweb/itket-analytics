import { useCallback, useEffect, useRef, useState } from 'react';
import type { LivePayload } from '../types/analytics';

const IDLE_MS = 15 * 60 * 1000; // 15 minutes
const POLL_INTERVAL_MS = 15_000; // 15 seconds
const DELTA_BADGE_DURATION_MS = 15_000;
const ROLL_ANIMATION_MS = 700;

export function useLivePolling(liveUrl: string) {
  const [live, setLive] = useState<LivePayload | null>(null);
  const [err, setErr] = useState(false);
  const [paused, setPaused] = useState(false);
  const [rollFrom, setRollFrom] = useState<number | null>(null);
  const [deltaInfo, setDeltaInfo] = useState<{ d: number; until: number } | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const lastActRef = useRef(Date.now());
  const lastLiveOkRef = useRef(0);
  const lastLiveRef = useRef<LivePayload | null>(null);
  const pausedRef = useRef(false);

  const pollLive = useCallback(async () => {
    if (!liveUrl || document.visibilityState === 'hidden') return;
    if (Date.now() - lastActRef.current > IDLE_MS) {
      if (!pausedRef.current) {
        pausedRef.current = true;
        setPaused(true);
      }
      return;
    }

    try {
      const res = await fetch(`${liveUrl}?mode=live`);
      const payload = (await res.json()) as LivePayload;
      if (payload.error || typeof payload.activeUsers !== 'number') {
        throw new Error(payload.error || 'bad live payload');
      }

      lastLiveOkRef.current = Date.now();
      const prev = lastLiveRef.current;
      if (
        prev &&
        prev.at === payload.at &&
        Boolean(prev.stale) === Boolean(payload.stale)
      ) {
        return;
      }

      if (!prev || prev.at !== payload.at) {
        if (
          prev &&
          typeof prev.activeUsers === 'number' &&
          payload.activeUsers !== prev.activeUsers
        ) {
          setDeltaInfo({
            d: payload.activeUsers - prev.activeUsers,
            until: Date.now() + DELTA_BADGE_DURATION_MS,
          });
          setRollFrom(prev.activeUsers);
          setTimeout(() => setRollFrom(null), ROLL_ANIMATION_MS);
        } else {
          setRollFrom(null);
        }
        lastLiveRef.current = payload;
      }

      setErr(false);
      setLive(payload);
    } catch {
      if (!lastLiveOkRef.current) {
        setErr(true);
      }
    }
  }, [liveUrl]);

  useEffect(() => {
    if (!liveUrl) return;
    pollLive();

    const pollTimer = setInterval(pollLive, POLL_INTERVAL_MS);
    const tickTimer = setInterval(() => {
      const now = Date.now();
      setNowMs(now);
      setDeltaInfo((cur) => (cur && cur.until <= now ? null : cur));
    }, 1000);

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        pollLive();
      }
    };

    const onUserActivity = () => {
      lastActRef.current = Date.now();
      if (pausedRef.current) {
        pausedRef.current = false;
        setPaused(false);
        pollLive();
      }
    };

    const activityEvents = [
      'mousemove',
      'keydown',
      'click',
      'scroll',
      'touchstart',
    ] as const;
    activityEvents.forEach((ev) =>
      window.addEventListener(ev, onUserActivity, { passive: true }),
    );
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      clearInterval(pollTimer);
      clearInterval(tickTimer);
      activityEvents.forEach((ev) =>
        window.removeEventListener(ev, onUserActivity),
      );
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [liveUrl, pollLive]);

  return { live, err, paused, rollFrom, deltaInfo, nowMs };
}

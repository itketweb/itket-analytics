import { useEffect, useMemo, useState } from 'react';
import type { MonthData, PageAnalysisResult } from '../types/analytics';
import { isGap } from '../utils/metrics';

const PAGE_CACHE_TTL_MS = 120_000; // 2 minutes
const pageCache: Record<string, { t: number; v: PageAnalysisResult }> = {};

export interface PathStoreSeriesItem {
  month: string;
  ok: boolean;
  views: number | null;
  users: number | null;
}

export function usePageAnalysis(
  pageQ: string,
  pageM: string,
  liveUrl: string,
  keys: string[],
  months: Record<string, MonthData>,
) {
  const [pageRes, setPageRes] = useState<PageAnalysisResult | null>(null);
  const [pageBusy, setPageBusy] = useState(false);

  useEffect(() => {
    if (!pageQ) {
      setPageRes(null);
      setPageBusy(false);
      return;
    }

    const cacheKey = `${pageM}|${pageQ.toLowerCase()}`;
    const cached = pageCache[cacheKey];
    if (cached && Date.now() - cached.t < PAGE_CACHE_TTL_MS) {
      setPageRes(cached.v);
      setPageBusy(false);
      return;
    }

    if (!liveUrl) {
      setPageRes({ offline: true });
      setPageBusy(false);
      return;
    }

    let cancelled = false;
    setPageBusy(true);
    setPageRes(null);

    fetch(
      `${liveUrl}?mode=page&month=${encodeURIComponent(pageM)}&q=${encodeURIComponent(pageQ)}`,
    )
      .then((res) => res.json())
      .then((result: PageAnalysisResult) => {
        if (cancelled) return;
        if (!result.error && !result.total) {
          result.error =
            '수집기(Apps Script)가 아직 새 버전이 아닙니다. README의 “수집기 업데이트” 순서대로 새 버전으로 배포하면 사용할 수 있습니다.';
        }
        if (!result.error) {
          pageCache[cacheKey] = { t: Date.now(), v: result };
        }
        setPageRes(result);
        setPageBusy(false);
      })
      .catch(() => {
        if (cancelled) return;
        setPageRes({
          error: '수집기에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.',
        });
        setPageBusy(false);
      });

    return () => {
      cancelled = true;
    };
  }, [pageQ, pageM, liveUrl]);

  const fallbackSeries = useMemo<PathStoreSeriesItem[]>(() => {
    if (!pageQ) return [];
    return keys.map((k) => {
      const m = months[k];
      const p = (m?.pages || []).find((x) => x.pagePath === pageQ);
      return {
        month: k,
        ok: !isGap(m),
        views: p ? p.screenPageViews : null,
        users: p ? p.activeUsers : null,
      };
    });
  }, [pageQ, keys, months]);

  return { pageRes, pageBusy, fallbackSeries };
}

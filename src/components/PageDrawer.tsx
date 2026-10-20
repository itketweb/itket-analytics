import { useEffect } from 'react';
import { ExternalLink, X } from 'lucide-react';
import { usePageAnalysis } from '../hooks/usePageAnalysis';
import type { MonthData, NamesMap, PageAnalysisResult } from '../types/analytics';
import { dur } from '../utils/format';
import { SUSP_MIN_PV, SUSP_RATIO } from '../utils/metrics';
import { DailyChart } from './BarChart';
import { KpiCardsGrid } from './KpiCardsGrid';
import { PageAnalysisDetails } from './PageAnalysisDetails';
import { PageAnalysisSkeleton } from './PageAnalysisSkeleton';

interface PageDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  pageQ: string;
  pageM: string;
  keys: string[];
  months: Record<string, MonthData>;
  names: NamesMap;
  liveUrl: string;
  onOpenFullPage?: (q: string, m?: string) => void;
}

export function PageDrawer({
  isOpen,
  onClose,
  pageQ,
  pageM,
  keys,
  months,
  names,
  liveUrl,
  onOpenFullPage,
}: PageDrawerProps) {
  const { pageRes, pageBusy } = usePageAnalysis(
    isOpen ? pageQ : '',
    pageM,
    liveUrl,
    keys,
    months,
  );

  // ESC 키로 닫기
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // 배경 스크롤 방지
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('drawer-open-lock');
    } else {
      document.body.classList.remove('drawer-open-lock');
    }
    return () => {
      document.body.classList.remove('drawer-open-lock');
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // 상품 번호 매핑 이름 찾기
  let title = pageQ;
  let sub = '';
  const goodsMatch = pageQ.match(/[?&]goodsNo=(\d+)/) || pageQ.match(/^goodsNo=(\d+)/);
  if (goodsMatch && names?.goods?.[goodsMatch[1]]) {
    title = names.goods[goodsMatch[1]];
    sub = `상품번호 #${goodsMatch[1]} · ${pageQ}`;
  } else if (pageQ === '/' || pageQ === '/main/index.php') {
    title = '홈 / 메인';
    sub = pageQ;
  }

  const renderResult = (r: PageAnalysisResult) => {
    const t = r.total || {};
    const views = t.screenPageViews || 0;
    const rMonth = r.month || pageM;

    if (!views) {
      return (
        <div className="card">
          <div className="empty">
            “{r.q || pageQ}”의 {rMonth} 조회 기록이 없습니다.
            <br />
            주소 일부나 상품번호를 확인해 보세요.
          </div>
        </div>
      );
    }

    const days = r.partial
      ? +new Date()
          .toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' })
          .slice(8)
      : new Date(+rMonth.slice(0, 4), +rMonth.slice(5), 0).getDate();

    const dmap: Record<string, { date: string; screenPageViews: number }> = {};
    (r.daily || []).forEach((x) => {
      dmap[x.date] = x;
    });
    const dates = Array.from(
      { length: days },
      (_, i) => `${rMonth}-${String(i + 1).padStart(2, '0')}`,
    );
    const sv = dates.map((d) => (dmap[d] ? dmap[d].screenPageViews : 0));
    const ratio = t.activeUsers ? views / t.activeUsers : 0;

    const kpiItems = [
      { label: '조회수', value: views },
      { label: '방문자', value: t.activeUsers || 0 },
      { label: '세션', value: t.sessions || 0 },
      {
        label: '처음 들어온 방문',
        value: (r.entry || { sessions: 0 }).sessions,
      },
      {
        label: '방문자당 체류시간',
        value: dur(
          t.activeUsers
            ? (t.userEngagementDuration || 0) / t.activeUsers
            : 0,
        ),
      },
    ];

    const ago = r.at
      ? Math.max(0, Math.round((Date.now() - new Date(r.at).getTime()) / 60000))
      : 0;

    return (
      <div className="drawer-body-inner">
        {ratio > SUSP_RATIO && views > SUSP_MIN_PV && (
          <div className="note">
            ⚠ 방문자 1명당 조회수가 {ratio.toFixed(1)}배입니다. 내부 새로고침·자동 접속일 수 있습니다.
          </div>
        )}

        <KpiCardsGrid
          id="kpisPageDrawer"
          ariaLabel="페이지 분석 핵심 지표"
          items={kpiItems}
        />

        <section
          className="card card-page-daily-views"
          id="sectionDrawerDailyViews"
        >
          <div className="card-head-bar">
            <h2>
              <span>일별 조회수</span>
              <span className="sub-title">
                {rMonth}
                {r.partial ? ' (진행 중)' : ''} ·{' '}
                {ago < 1 ? '방금' : `${ago}분 전`} 조회
              </span>
            </h2>
          </div>
          <DailyChart vals={sv} dates={dates} unit="" />
        </section>

        <PageAnalysisDetails
          result={r}
          currentMonth={rMonth}
          query={pageQ}
          onOpenPage={(q, m) => {
            if (onOpenFullPage) {
              onClose();
              onOpenFullPage(q, m);
            }
          }}
        />
      </div>
    );
  };

  return (
    <div className="page-drawer-portal" role="dialog" aria-modal="true">
      <div
        className="page-drawer-backdrop"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="page-drawer-container">
        {/* 드로어 헤더 */}
        <div className="drawer-header">
          <div className="drawer-title-group">
            <span className="drawer-badge">상세 성과 분석</span>
            <h3 className="drawer-title" title={title}>
              {title}
            </h3>
            {sub && <span className="drawer-sub">{sub}</span>}
          </div>

          <div className="drawer-actions">
            {onOpenFullPage && (
              <button
                type="button"
                className="btn btn-ghost btn-drawer-ext"
                title="전체 페이지 분석 화면으로 이동"
                onClick={() => {
                  onClose();
                  onOpenFullPage(pageQ, pageM);
                }}
              >
                <ExternalLink size={15} />
                <span>전체 화면</span>
              </button>
            )}
            <button
              type="button"
              className="btn btn-icon btn-drawer-close"
              aria-label="서랍 닫기"
              onClick={onClose}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* 드로어 본문 콘텐츠 */}
        <div className="drawer-content">
          {pageBusy ? (
            <PageAnalysisSkeleton query={pageQ} />
          ) : !pageRes ? (
            <div className="empty">분석 데이터를 불러오는 중입니다...</div>
          ) : (
            renderResult(pageRes)
          )}
        </div>
      </div>
    </div>
  );
}

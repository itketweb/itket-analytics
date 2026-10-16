import { useEffect, useRef } from 'react';
import type { MonthData } from '../types/analytics';
import { isGap } from '../utils/metrics';

interface SidebarProps {
  title: string;
  open: boolean;
  isPage: boolean;
  sel: string;
  years: string[];
  months: Record<string, MonthData>;
  onCloseDrawer: () => void;
  onGoHome: () => void;
  onGoDashboard: () => void;
  onGoPageAnalysis: () => void;
  onSelectPeriod: (period: string, keepDrawer?: boolean) => void;
}

export function Sidebar({
  title,
  open,
  isPage,
  sel,
  years,
  months,
  onCloseDrawer,
  onGoHome,
  onGoDashboard,
  onGoPageAnalysis,
  onSelectPeriod,
}: SidebarProps) {
  const monsRef = useRef<HTMLElement>(null);
  const currentYear = sel.slice(0, 4);

  useEffect(() => {
    const mo = monsRef.current;
    if (!mo) return;
    const on = mo.querySelector<HTMLElement>('.m.on');
    if (on && mo.scrollWidth > mo.clientWidth) {
      mo.scrollLeft = on.offsetLeft - (mo.clientWidth - on.offsetWidth) / 2;
    }
  }, [sel, isPage]);

  return (
    <>
      <div
        className={`scrim ${open ? 'on' : ''}`}
        id="scrim"
        onClick={onCloseDrawer}
      />
      <aside className={`side ${open ? 'open' : ''}`} id="side">
        <button
          type="button"
          className="btn ic sclose"
          id="sclose"
          aria-label="메뉴 닫기"
          onClick={onCloseDrawer}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>

        <a
          className="brand"
          id="brand"
          href="./"
          title="처음으로"
          onClick={(e) => {
            if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button) return;
            e.preventDefault();
            onGoHome();
          }}
        >
          <i>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
            </svg>
          </i>
          <span>{title}</span>
        </a>

        <div className="sn">
          <button
            type="button"
            className={`m ${!isPage ? 'on' : ''}`}
            id="navDash"
            onClick={onGoDashboard}
          >
            대시보드
          </button>
          <button
            type="button"
            className={`m ${isPage ? 'on' : ''}`}
            id="navPage"
            onClick={onGoPageAnalysis}
          >
            페이지 분석
          </button>
        </div>

        <div className="sy">
          <div className="lbl">연도</div>
          <div className="years" id="years">
            {years.map((y) => (
              <button
                key={y}
                type="button"
                className={`y ${!isPage && sel.startsWith(y) ? 'on' : ''}`}
                onClick={() => onSelectPeriod(y, true)}
              >
                {y}년
              </button>
            ))}
          </div>
        </div>

        <div className="sm">
          <div className="lbl">기간</div>
          <nav className="mons" id="mons" ref={monsRef}>
            {currentYear && (
              <button
                type="button"
                className={`m all ${!isPage && sel === currentYear ? 'on' : ''}`}
                onClick={() => onSelectPeriod(currentYear, false)}
              >
                연간
              </button>
            )}
            {currentYear &&
              Array.from({ length: 12 }, (_, i) => {
                const k = `${currentYear}-${String(i + 1).padStart(2, '0')}`;
                const mData = months[k];
                const gap = isGap(mData);
                const enabled = Boolean(mData && !gap);
                return (
                  <button
                    key={k}
                    type="button"
                    className={`m ${!isPage && sel === k ? 'on' : ''}`}
                    disabled={!enabled}
                    title={
                      gap
                        ? '방문 측정이 빠진 달입니다 (고도몰 방문 통계도 0이지만 같은 기간 회원가입은 기록됨 — 측정 누락으로 추정)'
                        : undefined
                    }
                    onClick={() => onSelectPeriod(k, false)}
                  >
                    {i + 1}월
                  </button>
                );
              })}
          </nav>
        </div>

        <div className="sfoot">
          출처: Google Analytics 4
          <br />
          수집 15분 · 화면 5분
          <br />
          접속자 30초 간격 갱신
        </div>
      </aside>
    </>
  );
}

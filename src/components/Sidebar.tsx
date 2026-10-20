import { BarChart3, FileSearch, LayoutDashboard, X } from 'lucide-react';
import type { MonthData } from '../types/analytics';
import { MonthNav } from './MonthNav';
import { YearSelector } from './YearSelector';

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
  const currentYear = sel.slice(0, 4);

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
          <X size={18} aria-hidden="true" />
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
            <BarChart3 size={15} aria-hidden="true" />
          </i>
          <span>{title}</span>
        </a>

        <nav className="sn" id="sideNav" aria-label="사이드바 메뉴">
          <button
            type="button"
            className={`m ${!isPage ? 'on' : ''}`}
            id="navDash"
            onClick={onGoDashboard}
          >
            <LayoutDashboard size={15} aria-hidden="true" />
            <span>대시보드</span>
          </button>
          <button
            type="button"
            className={`m ${isPage ? 'on' : ''}`}
            id="navPage"
            onClick={onGoPageAnalysis}
          >
            <FileSearch size={15} aria-hidden="true" />
            <span>페이지 분석</span>
          </button>
        </nav>

        <section className="sy" id="sideYearSection" aria-label="연도 선택">
          <div className="lbl">연도</div>
          <YearSelector
            years={years}
            selectedYear={sel}
            isPage={isPage}
            onSelectYear={(y) => onSelectPeriod(y, true)}
          />
        </section>

        <section className="sm" id="sideMonthSection" aria-label="기간 선택">
          <div className="lbl">기간</div>
          <MonthNav
            currentYear={currentYear}
            selectedPeriod={sel}
            isPage={isPage}
            months={months}
            onSelectPeriod={onSelectPeriod}
          />
        </section>

        {/* 마케팅팀 · 배포 날짜 기준 릴리즈 표기 */}
        <div className="side-foot" id="sideReleaseFoot">
          <span className="team">마케팅팀</span> ·{' '}
          <span
            className="rel"
            title={
              typeof __APP_COMMIT__ !== 'undefined' && __APP_COMMIT__
                ? `커밋 ${__APP_COMMIT__}`
                : undefined
            }
          >
            {typeof __APP_RELEASE__ !== 'undefined'
              ? __APP_RELEASE__
              : 'v26.10.20'}
          </span>
        </div>
      </aside>
    </>
  );
}

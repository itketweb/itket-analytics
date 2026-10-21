import {
  BarChart3,
  FileSearch,
  LayoutDashboard,
  ShoppingBag,
  Target,
  X,
} from 'lucide-react';
import type { MonthData, ViewTab } from '../types/analytics';
import { MonthNav } from './MonthNav';
import { YearSelector } from './YearSelector';

interface SidebarProps {
  title: string;
  open: boolean;
  currentTab: ViewTab;
  sel: string;
  years: string[];
  months: Record<string, MonthData>;
  onCloseDrawer: () => void;
  onGoHome: () => void;
  onSelectTab: (tab: ViewTab) => void;
  onSelectPeriod: (period: string, keepDrawer?: boolean) => void;
}

export function Sidebar({
  title,
  open,
  currentTab,
  sel,
  years,
  months,
  onCloseDrawer,
  onGoHome,
  onSelectTab,
  onSelectPeriod,
}: SidebarProps) {
  const currentYear = sel.slice(0, 4);
  const isPage = currentTab === 'page';

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
          <i className="brand-icon">
            <BarChart3 size={15} aria-hidden="true" />
          </i>
          <span>{title}</span>
        </a>

        <nav className="sn" id="sideNav" aria-label="사이드바 메뉴">
          <div className="lbl">대시보드</div>
          <button
            type="button"
            className={`m ${currentTab === 'overview' ? 'on' : ''}`}
            id="navOverview"
            onClick={() => onSelectTab('overview')}
          >
            <LayoutDashboard size={15} aria-hidden="true" />
            <span>종합 요약</span>
          </button>
          <button
            type="button"
            className={`m ${currentTab === 'conversion' ? 'on' : ''}`}
            id="navConversion"
            onClick={() => onSelectTab('conversion')}
          >
            <Target size={15} aria-hidden="true" />
            <span>전환 분석</span>
          </button>
          <button
            type="button"
            className={`m ${currentTab === 'content' ? 'on' : ''}`}
            id="navContent"
            onClick={() => onSelectTab('content')}
          >
            <ShoppingBag size={15} aria-hidden="true" />
            <span>페이지 · 상품</span>
          </button>

          <div className="lbl" style={{ marginTop: '0.5rem' }}>검색 · 탐색</div>
          <button
            type="button"
            className={`m ${currentTab === 'page' ? 'on' : ''}`}
            id="navPage"
            onClick={() => onSelectTab('page')}
          >
            <FileSearch size={15} aria-hidden="true" />
            <span>URL 분석</span>
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

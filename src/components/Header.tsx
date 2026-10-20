import { FileSpreadsheet, Menu, Moon, Sun } from 'lucide-react';

interface HeaderProps {
  isPage: boolean;
  sel: string;
  updated: string | null;
  drawerOpen: boolean;
  isDark: boolean;
  onOpenDrawer: () => void;
  onToggleTheme: () => void;
  onExportExcel?: () => void;
}

export function Header({
  isPage,
  sel,
  updated,
  drawerOpen,
  isDark,
  onOpenDrawer,
  onToggleTheme,
  onExportExcel,
}: HeaderProps) {
  const crumb = isPage
    ? '페이지 분석'
    : sel
      ? sel.length === 4
        ? `${sel}년 연간`
        : `${sel.slice(0, 4)}년 ${+sel.slice(5)}월`
      : '';

  let updText = '아직 수집된 데이터가 없습니다';
  let stale = false;
  if (updated) {
    const u = new Date(updated);
    const h = (Date.now() - u.getTime()) / 36e5;
    const s = u.toLocaleString('ko-KR', {
      timeZone: 'Asia/Seoul',
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const rel =
      h < 1 ? '방금' : h < 24 ? `${Math.round(h)}시간 전` : `${Math.round(h / 24)}일 전`;
    stale = h > 6;
    updText = `마지막 갱신 ${s} (${rel})${stale ? ' · 갱신이 지연되고 있습니다' : ''}`;
  }

  return (
    <header className="top">
      <button
        type="button"
        className="btn ic burger"
        id="burger"
        aria-label="메뉴 열기"
        aria-expanded={drawerOpen}
        aria-controls="side"
        onClick={onOpenDrawer}
      >
        <Menu size={18} aria-hidden="true" />
      </button>

      <h1>
        <span className="ttx">대시보드 </span>
        <span className="crumb" id="crumb">
          {crumb}
        </span>
      </h1>
      <span className="sp" />
      <span className={`upd ${stale ? 'stale' : ''}`} id="upd">
        {updText}
      </span>

      <div className="acts">
        <button
          type="button"
          className="tgl"
          id="theme"
          role="switch"
          aria-checked={isDark}
          aria-label={isDark ? '라이트 모드로 전환' : '다크 모드로 전환'}
          title={isDark ? '라이트 모드로 전환' : '다크 모드로 전환'}
          onClick={onToggleTheme}
        >
          <span className="tgl-icon tgl-sun" aria-hidden="true">
            <Sun size={12} strokeWidth={2.4} />
          </span>
          <span className="tgl-icon tgl-moon" aria-hidden="true">
            <Moon size={12} strokeWidth={2.4} />
          </span>
          <i className="tgl-thumb" aria-hidden="true" />
        </button>
        {onExportExcel && (
          <button
            type="button"
            className="btn btn-excel"
            id="btnExportExcel"
            title="현재 화면의 실적 데이터를 엑셀(.xlsx)로 다운로드합니다"
            onClick={onExportExcel}
          >
            <FileSpreadsheet size={15} aria-hidden="true" />
            <span>엑셀 다운로드</span>
          </button>
        )}
      </div>
    </header>
  );
}

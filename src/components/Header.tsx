interface HeaderProps {
  isPage: boolean;
  sel: string;
  updated: string | null;
  drawerOpen: boolean;
  isDark: boolean;
  onOpenDrawer: () => void;
  onToggleTheme: () => void;
}

export function Header({
  isPage,
  sel,
  updated,
  drawerOpen,
  isDark,
  onOpenDrawer,
  onToggleTheme,
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
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
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
          aria-label="다크 모드"
          title="테마 전환"
          onClick={onToggleTheme}
        >
          <span className="k">☀</span>
          <span className="k">☾</span>
          <i />
        </button>
        <button
          type="button"
          className="btn ic pr"
          title="인쇄 / PDF 저장"
          onClick={() => window.print()}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M6 9V3h12v6" />
            <rect x="6" y="14" width="12" height="7" />
            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
          </svg>
          <span>인쇄/PDF</span>
        </button>
      </div>
    </header>
  );
}

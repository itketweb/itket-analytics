import { useEffect, useState } from 'react';
import { Check, CheckSquare, Download, FileSpreadsheet, Square, X } from 'lucide-react';
import type { DashboardPayload } from '../types/analytics';
import { exportFilteredExcel, type ExportFilterOptions } from '../utils/exportExcel';
import { CustomSelect } from './CustomSelect';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: DashboardPayload;
  currentSel: string;
  keys: string[];
  years: string[];
}

export function ExportModal({
  isOpen,
  onClose,
  data,
  currentSel,
  keys,
  years,
}: ExportModalProps) {
  const latestMonth = keys[keys.length - 1] || '2026-10';
  const initialMonth = /^\d{4}-\d{2}$/.test(currentSel) ? currentSel : latestMonth;
  const initialYear = currentSel.slice(0, 4) || years[years.length - 1] || '2026';

  const [periodMode, setPeriodMode] = useState<'current' | 'month' | 'year'>('current');
  const [selectedMonth, setSelectedMonth] = useState(initialMonth);
  const [selectedYear, setSelectedYear] = useState(initialYear);
  const [isExporting, setIsExporting] = useState(false);

  const [sheets, setSheets] = useState({
    kpi: true,
    daily: true,
    conv: true,
    pages: true,
    goods: true,
  });

  useEffect(() => {
    if (isOpen) {
      if (/^\d{4}$/.test(currentSel)) {
        setPeriodMode('year');
        setSelectedYear(currentSel);
      } else {
        setPeriodMode('current');
        setSelectedMonth(currentSel);
      }
    }
  }, [isOpen, currentSel]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const toggleAll = () => {
    const allSelected = Object.values(sheets).every(Boolean);
    setSheets({
      kpi: !allSelected,
      daily: !allSelected,
      conv: !allSelected,
      pages: !allSelected,
      goods: !allSelected,
    });
  };

  const selectedCount = Object.values(sheets).filter(Boolean).length;

  const handleDownload = async () => {
    let targetPeriod = '';
    if (periodMode === 'current') {
      targetPeriod = currentSel;
    } else if (periodMode === 'month') {
      targetPeriod = selectedMonth;
    } else {
      targetPeriod = selectedYear;
    }

    const options: ExportFilterOptions = {
      period: targetPeriod,
      sheets,
    };

    try {
      setIsExporting(true);
      await exportFilteredExcel(data, options);
    } finally {
      setIsExporting(false);
      onClose();
    }
  };

  const getPeriodLabel = () => {
    if (periodMode === 'current') {
      return /^\d{4}$/.test(currentSel)
        ? `${currentSel}년 연간 누적`
        : `${currentSel.slice(0, 4)}년 ${+currentSel.slice(5)}월`;
    }
    if (periodMode === 'month') {
      return `${selectedMonth.slice(0, 4)}년 ${+selectedMonth.slice(5)}월`;
    }
    return `${selectedYear}년 연간 누적`;
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="presentation">
      <div
        className="modal-box export-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="exportModalTitle"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div className="modal-title-wrap">
            <div className="modal-icon">
              <FileSpreadsheet size={20} />
            </div>
            <div>
              <h2 id="exportModalTitle">데이터 엑셀 내보내기</h2>
              <p className="modal-sub">
                원하는 기간과 데이터 항목을 선택하여 맞춤 엑셀(.xlsx)을 다운로드합니다
              </p>
            </div>
          </div>
          <button
            type="button"
            className="btn-modal-close"
            onClick={onClose}
            aria-label="닫기"
          >
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          {/* 1. 기간 선택 */}
          <div className="modal-section">
            <label className="modal-section-label">1. 기간 선택</label>
            <div className="period-options">
              <label className={`period-card ${periodMode === 'current' ? 'active' : ''}`}>
                <input
                  type="radio"
                  name="periodMode"
                  value="current"
                  checked={periodMode === 'current'}
                  onChange={() => setPeriodMode('current')}
                />
                <div className="period-card-head">
                  <span className={`radio-dot ${periodMode === 'current' ? 'checked' : ''}`} />
                  <span className="period-title">현재 보고 있는 화면</span>
                </div>
                <div className="period-control-box period-badge-box">
                  {/^\d{4}$/.test(currentSel)
                    ? `${currentSel}년 연간`
                    : `${currentSel.slice(0, 4)}년 ${+currentSel.slice(5)}월`}
                </div>
              </label>

              <label className={`period-card ${periodMode === 'month' ? 'active' : ''}`}>
                <input
                  type="radio"
                  name="periodMode"
                  value="month"
                  checked={periodMode === 'month'}
                  onChange={() => setPeriodMode('month')}
                />
                <div className="period-card-head">
                  <span className={`radio-dot ${periodMode === 'month' ? 'checked' : ''}`} />
                  <span className="period-title">특정 월 선택</span>
                </div>
                <CustomSelect
                  className="period-control-box"
                  value={selectedMonth}
                  disabled={periodMode !== 'month'}
                  options={keys
                    .slice()
                    .reverse()
                    .map((k) => ({
                      value: k,
                      label: `${k.slice(0, 4)}년 ${+k.slice(5)}월`,
                    }))}
                  onChange={(val) => {
                    setSelectedMonth(val);
                    setPeriodMode('month');
                  }}
                />
              </label>

              <label className={`period-card ${periodMode === 'year' ? 'active' : ''}`}>
                <input
                  type="radio"
                  name="periodMode"
                  value="year"
                  checked={periodMode === 'year'}
                  onChange={() => setPeriodMode('year')}
                />
                <div className="period-card-head">
                  <span className={`radio-dot ${periodMode === 'year' ? 'checked' : ''}`} />
                  <span className="period-title">연간 전체 요약</span>
                </div>
                <CustomSelect
                  className="period-control-box"
                  value={selectedYear}
                  disabled={periodMode !== 'year'}
                  options={years
                    .slice()
                    .reverse()
                    .map((y) => ({
                      value: y,
                      label: `${y}년 전체`,
                    }))}
                  onChange={(val) => {
                    setSelectedYear(val);
                    setPeriodMode('year');
                  }}
                />
              </label>
            </div>
          </div>

          {/* 2. 데이터 시트 선택 */}
          <div className="modal-section">
            <div className="section-head-row">
              <label className="modal-section-label">2. 포함할 데이터 항목</label>
              <button
                type="button"
                className="btn-text-toggle"
                onClick={toggleAll}
              >
                {Object.values(sheets).every(Boolean) ? (
                  <>
                    <Square size={13} />
                    <span>전체 해제</span>
                  </>
                ) : (
                  <>
                    <CheckSquare size={13} />
                    <span>전체 선택</span>
                  </>
                )}
              </button>
            </div>

            <div className="sheet-checklist">
              <label className="sheet-item">
                <input
                  type="checkbox"
                  checked={sheets.kpi}
                  onChange={(e) => setSheets({ ...sheets, kpi: e.target.checked })}
                />
                <span className={`custom-checkbox ${sheets.kpi ? 'checked' : ''}`}>
                  {sheets.kpi && <Check size={12} strokeWidth={3} />}
                </span>
                <span className="sheet-info">
                  <b className="sheet-name">핵심 지표 요약</b>
                  <span className="sheet-desc">방문자, 신규 방문자, 세션, PV, 가입, 체류시간 요약</span>
                </span>
              </label>

              <label className="sheet-item">
                <input
                  type="checkbox"
                  checked={sheets.daily}
                  onChange={(e) => setSheets({ ...sheets, daily: e.target.checked })}
                />
                <span className={`custom-checkbox ${sheets.daily ? 'checked' : ''}`}>
                  {sheets.daily && <Check size={12} strokeWidth={3} />}
                </span>
                <span className="sheet-info">
                  <b className="sheet-name">일별 상세 추이</b>
                  <span className="sheet-desc">날짜별 6대 지표 1일 단위 전수 데이터</span>
                </span>
              </label>

              <label className="sheet-item">
                <input
                  type="checkbox"
                  checked={sheets.conv}
                  onChange={(e) => setSheets({ ...sheets, conv: e.target.checked })}
                />
                <span className={`custom-checkbox ${sheets.conv ? 'checked' : ''}`}>
                  {sheets.conv && <Check size={12} strokeWidth={3} />}
                </span>
                <span className="sheet-info">
                  <b className="sheet-name">유입 매체 및 전환 분석</b>
                  <span className="sheet-desc">소스별 방문수 및 견적·가입·주문 전환수/전환율</span>
                </span>
              </label>

              <label className="sheet-item">
                <input
                  type="checkbox"
                  checked={sheets.pages}
                  onChange={(e) => setSheets({ ...sheets, pages: e.target.checked })}
                />
                <span className={`custom-checkbox ${sheets.pages ? 'checked' : ''}`}>
                  {sheets.pages && <Check size={12} strokeWidth={3} />}
                </span>
                <span className="sheet-info">
                  <b className="sheet-name">인기 페이지 TOP 50</b>
                  <span className="sheet-desc">경로별 조회수, 방문자, 체류시간 및 상품명</span>
                </span>
              </label>

              <label className="sheet-item">
                <input
                  type="checkbox"
                  checked={sheets.goods}
                  onChange={(e) => setSheets({ ...sheets, goods: e.target.checked })}
                />
                <span className={`custom-checkbox ${sheets.goods ? 'checked' : ''}`}>
                  {sheets.goods && <Check size={12} strokeWidth={3} />}
                </span>
                <span className="sheet-info">
                  <b className="sheet-name">고도몰 인기 상품 TOP 50</b>
                  <span className="sheet-desc">쇼핑몰 URL 기준 상품별 조회수 및 순위</span>
                </span>
              </label>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <div className="footer-summary">
            선택된 기간: <b>{getPeriodLabel()}</b> ({selectedCount}개 시트)
          </div>
          <div className="footer-acts">
            <button
              type="button"
              className="btn btn-modal-cancel"
              onClick={onClose}
            >
              취소
            </button>
            <button
              type="button"
              className="btn pri btn-modal-download"
              disabled={selectedCount === 0 || isExporting}
              onClick={handleDownload}
            >
              <Download size={14} />
              <span>{isExporting ? '다운로드 생성 중...' : '엑셀 다운로드 (.xlsx)'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

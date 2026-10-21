import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Dropdown } from './Dropdown';

interface MonthPickerProps {
  /** 선택된 달 (YYYY-MM 또는 YYYY) */
  value: string;
  min: string;
  max: string;
  onChange: (month: string) => void;
}

const prevM = (m: string) => {
  const [y, mo] = m.split('-').map(Number);
  return mo === 1 ? `${y - 1}-12` : `${y}-${String(mo - 1).padStart(2, '0')}`;
};

const nextM = (m: string) => {
  const [y, mo] = m.split('-').map(Number);
  return mo === 12 ? `${y + 1}-01` : `${y}-${String(mo + 1).padStart(2, '0')}`;
};

const ym = (y: string | number, m: number) =>
  `${y}-${String(m).padStart(2, '0')}`;

export const MonthPicker: React.FC<MonthPickerProps> = ({
  value,
  min,
  max,
  onChange,
}) => {
  // 연간 선택인 경우 대응
  const isYearMode = /^\d{4}$/.test(value);
  const currentKey = isYearMode ? `${value}-12` : value;

  const year = currentKey.slice(0, 4);
  const month = Number(currentKey.slice(5, 7));
  const minYear = Number(min.slice(0, 4));
  const maxYear = Number(max.slice(0, 4));

  const clamp = (m: string) => (m < min ? min : m > max ? max : m);
  const prev = isYearMode ? String(Number(year) - 1) : prevM(currentKey);
  const next = isYearMode ? String(Number(year) + 1) : nextM(currentKey);
  const prevDisabled = isYearMode ? Number(year) <= minYear : prev < min;
  const nextDisabled = isYearMode ? Number(year) >= maxYear : next > max;
  const maxLabel = `${max.slice(0, 4)}년 ${Number(max.slice(5, 7))}월`;

  const yearOptions = Array.from(
    { length: maxYear - minYear + 1 },
    (_, i) => {
      const y = String(maxYear - i);
      return { value: y, label: `${y}년` };
    },
  );

  const monthOptions = [
    {
      value: 0,
      label: '연간 전체',
      disabled: false,
    },
    ...Array.from({ length: 12 }, (_, i) => {
      const key = ym(year, i + 1);
      const out = key < min || key > max;
      return {
        value: i + 1,
        label: `${i + 1}월`,
        disabled: out,
        title: out ? `${year}년 ${i + 1}월 (데이터 없음)` : undefined,
      };
    }),
  ];

  return (
    <div className="month-picker" role="group" aria-label="기준월 선택">
      <button
        type="button"
        className="mp-step"
        aria-label={isYearMode ? '이전 연도' : '이전 달'}
        title={prevDisabled ? '이전 데이터 없음' : isYearMode ? '이전 연도' : '이전 달'}
        disabled={prevDisabled}
        onClick={() => onChange(prev)}
      >
        <ChevronLeft size={16} aria-hidden="true" />
      </button>

      <div className="mp-box">
        <Dropdown
          className="mp-year"
          ariaLabel="기준 연도"
          value={year}
          options={yearOptions}
          onChange={(y) => onChange(isYearMode ? y : clamp(ym(y, month)))}
        />
        <Dropdown
          className="mp-month"
          ariaLabel="기준 월"
          value={isYearMode ? 0 : month}
          options={monthOptions}
          onChange={(m) => (m === 0 ? onChange(year) : onChange(ym(year, m)))}
        />
      </div>

      <button
        type="button"
        className="mp-step"
        aria-label={isYearMode ? '다음 연도' : '다음 달'}
        title={nextDisabled ? '다음 데이터 없음' : isYearMode ? '다음 연도' : '다음 달'}
        disabled={nextDisabled}
        onClick={() => onChange(next)}
      >
        <ChevronRight size={16} aria-hidden="true" />
      </button>

      <button
        type="button"
        className="mp-today"
        aria-label={`당월(${maxLabel})로 이동`}
        title={
          value === max
            ? `당월(${maxLabel}) 조회 중`
            : `당월(${maxLabel})로 이동`
        }
        disabled={value === max}
        onClick={() => onChange(max)}
      >
        당월
      </button>
    </div>
  );
};

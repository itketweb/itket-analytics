import { ChevronDown } from 'lucide-react';

interface YearSelectorProps {
  years: string[];
  selectedYear: string;
  isPage?: boolean;
  onSelectYear: (year: string) => void;
}

export function YearSelector({
  years,
  selectedYear,
  isPage = false,
  onSelectYear,
}: YearSelectorProps) {
  const activeYear = !isPage
    ? years.find((y) => selectedYear.startsWith(y)) || years[years.length - 1] || ''
    : '';

  return (
    <div className="year-select-wrap">
      <select
        id="yearSelect"
        className="year-select"
        value={activeYear}
        disabled={isPage}
        aria-label="연도 선택"
        onChange={(e) => onSelectYear(e.target.value)}
      >
        {years.map((y) => (
          <option key={y} value={y}>
            {y}년
          </option>
        ))}
      </select>
      <ChevronDown className="year-select-arrow" size={16} aria-hidden="true" />
    </div>
  );
}

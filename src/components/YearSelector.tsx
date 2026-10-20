import { SegmentedControl } from './SegmentedControl';

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
    ? years.find((y) => selectedYear.startsWith(y)) || ''
    : '';

  return (
    <SegmentedControl
      id="years"
      className="years"
      fullWidth
      size="md"
      ariaLabel="연도 선택"
      items={years.map((y) => [y, `${y}년`])}
      value={activeYear}
      onChange={onSelectYear}
    />
  );
}


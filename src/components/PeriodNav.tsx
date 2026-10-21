import React from 'react';
import { MonthPicker } from './MonthPicker';

interface PeriodNavProps {
  years: string[];
  selectedPeriod: string;
  minAvailableMonth?: string;
  maxAvailableMonth: string;
  onSelectPeriod: (period: string) => void;
}

export const PeriodNav: React.FC<PeriodNavProps> = ({
  years,
  selectedPeriod,
  minAvailableMonth,
  maxAvailableMonth,
  onSelectPeriod,
}) => {
  const isCurrentMonth = selectedPeriod === maxAvailableMonth;
  const minYear = [...years].sort()[0] || maxAvailableMonth.slice(0, 4);

  return (
    <div className="period-nav-bar" id="periodNav">
      <div className="period-nav-left">
        <MonthPicker
          value={selectedPeriod}
          min={minAvailableMonth || `${minYear}-01`}
          max={maxAvailableMonth}
          onChange={onSelectPeriod}
        />
      </div>

      <div className="period-nav-right">
        {isCurrentMonth ? (
          <span className="period-status-badge current">
            <span className="pdot" />
            실시간
          </span>
        ) : (
          <span className="period-status-badge past">과거 실적</span>
        )}
      </div>
    </div>
  );
};

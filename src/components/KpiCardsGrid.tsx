import { fmt } from '../utils/format';

export interface KpiItem {
  label: string;
  value: string | number;
  sub?: React.ReactNode;
  badge?: React.ReactNode;
}

export interface KpiCardsGridProps {
  items: KpiItem[];
}

export function KpiCardsGrid({ items }: KpiCardsGridProps) {
  return (
    <div className="kpis">
      {items.map((item, idx) => (
        <div key={idx} className="kpi">
          <div className="l">{item.label}</div>
          <div className="v">
            {typeof item.value === 'number' ? fmt(item.value) : item.value}
          </div>
          {item.badge}
          {item.sub}
        </div>
      ))}
    </div>
  );
}

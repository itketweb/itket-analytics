import { fmt } from '../utils/format';

export interface KpiItem {
  label: string;
  value: string | number;
  loading?: boolean;
  sub?: React.ReactNode;
  badge?: React.ReactNode;
}

export interface KpiCardsGridProps {
  items: KpiItem[];
  id?: string;
  className?: string;
  ariaLabel?: string;
}

export function KpiCardsGrid({
  items,
  id,
  className = '',
  ariaLabel = '주요 지표',
}: KpiCardsGridProps) {
  return (
    <section
      id={id}
      className={`kpis ${className}`.trim()}
      aria-label={ariaLabel}
    >
      {items.map((item, idx) => (
        <article key={item.label || idx} className="kpi">
          <div className="l kpi-label">{item.label}</div>
          <div className="v kpi-value">
            {item.loading
              ? <span className="skel" style={{ width: '3.25rem', height: '2.75rem', display: 'block', borderRadius: '4px' }} aria-hidden="true" />
              : typeof item.value === 'number' ? fmt(item.value) : item.value}
          </div>
          {item.loading
            ? <span className="skel" style={{ width: '4.5rem', height: '0.625rem', display: 'block', borderRadius: '3px', marginTop: '0.1rem' }} aria-hidden="true" />
            : item.badge}
          {!item.loading && item.sub}
        </article>
      ))}
    </section>
  );
}

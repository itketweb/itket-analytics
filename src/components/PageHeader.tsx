import type { ReactNode } from 'react';

interface PageHeaderProps {
  id?: string;
  eyebrow?: string;
  title: string;
  desc?: string;
  icon?: ReactNode;
  meta?: ReactNode;
}

export function PageHeader({
  id,
  eyebrow,
  title,
  desc,
  icon,
  meta,
}: PageHeaderProps) {
  return (
    <header className="page-header" id={id}>
      <div className="page-header-lead">
        {icon && <div className="page-header-icon">{icon}</div>}
        <div className="page-header-main">
          {eyebrow && <div className="page-header-eyebrow">{eyebrow}</div>}
          <h1 className="page-title">{title}</h1>
          {desc && <p className="page-desc">{desc}</p>}
        </div>
      </div>
      {meta && <div className="page-header-meta">{meta}</div>}
    </header>
  );
}

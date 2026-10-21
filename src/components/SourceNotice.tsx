import type { FC } from 'react';

export interface SourceLinkItem {
  label: string;
  href?: string;
}

interface SourceNoticeProps {
  sources: SourceLinkItem[];
  className?: string;
}

export const SourceNotice: FC<SourceNoticeProps> = ({ sources, className = '' }) => (
  <footer className={`sec-src ${className}`.trim()}>
    {sources.map((src, idx) =>
      src.href ? (
        <a
          key={`${src.label}-${idx}`}
          href={src.href}
          target="_blank"
          rel="noopener noreferrer"
        >
          {src.label}
        </a>
      ) : (
        <span key={`${src.label}-${idx}`}>{src.label}</span>
      ),
    )}
  </footer>
);

// 하위 호환 alias
export const SecSrc = SourceNotice;

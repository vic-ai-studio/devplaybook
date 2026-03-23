import React from 'react';

/**
 * Breadcrumb navigation component.
 * @property {BreadcrumbItem[]} items - Array of breadcrumb items
 * @property {string} [separator='/'] - Separator character between items
 * @property {number} [maxItems] - Max visible items (collapses middle items)
 * @property {(href: string) => void} [onNavigate] - Custom navigation handler (SPA support)
 */
interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ReactNode;
  current?: boolean;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  separator?: string | React.ReactNode;
  maxItems?: number;
  onNavigate?: (href: string) => void;
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({
  items,
  separator = '/',
  maxItems,
  onNavigate,
}) => {
  const [expanded, setExpanded] = React.useState(false);

  let visibleItems = items;
  const shouldCollapse = maxItems && items.length > maxItems && !expanded;

  if (shouldCollapse) {
    const start = items.slice(0, 1);
    const end = items.slice(-(maxItems - 1));
    visibleItems = [...start, { label: '...', href: undefined }, ...end];
  }

  const handleClick = (e: React.MouseEvent, item: BreadcrumbItem) => {
    if (item.label === '...') {
      e.preventDefault();
      setExpanded(true);
      return;
    }
    if (onNavigate && item.href) {
      e.preventDefault();
      onNavigate(item.href);
    }
  };

  return (
    <nav aria-label="Breadcrumb" style={styles.nav}>
      <ol style={styles.list}>
        {visibleItems.map((item, i) => {
          const isLast = i === visibleItems.length - 1;
          const isCurrent = item.current || isLast;

          return (
            <li key={`${item.label}-${i}`} style={styles.item}>
              {i > 0 && (
                <span style={styles.separator} aria-hidden="true">
                  {typeof separator === 'string' ? (
                    <span style={styles.separatorText}>{separator}</span>
                  ) : (
                    separator
                  )}
                </span>
              )}
              {item.label === '...' ? (
                <button
                  onClick={(e) => handleClick(e, item)}
                  aria-label="Show all breadcrumbs"
                  style={styles.ellipsis}
                >
                  &hellip;
                </button>
              ) : isCurrent ? (
                <span
                  aria-current="page"
                  style={styles.current}
                >
                  {item.icon && <span style={styles.icon}>{item.icon}</span>}
                  {item.label}
                </span>
              ) : (
                <a
                  href={item.href || '#'}
                  onClick={(e) => handleClick(e, item)}
                  style={styles.link}
                >
                  {item.icon && <span style={styles.icon}>{item.icon}</span>}
                  {item.label}
                </a>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

const styles: Record<string, React.CSSProperties> = {
  nav: {},
  list: {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '4px',
    listStyle: 'none',
    padding: 0,
    margin: 0,
  },
  item: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
  },
  separator: {
    display: 'inline-flex',
    alignItems: 'center',
    marginRight: '4px',
  },
  separatorText: {
    color: 'var(--text-tertiary, #9ca3af)',
    fontSize: '14px',
  },
  link: {
    color: 'var(--primary, #3b82f6)',
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: 500,
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '2px 4px',
    borderRadius: '4px',
    transition: 'color 0.15s',
  },
  current: {
    color: 'var(--text-primary, #111827)',
    fontSize: '14px',
    fontWeight: 600,
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
  },
  icon: {
    display: 'inline-flex',
    fontSize: '14px',
  },
  ellipsis: {
    background: 'var(--hover-bg, #f3f4f6)',
    border: 'none',
    borderRadius: '4px',
    padding: '2px 8px',
    fontSize: '14px',
    color: 'var(--text-secondary, #6b7280)',
    cursor: 'pointer',
    fontWeight: 600,
    letterSpacing: '1px',
  },
};

export default Breadcrumbs;

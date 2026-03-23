import React, { useMemo } from 'react';

/**
 * Pagination component with page numbers and prev/next buttons.
 * @property {number} currentPage - Active page (1-based)
 * @property {number} totalPages - Total number of pages
 * @property {(page: number) => void} onPageChange - Callback when page changes
 * @property {number} [siblingCount=1] - Number of pages shown on each side of current
 * @property {boolean} [showEdges=true] - Show first/last page buttons
 */
interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  siblingCount?: number;
  showEdges?: boolean;
}

function range(start: number, end: number): number[] {
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  siblingCount = 1,
  showEdges = true,
}) => {
  const pages = useMemo(() => {
    const totalNumbers = siblingCount * 2 + 3; // siblings + current + 2 edges
    if (totalPages <= totalNumbers + 2) return range(1, totalPages);

    const leftSibling = Math.max(currentPage - siblingCount, 1);
    const rightSibling = Math.min(currentPage + siblingCount, totalPages);
    const showLeftDots = leftSibling > 2;
    const showRightDots = rightSibling < totalPages - 1;

    const items: (number | string)[] = [];
    if (showEdges) items.push(1);
    if (showLeftDots) items.push('left-dots');
    items.push(...range(
      showLeftDots ? leftSibling : 2,
      showRightDots ? rightSibling : totalPages - 1
    ));
    if (showRightDots) items.push('right-dots');
    if (showEdges && totalPages > 1) items.push(totalPages);
    return items;
  }, [currentPage, totalPages, siblingCount, showEdges]);

  if (totalPages <= 1) return null;

  return (
    <nav aria-label="Pagination" style={styles.nav}>
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1}
        aria-label="Previous page"
        style={{
          ...styles.btn,
          ...(currentPage <= 1 ? styles.disabled : {}),
        }}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M10 4L6 8L10 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {pages.map((page, i) => {
        if (typeof page === 'string') {
          return (
            <span key={page} style={styles.dots} aria-hidden="true">
              ...
            </span>
          );
        }
        const isActive = page === currentPage;
        return (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            aria-current={isActive ? 'page' : undefined}
            aria-label={`Page ${page}`}
            style={{
              ...styles.btn,
              ...(isActive ? styles.active : {}),
            }}
          >
            {page}
          </button>
        );
      })}

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages}
        aria-label="Next page"
        style={{
          ...styles.btn,
          ...(currentPage >= totalPages ? styles.disabled : {}),
        }}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
    </nav>
  );
};

const styles: Record<string, React.CSSProperties> = {
  nav: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    flexWrap: 'wrap',
  },
  btn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '36px',
    height: '36px',
    padding: '0 8px',
    border: '1px solid var(--border-color, #e5e7eb)',
    borderRadius: '8px',
    background: 'var(--btn-bg, #fff)',
    color: 'var(--text-primary, #374151)',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.15s',
    outline: 'none',
  },
  active: {
    background: 'var(--primary, #3b82f6)',
    color: '#fff',
    borderColor: 'var(--primary, #3b82f6)',
  },
  disabled: {
    opacity: 0.4,
    cursor: 'not-allowed',
  },
  dots: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '36px',
    height: '36px',
    color: 'var(--text-tertiary, #9ca3af)',
    fontSize: '14px',
  },
};

export default Pagination;

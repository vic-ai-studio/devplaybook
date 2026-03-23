import React, { useState, useMemo } from 'react';

/**
 * A sortable, searchable data table with column definitions.
 * @property {Column<T>[]} columns - Column configuration array
 * @property {T[]} data - Row data array
 * @property {(keyof T)} [rowKey] - Unique key field for rows
 * @property {boolean} [sortable=true] - Enable column sorting
 * @property {boolean} [searchable=false] - Show search input
 * @property {string} [emptyMessage='No data'] - Shown when table is empty
 * @property {(row: T) => void} [onRowClick] - Row click handler
 */
interface Column<T> {
  key: keyof T & string;
  title: string;
  sortable?: boolean;
  width?: string;
  render?: (value: T[keyof T], row: T) => React.ReactNode;
}

interface DataTableProps<T extends Record<string, any>> {
  columns: Column<T>[];
  data: T[];
  rowKey?: keyof T & string;
  sortable?: boolean;
  searchable?: boolean;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
}

type SortDir = 'asc' | 'desc' | null;

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  rowKey,
  sortable = true,
  searchable = false,
  emptyMessage = 'No data',
  onRowClick,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);
  const [search, setSearch] = useState('');

  const handleSort = (key: string) => {
    if (!sortable) return;
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : sortDir === 'desc' ? null : 'asc');
      if (sortDir === 'desc') setSortKey(null);
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const processed = useMemo(() => {
    let rows = [...data];
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter((row) =>
        columns.some((col) => String(row[col.key]).toLowerCase().includes(q))
      );
    }
    if (sortKey && sortDir) {
      rows.sort((a, b) => {
        const av = a[sortKey], bv = b[sortKey];
        const cmp = av < bv ? -1 : av > bv ? 1 : 0;
        return sortDir === 'asc' ? cmp : -cmp;
      });
    }
    return rows;
  }, [data, columns, search, sortKey, sortDir]);

  const sortIcon = (key: string) => {
    if (sortKey !== key || !sortDir) return ' \u2195';
    return sortDir === 'asc' ? ' \u2191' : ' \u2193';
  };

  return (
    <div style={styles.wrapper}>
      {searchable && (
        <div style={styles.searchBar}>
          <input
            type="search"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search table"
            style={styles.searchInput}
          />
        </div>
      )}
      <div style={styles.tableContainer}>
        <table style={styles.table} role="grid">
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  style={{ ...styles.th, width: col.width }}
                  onClick={() => (col.sortable !== false && sortable) ? handleSort(col.key) : undefined}
                  aria-sort={sortKey === col.key ? (sortDir === 'asc' ? 'ascending' : 'descending') : undefined}
                  role="columnheader"
                >
                  {col.title}
                  {sortable && col.sortable !== false && (
                    <span style={styles.sortIcon}>{sortIcon(col.key)}</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {processed.length === 0 ? (
              <tr>
                <td colSpan={columns.length} style={styles.empty}>
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              processed.map((row, i) => (
                <tr
                  key={rowKey ? String(row[rowKey]) : i}
                  onClick={() => onRowClick?.(row)}
                  style={{
                    ...styles.tr,
                    cursor: onRowClick ? 'pointer' : 'default',
                  }}
                  tabIndex={onRowClick ? 0 : undefined}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && onRowClick) onRowClick(row);
                  }}
                >
                  {columns.map((col) => (
                    <td key={col.key} style={styles.td}>
                      {col.render ? col.render(row[col.key], row) : String(row[col.key] ?? '')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: { width: '100%' },
  searchBar: { marginBottom: '12px' },
  searchInput: {
    width: '100%', maxWidth: '320px', padding: '8px 14px', border: '1px solid var(--border-color, #d1d5db)',
    borderRadius: '8px', fontSize: '14px', outline: 'none', background: 'var(--input-bg, #fff)',
  },
  tableContainer: { overflowX: 'auto', borderRadius: '8px', border: '1px solid var(--border-color, #e5e7eb)' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '14px' },
  th: {
    textAlign: 'left', padding: '12px 16px', fontWeight: 600, fontSize: '12px',
    textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary, #6b7280)',
    background: 'var(--table-header-bg, #f9fafb)', borderBottom: '1px solid var(--border-color, #e5e7eb)',
    cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap',
  },
  sortIcon: { fontSize: '12px', marginLeft: '4px', opacity: 0.6 },
  tr: { borderBottom: '1px solid var(--border-color, #f3f4f6)', transition: 'background 0.1s' },
  td: { padding: '12px 16px', color: 'var(--text-primary, #111827)' },
  empty: { padding: '40px 16px', textAlign: 'center', color: 'var(--text-tertiary, #9ca3af)' },
};

export default DataTable;

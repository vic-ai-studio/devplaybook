import React, { useState, useRef, useEffect, useCallback } from 'react';

/**
 * Search input with debounced onChange, loading state, and clear button.
 * @property {(value: string) => void} onSearch - Debounced search callback
 * @property {string} [placeholder='Search...'] - Input placeholder
 * @property {number} [debounceMs=300] - Debounce delay in milliseconds
 * @property {boolean} [loading=false] - Show loading spinner
 * @property {boolean} [autoFocus=false] - Auto-focus on mount
 * @property {string} [value] - Controlled input value
 */
interface SearchInputProps {
  onSearch: (value: string) => void;
  placeholder?: string;
  debounceMs?: number;
  loading?: boolean;
  autoFocus?: boolean;
  value?: string;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  onSearch,
  placeholder = 'Search...',
  debounceMs = 300,
  loading = false,
  autoFocus = false,
  value: controlledValue,
}) => {
  const [internal, setInternal] = useState(controlledValue ?? '');
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const val = controlledValue ?? internal;

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = e.target.value;
      setInternal(v);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => onSearch(v), debounceMs);
    },
    [onSearch, debounceMs]
  );

  const clear = () => {
    setInternal('');
    onSearch('');
    inputRef.current?.focus();
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <div style={styles.container}>
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        style={styles.searchIcon}
        aria-hidden="true"
      >
        <circle cx="7" cy="7" r="5" stroke="#9ca3af" strokeWidth="2" />
        <path d="M11 11L14 14" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <input
        ref={inputRef}
        type="search"
        role="searchbox"
        aria-label={placeholder}
        placeholder={placeholder}
        value={val}
        onChange={handleChange}
        style={styles.input}
      />
      {loading && (
        <div style={styles.spinner} aria-label="Loading">
          <svg width="16" height="16" viewBox="0 0 16 16" style={{ animation: 'spin 0.8s linear infinite' }}>
            <circle cx="8" cy="8" r="6" stroke="#d1d5db" strokeWidth="2" fill="none" />
            <path d="M8 2A6 6 0 0 1 14 8" stroke="#3b82f6" strokeWidth="2" fill="none" strokeLinecap="round" />
          </svg>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}
      {val && !loading && (
        <button
          onClick={clear}
          aria-label="Clear search"
          style={styles.clearBtn}
        >
          &#x2715;
        </button>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    width: '100%',
  },
  searchIcon: {
    position: 'absolute',
    left: '12px',
    pointerEvents: 'none',
  },
  input: {
    width: '100%',
    padding: '10px 36px 10px 36px',
    border: '1px solid var(--border-color, #d1d5db)',
    borderRadius: '10px',
    fontSize: '14px',
    outline: 'none',
    background: 'var(--input-bg, #fff)',
    color: 'var(--text-primary, #111827)',
    transition: 'border-color 0.15s, box-shadow 0.15s',
  },
  clearBtn: {
    position: 'absolute',
    right: '10px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#9ca3af',
    fontSize: '14px',
    padding: '4px',
    display: 'flex',
    alignItems: 'center',
  },
  spinner: {
    position: 'absolute',
    right: '10px',
    display: 'flex',
    alignItems: 'center',
  },
};

export default SearchInput;

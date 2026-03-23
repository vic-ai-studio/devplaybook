import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';

/**
 * Command palette (Cmd+K) with search, keyboard navigation, and grouping.
 * @property {boolean} isOpen - Whether the palette is visible
 * @property {() => void} onClose - Callback to close the palette
 * @property {CommandItem[]} items - Available commands
 * @property {string} [placeholder='Type a command or search...'] - Input placeholder
 * @property {(item: CommandItem) => void} [onSelect] - Callback when an item is selected
 */
interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  shortcut?: string;
  group?: string;
  action?: () => void;
  disabled?: boolean;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  items: CommandItem[];
  placeholder?: string;
  onSelect?: (item: CommandItem) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  items,
  placeholder = 'Type a command or search...',
  onSelect,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    if (!query) return items.filter((i) => !i.disabled);
    const q = query.toLowerCase();
    return items.filter(
      (i) =>
        !i.disabled &&
        (i.label.toLowerCase().includes(q) ||
          i.description?.toLowerCase().includes(q) ||
          i.group?.toLowerCase().includes(q))
    );
  }, [items, query]);

  const grouped = useMemo(() => {
    const groups = new Map<string, CommandItem[]>();
    for (const item of filtered) {
      const g = item.group || '';
      if (!groups.has(g)) groups.set(g, []);
      groups.get(g)!.push(item);
    }
    return groups;
  }, [filtered]);

  const flatList = useMemo(() => filtered, [filtered]);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
      document.body.style.overflow = 'hidden';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const selectItem = useCallback(
    (item: CommandItem) => {
      item.action?.();
      onSelect?.(item);
      onClose();
    },
    [onSelect, onClose]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, flatList.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (flatList[selectedIndex]) selectItem(flatList[selectedIndex]);
        break;
      case 'Escape':
        onClose();
        break;
    }
  };

  // Scroll selected item into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-index="${selectedIndex}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  if (!isOpen) return null;

  let flatIdx = 0;

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div
        style={styles.container}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
      >
        <div style={styles.inputWrapper}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={styles.searchIcon}>
            <circle cx="8" cy="8" r="5.5" stroke="#9ca3af" strokeWidth="2" />
            <path d="M12.5 12.5L16 16" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            style={styles.input}
            role="combobox"
            aria-expanded={true}
            aria-autocomplete="list"
          />
          <kbd style={styles.kbd}>ESC</kbd>
        </div>

        <div ref={listRef} style={styles.list} role="listbox">
          {flatList.length === 0 ? (
            <div style={styles.empty}>No results found</div>
          ) : (
            Array.from(grouped.entries()).map(([group, groupItems]) => (
              <div key={group}>
                {group && <div style={styles.groupTitle}>{group}</div>}
                {groupItems.map((item) => {
                  const idx = flatIdx++;
                  const isSelected = idx === selectedIndex;
                  return (
                    <div
                      key={item.id}
                      data-index={idx}
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => selectItem(item)}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      style={{
                        ...styles.item,
                        ...(isSelected ? styles.itemSelected : {}),
                      }}
                    >
                      {item.icon && <span style={styles.itemIcon}>{item.icon}</span>}
                      <div style={styles.itemText}>
                        <span style={styles.itemLabel}>{item.label}</span>
                        {item.description && (
                          <span style={styles.itemDesc}>{item.description}</span>
                        )}
                      </div>
                      {item.shortcut && <kbd style={styles.shortcut}>{item.shortcut}</kbd>}
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>

        <div style={styles.footer}>
          <span style={styles.footerHint}>
            <kbd style={styles.footerKbd}>&uarr;&darr;</kbd> navigate
          </span>
          <span style={styles.footerHint}>
            <kbd style={styles.footerKbd}>&crarr;</kbd> select
          </span>
          <span style={styles.footerHint}>
            <kbd style={styles.footerKbd}>esc</kbd> close
          </span>
        </div>
      </div>
    </div>
  );
};

/**
 * Hook to toggle command palette with Cmd+K / Ctrl+K.
 */
export function useCommandPalette() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((v) => !v);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  return { isOpen, open: () => setIsOpen(true), close: () => setIsOpen(false) };
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
    display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
    paddingTop: '15vh', zIndex: 10000,
  },
  container: {
    width: '90%', maxWidth: '560px', background: 'var(--modal-bg, #fff)',
    borderRadius: '14px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
    overflow: 'hidden', animation: 'slideUp 0.15s ease',
  },
  inputWrapper: {
    display: 'flex', alignItems: 'center', padding: '12px 16px',
    borderBottom: '1px solid var(--border-color, #e5e7eb)', gap: '10px',
  },
  searchIcon: { flexShrink: 0 },
  input: {
    flex: 1, border: 'none', outline: 'none', fontSize: '16px',
    background: 'transparent', color: 'var(--text-primary, #111827)',
  },
  kbd: {
    padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: 600,
    background: 'var(--hover-bg, #f3f4f6)', color: 'var(--text-tertiary, #9ca3af)',
    border: '1px solid var(--border-color, #e5e7eb)',
  },
  list: { maxHeight: '340px', overflowY: 'auto', padding: '8px' },
  empty: {
    padding: '32px', textAlign: 'center', fontSize: '14px',
    color: 'var(--text-tertiary, #9ca3af)',
  },
  groupTitle: {
    padding: '8px 12px 4px', fontSize: '11px', fontWeight: 600,
    textTransform: 'uppercase', letterSpacing: '0.05em',
    color: 'var(--text-tertiary, #9ca3af)',
  },
  item: {
    display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px',
    borderRadius: '8px', cursor: 'pointer', transition: 'background 0.1s',
  },
  itemSelected: { background: 'var(--hover-bg, #f3f4f6)' },
  itemIcon: { fontSize: '18px', flexShrink: 0, display: 'flex' },
  itemText: { flex: 1, display: 'flex', flexDirection: 'column' as const, gap: '2px' },
  itemLabel: { fontSize: '14px', fontWeight: 500, color: 'var(--text-primary, #111827)' },
  itemDesc: { fontSize: '12px', color: 'var(--text-tertiary, #9ca3af)' },
  shortcut: {
    padding: '2px 6px', borderRadius: '4px', fontSize: '11px',
    background: 'var(--hover-bg, #f3f4f6)', color: 'var(--text-tertiary, #9ca3af)',
    border: '1px solid var(--border-color, #e5e7eb)',
  },
  footer: {
    display: 'flex', gap: '16px', padding: '10px 16px',
    borderTop: '1px solid var(--border-color, #e5e7eb)',
    background: 'var(--table-header-bg, #f9fafb)',
  },
  footerHint: {
    fontSize: '12px', color: 'var(--text-tertiary, #9ca3af)',
    display: 'flex', alignItems: 'center', gap: '4px',
  },
  footerKbd: {
    padding: '1px 4px', borderRadius: '3px', fontSize: '10px',
    background: 'var(--hover-bg, #e5e7eb)', fontWeight: 600,
  },
};

export default CommandPalette;

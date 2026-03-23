import React, { useState, useRef, useEffect, useCallback } from 'react';

/**
 * Props for the Dropdown component.
 * @property {DropdownOption[]} options - List of selectable options
 * @property {string} [value] - Currently selected value
 * @property {(value: string) => void} onChange - Callback when selection changes
 * @property {string} [placeholder='Select...'] - Placeholder when no value selected
 * @property {boolean} [disabled=false] - Whether the dropdown is disabled
 * @property {string} [label] - Accessible label for the dropdown
 */
interface DropdownOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface DropdownProps {
  options: DropdownOption[];
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  label?: string;
}

export const Dropdown: React.FC<DropdownProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  disabled = false,
  label,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selectedOption = options.find((o) => o.value === value);

  const close = useCallback(() => {
    setIsOpen(false);
    setHighlightedIndex(-1);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        close();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [close]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    const enabledOptions = options.filter((o) => !o.disabled);
    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else if (highlightedIndex >= 0) {
          onChange(enabledOptions[highlightedIndex].value);
          close();
        }
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (!isOpen) { setIsOpen(true); break; }
        setHighlightedIndex((i) => Math.min(i + 1, enabledOptions.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((i) => Math.max(i - 1, 0));
        break;
      case 'Escape':
        close();
        break;
    }
  };

  const selectOption = (opt: DropdownOption) => {
    if (opt.disabled) return;
    onChange(opt.value);
    close();
  };

  return (
    <div ref={containerRef} style={styles.container}>
      {label && <label style={styles.label}>{label}</label>}
      <button
        type="button"
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={label || placeholder}
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        style={{
          ...styles.trigger,
          ...(disabled ? styles.disabled : {}),
          ...(isOpen ? styles.triggerOpen : {}),
        }}
      >
        <span style={selectedOption ? styles.selectedText : styles.placeholderText}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{
          transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s',
        }}>
          <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      {isOpen && (
        <ul ref={listRef} role="listbox" style={styles.menu}>
          {options.map((opt, i) => (
            <li
              key={opt.value}
              role="option"
              aria-selected={opt.value === value}
              aria-disabled={opt.disabled}
              onClick={() => selectOption(opt)}
              onMouseEnter={() => !opt.disabled && setHighlightedIndex(i)}
              style={{
                ...styles.option,
                ...(opt.value === value ? styles.optionSelected : {}),
                ...(i === highlightedIndex ? styles.optionHighlighted : {}),
                ...(opt.disabled ? styles.optionDisabled : {}),
              }}
            >
              {opt.label}
              {opt.value === value && (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M2 7L5.5 10.5L12 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: { position: 'relative', width: '100%' },
  label: { display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 500, color: 'var(--text-primary, #374151)' },
  trigger: {
    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '10px 14px', background: 'var(--input-bg, #fff)', border: '1px solid var(--border-color, #d1d5db)',
    borderRadius: '8px', fontSize: '14px', cursor: 'pointer', outline: 'none',
    transition: 'border-color 0.15s, box-shadow 0.15s',
  },
  triggerOpen: { borderColor: 'var(--primary, #3b82f6)', boxShadow: '0 0 0 3px rgba(59,130,246,0.15)' },
  disabled: { opacity: 0.5, cursor: 'not-allowed' },
  selectedText: { color: 'var(--text-primary, #111827)' },
  placeholderText: { color: 'var(--text-tertiary, #9ca3af)' },
  menu: {
    position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '4px', padding: '4px',
    background: 'var(--dropdown-bg, #fff)', border: '1px solid var(--border-color, #e5e7eb)',
    borderRadius: '8px', boxShadow: '0 10px 25px rgba(0,0,0,0.12)', listStyle: 'none',
    zIndex: 50, maxHeight: '240px', overflowY: 'auto',
  },
  option: {
    padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '14px',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    color: 'var(--text-primary, #111827)', transition: 'background 0.1s',
  },
  optionSelected: { fontWeight: 600, color: 'var(--primary, #3b82f6)' },
  optionHighlighted: { background: 'var(--hover-bg, #f3f4f6)' },
  optionDisabled: { opacity: 0.4, cursor: 'not-allowed' },
};

export default Dropdown;

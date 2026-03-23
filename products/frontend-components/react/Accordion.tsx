import React, { useState } from 'react';

/**
 * Collapsible accordion component supporting single or multiple open items.
 * @property {AccordionItem[]} items - Array of accordion sections
 * @property {boolean} [multiple=false] - Allow multiple items open simultaneously
 * @property {string[]} [defaultOpen] - Initially open item values
 */
interface AccordionItem {
  value: string;
  title: string;
  content: React.ReactNode;
  disabled?: boolean;
}

interface AccordionProps {
  items: AccordionItem[];
  multiple?: boolean;
  defaultOpen?: string[];
}

export const Accordion: React.FC<AccordionProps> = ({
  items,
  multiple = false,
  defaultOpen = [],
}) => {
  const [openItems, setOpenItems] = useState<Set<string>>(new Set(defaultOpen));

  const toggle = (value: string) => {
    setOpenItems((prev) => {
      const next = new Set(multiple ? prev : []);
      if (prev.has(value)) {
        next.delete(value);
      } else {
        next.add(value);
      }
      return next;
    });
  };

  return (
    <div style={styles.container} role="region">
      {items.map((item, idx) => {
        const isOpen = openItems.has(item.value);
        return (
          <div
            key={item.value}
            style={{
              ...styles.item,
              borderTop: idx === 0 ? 'none' : styles.item.borderTop,
            }}
          >
            <button
              id={`accordion-btn-${item.value}`}
              aria-expanded={isOpen}
              aria-controls={`accordion-panel-${item.value}`}
              disabled={item.disabled}
              onClick={() => toggle(item.value)}
              style={{
                ...styles.trigger,
                ...(item.disabled ? styles.disabled : {}),
              }}
            >
              <span style={styles.titleText}>{item.title}</span>
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                style={{
                  transform: isOpen ? 'rotate(180deg)' : 'rotate(0)',
                  transition: 'transform 0.2s ease',
                  flexShrink: 0,
                }}
              >
                <path
                  d="M4 6L8 10L12 6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <div
              id={`accordion-panel-${item.value}`}
              role="region"
              aria-labelledby={`accordion-btn-${item.value}`}
              style={{
                ...styles.panel,
                maxHeight: isOpen ? '1000px' : '0',
                opacity: isOpen ? 1 : 0,
                padding: isOpen ? '0 16px 16px' : '0 16px',
              }}
            >
              {item.content}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100%',
    border: '1px solid var(--border-color, #e5e7eb)',
    borderRadius: '10px',
    overflow: 'hidden',
  },
  item: {
    borderTop: '1px solid var(--border-color, #e5e7eb)',
  },
  trigger: {
    width: '100%',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px 16px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '15px',
    fontWeight: 500,
    color: 'var(--text-primary, #111827)',
    textAlign: 'left',
    outline: 'none',
    transition: 'background 0.1s',
  },
  titleText: {
    flex: 1,
    marginRight: '12px',
  },
  disabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  panel: {
    overflow: 'hidden',
    transition: 'max-height 0.25s ease, opacity 0.2s ease, padding 0.25s ease',
    fontSize: '14px',
    lineHeight: 1.6,
    color: 'var(--text-secondary, #4b5563)',
  },
};

export default Accordion;

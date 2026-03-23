import React, { useState, useRef } from 'react';

/**
 * Accessible tabbed interface with keyboard navigation.
 * @property {TabItem[]} tabs - Array of tab definitions
 * @property {string} [defaultTab] - Initially active tab value
 * @property {string} [activeTab] - Controlled active tab value
 * @property {(value: string) => void} [onChange] - Callback when tab changes
 * @property {'line' | 'pill'} [variant='line'] - Visual style
 */
interface TabItem {
  value: string;
  label: string;
  content: React.ReactNode;
  disabled?: boolean;
  icon?: React.ReactNode;
}

interface TabsProps {
  tabs: TabItem[];
  defaultTab?: string;
  activeTab?: string;
  onChange?: (value: string) => void;
  variant?: 'line' | 'pill';
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  defaultTab,
  activeTab: controlledTab,
  onChange,
  variant = 'line',
}) => {
  const [internalTab, setInternalTab] = useState(defaultTab || tabs[0]?.value || '');
  const tabRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  const active = controlledTab ?? internalTab;

  const setActive = (val: string) => {
    if (!controlledTab) setInternalTab(val);
    onChange?.(val);
  };

  const enabledTabs = tabs.filter((t) => !t.disabled);

  const handleKeyDown = (e: React.KeyboardEvent, idx: number) => {
    let nextIdx = idx;
    if (e.key === 'ArrowRight') {
      nextIdx = (idx + 1) % enabledTabs.length;
    } else if (e.key === 'ArrowLeft') {
      nextIdx = (idx - 1 + enabledTabs.length) % enabledTabs.length;
    } else if (e.key === 'Home') {
      nextIdx = 0;
    } else if (e.key === 'End') {
      nextIdx = enabledTabs.length - 1;
    } else {
      return;
    }
    e.preventDefault();
    const next = enabledTabs[nextIdx];
    setActive(next.value);
    tabRefs.current.get(next.value)?.focus();
  };

  const activeContent = tabs.find((t) => t.value === active)?.content;
  const isPill = variant === 'pill';

  return (
    <div style={styles.container}>
      <div
        role="tablist"
        aria-orientation="horizontal"
        style={isPill ? styles.tablistPill : styles.tablistLine}
      >
        {tabs.map((tab, i) => {
          const isActive = tab.value === active;
          const enabledIdx = enabledTabs.indexOf(tab);
          return (
            <button
              key={tab.value}
              ref={(el) => { if (el) tabRefs.current.set(tab.value, el); }}
              role="tab"
              id={`tab-${tab.value}`}
              aria-selected={isActive}
              aria-controls={`panel-${tab.value}`}
              tabIndex={isActive ? 0 : -1}
              disabled={tab.disabled}
              onClick={() => setActive(tab.value)}
              onKeyDown={(e) => handleKeyDown(e, enabledIdx)}
              style={{
                ...(isPill ? styles.tabPill : styles.tabLine),
                ...(isActive ? (isPill ? styles.tabPillActive : styles.tabLineActive) : {}),
                ...(tab.disabled ? styles.tabDisabled : {}),
              }}
            >
              {tab.icon && <span style={styles.icon}>{tab.icon}</span>}
              {tab.label}
            </button>
          );
        })}
      </div>
      <div
        role="tabpanel"
        id={`panel-${active}`}
        aria-labelledby={`tab-${active}`}
        tabIndex={0}
        style={styles.panel}
      >
        {activeContent}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: { width: '100%' },
  tablistLine: {
    display: 'flex', gap: '0', borderBottom: '2px solid var(--border-color, #e5e7eb)',
  },
  tablistPill: {
    display: 'inline-flex', gap: '4px', padding: '4px',
    background: 'var(--tab-pill-bg, #f3f4f6)', borderRadius: '10px',
  },
  tabLine: {
    padding: '10px 16px', border: 'none', borderBottom: '2px solid transparent',
    marginBottom: '-2px', background: 'none', fontSize: '14px', fontWeight: 500,
    color: 'var(--text-secondary, #6b7280)', cursor: 'pointer', transition: 'all 0.15s',
    display: 'flex', alignItems: 'center', gap: '6px', outline: 'none',
  },
  tabLineActive: {
    color: 'var(--primary, #3b82f6)', borderBottomColor: 'var(--primary, #3b82f6)',
  },
  tabPill: {
    padding: '8px 16px', border: 'none', borderRadius: '8px', background: 'transparent',
    fontSize: '14px', fontWeight: 500, color: 'var(--text-secondary, #6b7280)',
    cursor: 'pointer', transition: 'all 0.15s', display: 'flex', alignItems: 'center',
    gap: '6px', outline: 'none',
  },
  tabPillActive: {
    background: 'var(--tab-active-bg, #fff)', color: 'var(--text-primary, #111827)',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
  },
  tabDisabled: { opacity: 0.4, cursor: 'not-allowed' },
  icon: { display: 'inline-flex', fontSize: '16px' },
  panel: { padding: '16px 0' },
};

export default Tabs;

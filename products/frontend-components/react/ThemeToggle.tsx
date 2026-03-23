import React, { useState, useEffect, useCallback } from 'react';

/**
 * Dark/light theme toggle with system preference detection.
 * @property {'light' | 'dark' | 'system'} [defaultTheme='system'] - Initial theme
 * @property {(theme: 'light' | 'dark') => void} [onChange] - Callback with resolved theme
 * @property {'icon' | 'switch' | 'dropdown'} [variant='icon'] - Toggle style
 * @property {string} [storageKey='theme'] - localStorage key for persistence
 */
interface ThemeToggleProps {
  defaultTheme?: 'light' | 'dark' | 'system';
  onChange?: (theme: 'light' | 'dark') => void;
  variant?: 'icon' | 'switch' | 'dropdown';
  storageKey?: string;
}

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function resolveTheme(theme: 'light' | 'dark' | 'system'): 'light' | 'dark' {
  return theme === 'system' ? getSystemTheme() : theme;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  defaultTheme = 'system',
  onChange,
  variant = 'icon',
  storageKey = 'theme',
}) => {
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(storageKey);
      if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
    }
    return defaultTheme;
  });

  const resolved = resolveTheme(theme);

  const applyTheme = useCallback(
    (t: 'light' | 'dark') => {
      document.documentElement.setAttribute('data-theme', t);
      document.documentElement.classList.toggle('dark', t === 'dark');
      onChange?.(t);
    },
    [onChange]
  );

  useEffect(() => {
    applyTheme(resolved);
    localStorage.setItem(storageKey, theme);
  }, [theme, resolved, applyTheme, storageKey]);

  useEffect(() => {
    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => applyTheme(getSystemTheme());
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme, applyTheme]);

  const toggle = () => {
    setTheme(resolved === 'light' ? 'dark' : 'light');
  };

  const SunIcon = () => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="10" r="4" stroke="currentColor" strokeWidth="2" />
      <path d="M10 2V4M10 16V18M18 10H16M4 10H2M15.6 4.4L14.2 5.8M5.8 14.2L4.4 15.6M15.6 15.6L14.2 14.2M5.8 5.8L4.4 4.4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );

  const MoonIcon = () => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M17 11.4A7 7 0 0 1 8.6 3 7 7 0 1 0 17 11.4Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );

  if (variant === 'switch') {
    return (
      <button
        onClick={toggle}
        role="switch"
        aria-checked={resolved === 'dark'}
        aria-label={`Switch to ${resolved === 'light' ? 'dark' : 'light'} mode`}
        style={styles.switch}
      >
        <span style={{ ...styles.switchTrack, background: resolved === 'dark' ? '#3b82f6' : '#d1d5db' }}>
          <span
            style={{
              ...styles.switchThumb,
              transform: resolved === 'dark' ? 'translateX(22px)' : 'translateX(2px)',
            }}
          >
            {resolved === 'dark' ? <MoonIcon /> : <SunIcon />}
          </span>
        </span>
      </button>
    );
  }

  if (variant === 'dropdown') {
    return (
      <div style={styles.dropdownGroup}>
        {(['light', 'dark', 'system'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTheme(t)}
            aria-pressed={theme === t}
            style={{
              ...styles.dropdownBtn,
              ...(theme === t ? styles.dropdownActive : {}),
            }}
          >
            {t === 'light' ? <SunIcon /> : t === 'dark' ? <MoonIcon /> : '\u{1F4BB}'}
            <span style={{ marginLeft: '6px', textTransform: 'capitalize' }}>{t}</span>
          </button>
        ))}
      </div>
    );
  }

  // Default: icon variant
  return (
    <button
      onClick={toggle}
      aria-label={`Switch to ${resolved === 'light' ? 'dark' : 'light'} mode`}
      style={styles.iconBtn}
    >
      {resolved === 'light' ? <MoonIcon /> : <SunIcon />}
    </button>
  );
};

const styles: Record<string, React.CSSProperties> = {
  iconBtn: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    width: '40px', height: '40px', borderRadius: '10px',
    border: '1px solid var(--border-color, #e5e7eb)',
    background: 'var(--btn-bg, #fff)', color: 'var(--text-primary, #374151)',
    cursor: 'pointer', transition: 'all 0.15s', outline: 'none',
  },
  switch: {
    background: 'none', border: 'none', cursor: 'pointer', padding: 0, outline: 'none',
  },
  switchTrack: {
    display: 'flex', alignItems: 'center', width: '52px', height: '28px',
    borderRadius: '14px', transition: 'background 0.2s', position: 'relative' as const,
  },
  switchThumb: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: '24px', height: '24px', borderRadius: '50%', background: '#fff',
    boxShadow: '0 1px 3px rgba(0,0,0,0.2)', transition: 'transform 0.2s',
    color: '#374151',
  },
  dropdownGroup: {
    display: 'inline-flex', gap: '4px', padding: '4px',
    background: 'var(--tab-pill-bg, #f3f4f6)', borderRadius: '10px',
  },
  dropdownBtn: {
    display: 'inline-flex', alignItems: 'center', padding: '6px 12px',
    borderRadius: '8px', border: 'none', background: 'transparent',
    fontSize: '13px', cursor: 'pointer', color: 'var(--text-secondary, #6b7280)',
    transition: 'all 0.15s', outline: 'none',
  },
  dropdownActive: {
    background: 'var(--btn-bg, #fff)', color: 'var(--text-primary, #111827)',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
  },
};

export default ThemeToggle;

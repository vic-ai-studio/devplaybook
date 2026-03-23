import React, { useState, useCallback } from 'react';

/**
 * Button that copies text to clipboard with visual feedback.
 * @property {string} text - The text to copy to clipboard
 * @property {string} [label='Copy'] - Button label
 * @property {string} [successLabel='Copied!'] - Label shown after successful copy
 * @property {number} [resetMs=2000] - Time before resetting to default label
 * @property {'button' | 'icon' | 'minimal'} [variant='button'] - Visual style
 * @property {string} [className] - Additional CSS class
 */
interface CopyButtonProps {
  text: string;
  label?: string;
  successLabel?: string;
  resetMs?: number;
  variant?: 'button' | 'icon' | 'minimal';
}

export const CopyButton: React.FC<CopyButtonProps> = ({
  text,
  label = 'Copy',
  successLabel = 'Copied!',
  resetMs = 2000,
  variant = 'button',
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), resetMs);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), resetMs);
    }
  }, [text, resetMs]);

  const CopyIcon = () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="5" y="5" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3 11V3.5C3 3.22386 3.22386 3 3.5 3H11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );

  const CheckIcon = () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M3 8L6.5 11.5L13 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );

  if (variant === 'icon') {
    return (
      <button
        onClick={handleCopy}
        aria-label={copied ? successLabel : label}
        title={copied ? successLabel : label}
        style={{
          ...styles.iconBtn,
          color: copied ? '#22c55e' : 'var(--text-secondary, #6b7280)',
        }}
      >
        {copied ? <CheckIcon /> : <CopyIcon />}
      </button>
    );
  }

  if (variant === 'minimal') {
    return (
      <button
        onClick={handleCopy}
        aria-label={copied ? successLabel : label}
        style={{
          ...styles.minimalBtn,
          color: copied ? '#22c55e' : 'var(--text-secondary, #6b7280)',
        }}
      >
        {copied ? <CheckIcon /> : <CopyIcon />}
        <span style={{ marginLeft: '4px', fontSize: '13px' }}>
          {copied ? successLabel : label}
        </span>
      </button>
    );
  }

  return (
    <button
      onClick={handleCopy}
      aria-label={copied ? successLabel : label}
      style={{
        ...styles.btn,
        ...(copied ? styles.btnSuccess : {}),
      }}
    >
      {copied ? <CheckIcon /> : <CopyIcon />}
      <span>{copied ? successLabel : label}</span>
    </button>
  );
};

const styles: Record<string, React.CSSProperties> = {
  btn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 14px',
    borderRadius: '8px',
    border: '1px solid var(--border-color, #d1d5db)',
    background: 'var(--btn-bg, #fff)',
    color: 'var(--text-primary, #374151)',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.15s',
    outline: 'none',
  },
  btnSuccess: {
    borderColor: '#86efac',
    color: '#16a34a',
    background: '#f0fdf4',
  },
  iconBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '6px',
    borderRadius: '6px',
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    transition: 'color 0.15s',
    outline: 'none',
  },
  minimalBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '4px 8px',
    borderRadius: '6px',
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    transition: 'color 0.15s',
    outline: 'none',
  },
};

export default CopyButton;

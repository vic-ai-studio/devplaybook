import React from 'react';

/**
 * Badge / tag component for status indicators and labels.
 * @property {React.ReactNode} children - Badge text content
 * @property {'default' | 'success' | 'warning' | 'error' | 'info' | 'purple'} [variant='default'] - Color variant
 * @property {'sm' | 'md' | 'lg'} [size='md'] - Badge size
 * @property {boolean} [dot=false] - Show status dot indicator
 * @property {boolean} [removable=false] - Show remove button
 * @property {() => void} [onRemove] - Remove callback
 * @property {boolean} [outline=false] - Use outline style instead of filled
 */
interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'purple';
  size?: 'sm' | 'md' | 'lg';
  dot?: boolean;
  removable?: boolean;
  onRemove?: () => void;
  outline?: boolean;
}

const colorMap = {
  default: { bg: '#f3f4f6', text: '#374151', border: '#d1d5db', dot: '#6b7280' },
  success: { bg: '#dcfce7', text: '#166534', border: '#86efac', dot: '#22c55e' },
  warning: { bg: '#fef3c7', text: '#92400e', border: '#fcd34d', dot: '#f59e0b' },
  error: { bg: '#fef2f2', text: '#991b1b', border: '#fca5a5', dot: '#ef4444' },
  info: { bg: '#dbeafe', text: '#1e40af', border: '#93c5fd', dot: '#3b82f6' },
  purple: { bg: '#f3e8ff', text: '#6b21a8', border: '#c084fc', dot: '#a855f7' },
};

const sizeMap = {
  sm: { padding: '2px 8px', fontSize: '11px', gap: '4px' },
  md: { padding: '4px 10px', fontSize: '12px', gap: '5px' },
  lg: { padding: '6px 14px', fontSize: '14px', gap: '6px' },
};

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  dot = false,
  removable = false,
  onRemove,
  outline = false,
}) => {
  const colors = colorMap[variant];
  const sizing = sizeMap[size];

  const style: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: sizing.gap,
    padding: sizing.padding,
    fontSize: sizing.fontSize,
    fontWeight: 500,
    lineHeight: 1.4,
    borderRadius: '9999px',
    whiteSpace: 'nowrap',
    background: outline ? 'transparent' : colors.bg,
    color: colors.text,
    border: outline ? `1.5px solid ${colors.border}` : '1px solid transparent',
    transition: 'all 0.15s',
  };

  return (
    <span style={style} role="status">
      {dot && (
        <span
          style={{
            width: size === 'sm' ? '6px' : '8px',
            height: size === 'sm' ? '6px' : '8px',
            borderRadius: '50%',
            background: colors.dot,
            flexShrink: 0,
          }}
          aria-hidden="true"
        />
      )}
      {children}
      {removable && (
        <button
          onClick={onRemove}
          aria-label="Remove"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '0 2px',
            fontSize: sizing.fontSize,
            color: colors.text,
            opacity: 0.6,
            lineHeight: 1,
            display: 'inline-flex',
          }}
        >
          &#x2715;
        </button>
      )}
    </span>
  );
};

export default Badge;

import React from 'react';

/**
 * Empty state placeholder for lists, tables, and search results.
 * @property {string} title - Main empty state heading
 * @property {string} [description] - Supporting description text
 * @property {React.ReactNode} [icon] - Custom icon element
 * @property {React.ReactNode} [action] - CTA button or link
 * @property {'sm' | 'md' | 'lg'} [size='md'] - Overall component size
 */
interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

const sizePadding = { sm: '24px', md: '48px', lg: '72px' };
const titleSize = { sm: '16px', md: '20px', lg: '24px' };
const descSize = { sm: '13px', md: '14px', lg: '16px' };
const iconDim = { sm: 40, md: 56, lg: 72 };

const DefaultIcon: React.FC<{ size: number }> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 56 56" fill="none">
    <rect x="8" y="12" width="40" height="32" rx="4" stroke="#d1d5db" strokeWidth="2" />
    <path d="M8 20H48" stroke="#d1d5db" strokeWidth="2" />
    <circle cx="28" cy="34" r="4" stroke="#d1d5db" strokeWidth="2" />
    <path d="M24 38L28 42L32 38" stroke="#d1d5db" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon,
  action,
  size = 'md',
}) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: sizePadding[size],
        width: '100%',
      }}
      role="status"
    >
      <div
        style={{
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: iconDim[size] + 24,
          height: iconDim[size] + 24,
          borderRadius: '50%',
          background: 'var(--empty-icon-bg, #f9fafb)',
        }}
      >
        {icon || <DefaultIcon size={iconDim[size]} />}
      </div>
      <h3
        style={{
          margin: '0 0 8px',
          fontSize: titleSize[size],
          fontWeight: 600,
          color: 'var(--text-primary, #111827)',
        }}
      >
        {title}
      </h3>
      {description && (
        <p
          style={{
            margin: '0 0 20px',
            fontSize: descSize[size],
            color: 'var(--text-secondary, #6b7280)',
            maxWidth: '360px',
            lineHeight: 1.5,
          }}
        >
          {description}
        </p>
      )}
      {action && <div>{action}</div>}
    </div>
  );
};

export default EmptyState;

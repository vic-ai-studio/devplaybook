import React from 'react';

/**
 * Progress bar with percentage, label, and multiple variants.
 * @property {number} value - Current value (0-100)
 * @property {number} [max=100] - Maximum value
 * @property {string} [label] - Accessible label
 * @property {boolean} [showValue=false] - Show percentage text
 * @property {'default' | 'success' | 'warning' | 'error' | 'gradient'} [variant='default'] - Color variant
 * @property {'sm' | 'md' | 'lg'} [size='md'] - Bar height
 * @property {boolean} [animated=false] - Enable stripe animation
 * @property {boolean} [indeterminate=false] - Indeterminate loading state
 */
interface ProgressBarProps {
  value: number;
  max?: number;
  label?: string;
  showValue?: boolean;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'gradient';
  size?: 'sm' | 'md' | 'lg';
  animated?: boolean;
  indeterminate?: boolean;
}

const heightMap = { sm: '4px', md: '8px', lg: '12px' };

const colorMap: Record<string, string> = {
  default: '#3b82f6',
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
  gradient: 'linear-gradient(90deg, #3b82f6, #8b5cf6, #ec4899)',
};

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max = 100,
  label,
  showValue = false,
  variant = 'default',
  size = 'md',
  animated = false,
  indeterminate = false,
}) => {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const height = heightMap[size];
  const color = colorMap[variant];
  const isGradient = variant === 'gradient';

  return (
    <div style={styles.container}>
      {(label || showValue) && (
        <div style={styles.header}>
          {label && <span style={styles.label}>{label}</span>}
          {showValue && !indeterminate && (
            <span style={styles.value}>{Math.round(pct)}%</span>
          )}
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={indeterminate ? undefined : pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label || `Progress: ${Math.round(pct)}%`}
        style={{
          ...styles.track,
          height,
        }}
      >
        <div
          style={{
            height: '100%',
            borderRadius: '9999px',
            transition: indeterminate ? 'none' : 'width 0.4s ease',
            width: indeterminate ? '40%' : `${pct}%`,
            background: isGradient ? color : color,
            backgroundSize: animated ? '20px 20px' : undefined,
            backgroundImage: animated
              ? `linear-gradient(45deg, rgba(255,255,255,0.15) 25%, transparent 25%, transparent 50%, rgba(255,255,255,0.15) 50%, rgba(255,255,255,0.15) 75%, transparent 75%)`
              : undefined,
            animation: indeterminate
              ? 'indeterminate 1.5s ease-in-out infinite'
              : animated
              ? 'stripes 1s linear infinite'
              : 'none',
          }}
        />
      </div>
      <style>{`
        @keyframes stripes {
          from { background-position: 20px 0; }
          to { background-position: 0 0; }
        }
        @keyframes indeterminate {
          0% { margin-left: 0; width: 30%; }
          50% { margin-left: 40%; width: 40%; }
          100% { margin-left: 100%; width: 10%; }
        }
      `}</style>
    </div>
  );
};

/**
 * Circular progress indicator.
 */
interface CircularProgressProps {
  value: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  showValue?: boolean;
}

export const CircularProgress: React.FC<CircularProgressProps> = ({
  value,
  size: dim = 64,
  strokeWidth = 6,
  color = '#3b82f6',
  showValue = true,
}) => {
  const pct = Math.min(100, Math.max(0, value));
  const radius = (dim - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div style={{ position: 'relative', width: dim, height: dim, display: 'inline-flex' }}>
      <svg width={dim} height={dim} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={dim / 2} cy={dim / 2} r={radius} fill="none"
          stroke="var(--progress-track, #e5e7eb)" strokeWidth={strokeWidth} />
        <circle cx={dim / 2} cy={dim / 2} r={radius} fill="none"
          stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.4s ease' }} />
      </svg>
      {showValue && (
        <span style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: dim * 0.22, fontWeight: 600,
          color: 'var(--text-primary, #374151)',
        }}>
          {Math.round(pct)}%
        </span>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: { width: '100%' },
  header: {
    display: 'flex', justifyContent: 'space-between', marginBottom: '6px',
  },
  label: { fontSize: '13px', fontWeight: 500, color: 'var(--text-primary, #374151)' },
  value: { fontSize: '13px', fontWeight: 600, color: 'var(--text-primary, #374151)' },
  track: {
    width: '100%', borderRadius: '9999px', overflow: 'hidden',
    background: 'var(--progress-track, #e5e7eb)',
  },
};

export default ProgressBar;

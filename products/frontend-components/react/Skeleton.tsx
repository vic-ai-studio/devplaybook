import React from 'react';

/**
 * Skeleton loading placeholder with pulse animation.
 * @property {'text' | 'circle' | 'rect' | 'card'} [variant='text'] - Shape variant
 * @property {string | number} [width] - Custom width
 * @property {string | number} [height] - Custom height
 * @property {number} [lines=1] - Number of text lines (for variant='text')
 * @property {string} [borderRadius] - Custom border radius
 * @property {boolean} [animate=true] - Enable pulse animation
 */
interface SkeletonProps {
  variant?: 'text' | 'circle' | 'rect' | 'card';
  width?: string | number;
  height?: string | number;
  lines?: number;
  borderRadius?: string;
  animate?: boolean;
}

const defaultDims: Record<string, { w: string; h: string; radius: string }> = {
  text: { w: '100%', h: '16px', radius: '4px' },
  circle: { w: '48px', h: '48px', radius: '50%' },
  rect: { w: '100%', h: '120px', radius: '8px' },
  card: { w: '100%', h: '200px', radius: '12px' },
};

export const Skeleton: React.FC<SkeletonProps> = ({
  variant = 'text',
  width,
  height,
  lines = 1,
  borderRadius,
  animate = true,
}) => {
  const defaults = defaultDims[variant];
  const w = width ?? defaults.w;
  const h = height ?? defaults.h;
  const radius = borderRadius ?? defaults.radius;

  const baseStyle: React.CSSProperties = {
    background: 'var(--skeleton-bg, linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%))',
    backgroundSize: '200% 100%',
    animation: animate ? 'skeletonPulse 1.5s ease-in-out infinite' : 'none',
    borderRadius: radius,
  };

  if (variant === 'card') {
    return (
      <div style={{ ...baseStyle, width: w, borderRadius: radius, padding: '16px' }}>
        <div style={{ ...baseStyle, width: '40%', height: '20px', marginBottom: '16px', borderRadius: '4px' }} />
        <div style={{ ...baseStyle, width: '100%', height: '12px', marginBottom: '8px', borderRadius: '4px' }} />
        <div style={{ ...baseStyle, width: '100%', height: '12px', marginBottom: '8px', borderRadius: '4px' }} />
        <div style={{ ...baseStyle, width: '60%', height: '12px', borderRadius: '4px' }} />
        <style>{skeletonKeyframes}</style>
      </div>
    );
  }

  if (variant === 'text' && lines > 1) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: w }}>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            style={{
              ...baseStyle,
              width: i === lines - 1 ? '70%' : '100%',
              height: h,
            }}
          />
        ))}
        <style>{skeletonKeyframes}</style>
      </div>
    );
  }

  return (
    <>
      <div
        style={{
          ...baseStyle,
          width: typeof w === 'number' ? `${w}px` : w,
          height: typeof h === 'number' ? `${h}px` : h,
        }}
        role="status"
        aria-label="Loading"
        aria-busy="true"
      />
      <style>{skeletonKeyframes}</style>
    </>
  );
};

/**
 * Pre-built skeleton layout for common UI patterns.
 */
export const SkeletonTable: React.FC<{ rows?: number; cols?: number }> = ({
  rows = 5,
  cols = 4,
}) => (
  <div style={{ width: '100%' }}>
    <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
      {Array.from({ length: cols }).map((_, i) => (
        <Skeleton key={i} width={`${100 / cols}%`} height="14px" />
      ))}
    </div>
    {Array.from({ length: rows }).map((_, r) => (
      <div key={r} style={{ display: 'flex', gap: '12px', marginBottom: '10px' }}>
        {Array.from({ length: cols }).map((_, c) => (
          <Skeleton key={c} width={`${100 / cols}%`} height="16px" />
        ))}
      </div>
    ))}
  </div>
);

export const SkeletonList: React.FC<{ items?: number }> = ({ items = 4 }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
    {Array.from({ length: items }).map((_, i) => (
      <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        <Skeleton variant="circle" width={40} height={40} />
        <div style={{ flex: 1 }}>
          <Skeleton width="60%" height="14px" />
          <div style={{ marginTop: '6px' }}>
            <Skeleton width="90%" height="12px" />
          </div>
        </div>
      </div>
    ))}
  </div>
);

const skeletonKeyframes = `
  @keyframes skeletonPulse {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }
`;

export default Skeleton;

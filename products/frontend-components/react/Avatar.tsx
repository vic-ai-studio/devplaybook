import React, { useState } from 'react';

/**
 * Avatar component with image, initials fallback, and status indicator.
 * @property {string} [src] - Image URL
 * @property {string} [alt=''] - Alt text for the image
 * @property {string} [name] - Full name (used for initials fallback)
 * @property {'xs' | 'sm' | 'md' | 'lg' | 'xl'} [size='md'] - Avatar size
 * @property {'online' | 'offline' | 'busy' | 'away'} [status] - Status indicator
 * @property {boolean} [rounded=true] - Circular or square shape
 * @property {string} [color] - Custom background color for initials
 */
interface AvatarProps {
  src?: string;
  alt?: string;
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  status?: 'online' | 'offline' | 'busy' | 'away';
  rounded?: boolean;
  color?: string;
}

const sizeMap: Record<string, { dim: number; font: number; statusDot: number }> = {
  xs: { dim: 24, font: 10, statusDot: 6 },
  sm: { dim: 32, font: 12, statusDot: 8 },
  md: { dim: 40, font: 14, statusDot: 10 },
  lg: { dim: 56, font: 20, statusDot: 12 },
  xl: { dim: 72, font: 26, statusDot: 14 },
};

const statusColors: Record<string, string> = {
  online: '#22c55e',
  offline: '#9ca3af',
  busy: '#ef4444',
  away: '#f59e0b',
};

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function hashColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 55%, 55%)`;
}

export const Avatar: React.FC<AvatarProps> = ({
  src,
  alt = '',
  name,
  size = 'md',
  status,
  rounded = true,
  color,
}) => {
  const [imgError, setImgError] = useState(false);
  const { dim, font, statusDot } = sizeMap[size];
  const showImage = src && !imgError;
  const initials = name ? getInitials(name) : '?';
  const bgColor = color || (name ? hashColor(name) : '#d1d5db');

  return (
    <div
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: dim,
        height: dim,
        borderRadius: rounded ? '50%' : '20%',
        background: showImage ? 'transparent' : bgColor,
        overflow: 'hidden',
        flexShrink: 0,
      }}
      role="img"
      aria-label={alt || name || 'Avatar'}
    >
      {showImage ? (
        <img
          src={src}
          alt={alt || name || ''}
          onError={() => setImgError(true)}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        />
      ) : (
        <span
          style={{
            fontSize: font,
            fontWeight: 600,
            color: '#fff',
            userSelect: 'none',
            lineHeight: 1,
          }}
        >
          {initials}
        </span>
      )}
      {status && (
        <span
          style={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            width: statusDot,
            height: statusDot,
            borderRadius: '50%',
            background: statusColors[status],
            border: '2px solid var(--avatar-ring, #fff)',
            boxSizing: 'content-box',
          }}
          aria-label={`Status: ${status}`}
        />
      )}
    </div>
  );
};

/**
 * Avatar group that stacks multiple avatars with overlap.
 */
interface AvatarGroupProps {
  children: React.ReactNode;
  max?: number;
  size?: AvatarProps['size'];
}

export const AvatarGroup: React.FC<AvatarGroupProps> = ({
  children,
  max = 4,
  size = 'md',
}) => {
  const avatars = React.Children.toArray(children);
  const shown = avatars.slice(0, max);
  const overflow = avatars.length - max;
  const dim = sizeMap[size].dim;

  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      {shown.map((child, i) => (
        <div key={i} style={{ marginLeft: i === 0 ? 0 : -(dim * 0.25), zIndex: shown.length - i }}>
          {child}
        </div>
      ))}
      {overflow > 0 && (
        <div
          style={{
            marginLeft: -(dim * 0.25),
            width: dim,
            height: dim,
            borderRadius: '50%',
            background: '#e5e7eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: sizeMap[size].font - 2,
            fontWeight: 600,
            color: '#6b7280',
            border: '2px solid #fff',
          }}
        >
          +{overflow}
        </div>
      )}
    </div>
  );
};

export default Avatar;

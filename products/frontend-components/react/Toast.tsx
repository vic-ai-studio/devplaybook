import React, { useEffect, useState, useCallback } from 'react';

/**
 * Toast notification component with auto-dismiss and manual close.
 * @property {string} message - The notification text
 * @property {'success' | 'error' | 'warning' | 'info'} [type='info'] - Visual variant
 * @property {number} [duration=4000] - Auto-dismiss time in ms (0 = no auto-dismiss)
 * @property {() => void} onClose - Callback when toast is dismissed
 * @property {'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'} [position='top-right'] - Screen position
 */
interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  onClose: () => void;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

const icons: Record<string, string> = {
  success: '\u2713',
  error: '\u2715',
  warning: '\u26A0',
  info: '\u2139',
};

const colorMap: Record<string, { bg: string; border: string; icon: string }> = {
  success: { bg: '#f0fdf4', border: '#86efac', icon: '#16a34a' },
  error: { bg: '#fef2f2', border: '#fca5a5', icon: '#dc2626' },
  warning: { bg: '#fffbeb', border: '#fcd34d', icon: '#d97706' },
  info: { bg: '#eff6ff', border: '#93c5fd', icon: '#2563eb' },
};

const positionMap: Record<string, React.CSSProperties> = {
  'top-right': { top: '20px', right: '20px' },
  'top-left': { top: '20px', left: '20px' },
  'bottom-right': { bottom: '20px', right: '20px' },
  'bottom-left': { bottom: '20px', left: '20px' },
};

export const Toast: React.FC<ToastProps> = ({
  message,
  type = 'info',
  duration = 4000,
  onClose,
  position = 'top-right',
}) => {
  const [isExiting, setIsExiting] = useState(false);

  const dismiss = useCallback(() => {
    setIsExiting(true);
    setTimeout(onClose, 200);
  }, [onClose]);

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(dismiss, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, dismiss]);

  const colors = colorMap[type];

  return (
    <div
      role="alert"
      aria-live="assertive"
      style={{
        position: 'fixed',
        ...positionMap[position],
        zIndex: 10000,
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        padding: '14px 18px',
        background: colors.bg,
        border: `1px solid ${colors.border}`,
        borderRadius: '10px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
        minWidth: '300px',
        maxWidth: '440px',
        animation: isExiting ? 'toastOut 0.2s ease forwards' : 'toastIn 0.25s ease',
      }}
    >
      <span
        style={{
          fontSize: '18px',
          lineHeight: 1,
          color: colors.icon,
          flexShrink: 0,
          marginTop: '1px',
        }}
      >
        {icons[type]}
      </span>
      <p style={{ margin: 0, flex: 1, fontSize: '14px', lineHeight: 1.5, color: '#1f2937' }}>
        {message}
      </p>
      <button
        onClick={dismiss}
        aria-label="Dismiss notification"
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontSize: '16px',
          color: '#9ca3af',
          padding: '0 2px',
          lineHeight: 1,
          flexShrink: 0,
        }}
      >
        &#x2715;
      </button>
      {duration > 0 && (
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            height: '3px',
            background: colors.icon,
            borderRadius: '0 0 10px 10px',
            animation: `shrink ${duration}ms linear forwards`,
          }}
        />
      )}
      <style>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translateX(40px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes toastOut {
          from { opacity: 1; transform: translateX(0); }
          to { opacity: 0; transform: translateX(40px); }
        }
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
};

/**
 * Hook to manage multiple toasts.
 * Returns [toasts, addToast, removeToast].
 */
interface ToastItem {
  id: number;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  let counter = 0;

  const addToast = (message: string, type: ToastItem['type'] = 'info', duration = 4000) => {
    const id = ++counter;
    setToasts((prev) => [...prev, { id, message, type, duration }]);
  };

  const removeToast = (id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return { toasts, addToast, removeToast } as const;
}

export default Toast;

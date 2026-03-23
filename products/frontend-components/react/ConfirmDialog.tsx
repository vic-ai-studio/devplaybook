import React, { useRef, useEffect, useCallback } from 'react';

/**
 * Confirmation dialog for destructive or important actions.
 * @property {boolean} isOpen - Whether the dialog is visible
 * @property {() => void} onConfirm - Callback when user confirms
 * @property {() => void} onCancel - Callback when user cancels
 * @property {string} [title='Are you sure?'] - Dialog title
 * @property {string} [message] - Description text
 * @property {string} [confirmText='Confirm'] - Confirm button label
 * @property {string} [cancelText='Cancel'] - Cancel button label
 * @property {'danger' | 'warning' | 'default'} [variant='default'] - Visual variant
 * @property {boolean} [loading=false] - Shows spinner on confirm button
 */
interface ConfirmDialogProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'default';
  loading?: boolean;
}

const variantColors = {
  danger: { bg: '#dc2626', hover: '#b91c1c', icon: '#fecaca', iconColor: '#dc2626' },
  warning: { bg: '#d97706', hover: '#b45309', icon: '#fef3c7', iconColor: '#d97706' },
  default: { bg: '#3b82f6', hover: '#2563eb', icon: '#dbeafe', iconColor: '#3b82f6' },
};

const variantIcons = {
  danger: '\u26A0',
  warning: '\u26A0',
  default: '\u2753',
};

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onConfirm,
  onCancel,
  title = 'Are you sure?',
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'default',
  loading = false,
}) => {
  const confirmRef = useRef<HTMLButtonElement>(null);
  const colors = variantColors[variant];

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    },
    [onCancel]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
      setTimeout(() => confirmRef.current?.focus(), 50);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return (
    <div style={styles.overlay} onClick={onCancel} aria-hidden="true">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby={message ? 'confirm-desc' : undefined}
        style={styles.dialog}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ ...styles.iconCircle, background: colors.icon }}>
          <span style={{ fontSize: '24px', color: colors.iconColor }}>
            {variantIcons[variant]}
          </span>
        </div>
        <h3 id="confirm-title" style={styles.title}>{title}</h3>
        {message && <p id="confirm-desc" style={styles.message}>{message}</p>}
        <div style={styles.actions}>
          <button onClick={onCancel} style={styles.cancelBtn}>
            {cancelText}
          </button>
          <button
            ref={confirmRef}
            onClick={onConfirm}
            disabled={loading}
            style={{
              ...styles.confirmBtn,
              background: colors.bg,
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Processing...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000,
  },
  dialog: {
    background: 'var(--modal-bg, #fff)', borderRadius: '14px', padding: '32px',
    maxWidth: '400px', width: '90%', textAlign: 'center',
    boxShadow: '0 20px 60px rgba(0,0,0,0.25)', animation: 'slideUp 0.2s ease',
  },
  iconCircle: {
    width: '56px', height: '56px', borderRadius: '50%', margin: '0 auto 16px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  title: {
    margin: '0 0 8px', fontSize: '18px', fontWeight: 600,
    color: 'var(--text-primary, #111827)',
  },
  message: {
    margin: '0 0 24px', fontSize: '14px', lineHeight: 1.5,
    color: 'var(--text-secondary, #6b7280)',
  },
  actions: {
    display: 'flex', gap: '12px', justifyContent: 'center',
  },
  cancelBtn: {
    padding: '10px 20px', borderRadius: '8px', fontSize: '14px', fontWeight: 500,
    border: '1px solid var(--border-color, #d1d5db)', background: 'var(--btn-bg, #fff)',
    color: 'var(--text-primary, #374151)', cursor: 'pointer',
  },
  confirmBtn: {
    padding: '10px 20px', borderRadius: '8px', fontSize: '14px', fontWeight: 500,
    border: 'none', color: '#fff', cursor: 'pointer',
  },
};

export default ConfirmDialog;

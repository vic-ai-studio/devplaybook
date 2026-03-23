import React, { useState, useRef, useEffect, useCallback } from 'react';

/**
 * Tooltip component that shows on hover or focus.
 * @property {React.ReactNode} children - Trigger element
 * @property {string} content - Tooltip text
 * @property {'top' | 'bottom' | 'left' | 'right'} [position='top'] - Tooltip placement
 * @property {number} [delay=200] - Show delay in ms
 * @property {number} [maxWidth=250] - Maximum tooltip width in px
 */
interface TooltipProps {
  children: React.ReactNode;
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
  maxWidth?: number;
}

export const Tooltip: React.FC<TooltipProps> = ({
  children,
  content,
  position = 'top',
  delay = 200,
  maxWidth = 250,
}) => {
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const tooltipId = useRef(`tooltip-${Math.random().toString(36).slice(2, 9)}`);

  const calculatePosition = useCallback(() => {
    if (!triggerRef.current || !tooltipRef.current) return;
    const trigger = triggerRef.current.getBoundingClientRect();
    const tip = tooltipRef.current.getBoundingClientRect();
    const gap = 8;

    let top = 0, left = 0;
    switch (position) {
      case 'top':
        top = trigger.top - tip.height - gap;
        left = trigger.left + trigger.width / 2 - tip.width / 2;
        break;
      case 'bottom':
        top = trigger.bottom + gap;
        left = trigger.left + trigger.width / 2 - tip.width / 2;
        break;
      case 'left':
        top = trigger.top + trigger.height / 2 - tip.height / 2;
        left = trigger.left - tip.width - gap;
        break;
      case 'right':
        top = trigger.top + trigger.height / 2 - tip.height / 2;
        left = trigger.right + gap;
        break;
    }
    // Clamp to viewport
    left = Math.max(8, Math.min(left, window.innerWidth - tip.width - 8));
    top = Math.max(8, top);
    setCoords({ top, left });
  }, [position]);

  const show = useCallback(() => {
    timerRef.current = setTimeout(() => {
      setVisible(true);
      requestAnimationFrame(calculatePosition);
    }, delay);
  }, [delay, calculatePosition]);

  const hide = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setVisible(false);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  if (!content) return <>{children}</>;

  return (
    <>
      <span
        ref={triggerRef}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        aria-describedby={visible ? tooltipId.current : undefined}
        style={{ display: 'inline-flex' }}
      >
        {children}
      </span>
      {visible && (
        <div
          ref={tooltipRef}
          id={tooltipId.current}
          role="tooltip"
          style={{
            position: 'fixed',
            top: coords.top,
            left: coords.left,
            maxWidth,
            padding: '8px 12px',
            background: 'var(--tooltip-bg, #1f2937)',
            color: 'var(--tooltip-color, #fff)',
            fontSize: '13px',
            lineHeight: 1.4,
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            zIndex: 10001,
            pointerEvents: 'none',
            animation: 'tooltipFade 0.15s ease',
            whiteSpace: 'normal',
            wordWrap: 'break-word',
          }}
        >
          {content}
          <style>{`
            @keyframes tooltipFade {
              from { opacity: 0; transform: scale(0.95); }
              to { opacity: 1; transform: scale(1); }
            }
          `}</style>
        </div>
      )}
    </>
  );
};

export default Tooltip;

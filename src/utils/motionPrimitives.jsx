import React, { useEffect, useId, useRef, useState } from 'react';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return false;
    }
    return window.matchMedia(REDUCED_MOTION_QUERY).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return undefined;
    }
    const mq = window.matchMedia(REDUCED_MOTION_QUERY);
    const onChange = (event) => setReduced(Boolean(event.matches));
    setReduced(mq.matches);
    if (typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', onChange);
      return () => mq.removeEventListener('change', onChange);
    }
    mq.addListener?.(onChange);
    return () => mq.removeListener?.(onChange);
  }, []);

  return reduced;
}

/**
 * Hardware-friendly rAF cubic-out numeric tween.
 * Initializes synchronously to `targetValue` on mount so SSR/first paint never flashes 0.
 */
export function useAnimatedNumber(targetValue, { duration = 360 } = {}) {
  const reducedMotion = usePrefersReducedMotion();
  const safeTarget = Number.isFinite(Number(targetValue)) ? Number(targetValue) : 0;
  const [displayValue, setDisplayValue] = useState(safeTarget);
  const currentRef = useRef(safeTarget);
  const rafRef = useRef(null);

  useEffect(() => {
    if (rafRef.current !== null && typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    if (
      reducedMotion ||
      typeof requestAnimationFrame !== 'function' ||
      duration <= 0 ||
      Math.abs(safeTarget - currentRef.current) < 0.0001
    ) {
      currentRef.current = safeTarget;
      setDisplayValue(safeTarget);
      return undefined;
    }

    const from = currentRef.current;
    const delta = safeTarget - from;
    const startTs = typeof performance !== 'undefined' ? performance.now() : Date.now();

    const tick = (now) => {
      const elapsed = Math.max(0, (now || Date.now()) - startTs);
      const t = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const next = t >= 1 ? safeTarget : from + delta * eased;
      currentRef.current = next;
      setDisplayValue(next);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        rafRef.current = null;
      }
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null && typeof cancelAnimationFrame === 'function') {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [safeTarget, duration, reducedMotion]);

  return displayValue;
}

/**
 * Smoothly animated numeric readout with subtle pulse feedback on commit.
 */
export function AnimatedValue({
  value,
  format = (n) => Math.round(n).toLocaleString('en-US'),
  prefix = '',
  suffix = '',
  duration = 340,
  className = '',
}) {
  const animated = useAnimatedNumber(value, { duration });
  const reducedMotion = usePrefersReducedMotion();
  const prevTargetRef = useRef(value);
  const pulseTimerRef = useRef(null);
  const [pulsing, setPulsing] = useState(false);

  useEffect(() => {
    if (reducedMotion || prevTargetRef.current === value) {
      prevTargetRef.current = value;
      return undefined;
    }
    prevTargetRef.current = value;
    setPulsing(true);
    if (pulseTimerRef.current) clearTimeout(pulseTimerRef.current);
    pulseTimerRef.current = setTimeout(() => setPulsing(false), 320);
    return () => {
      if (pulseTimerRef.current) clearTimeout(pulseTimerRef.current);
    };
  }, [value, reducedMotion]);

  return (
    <span
      className={`studio-anim-value ${className}`.trim()}
      data-pulsing={pulsing ? 'true' : undefined}
    >
      {prefix}
      {format(animated)}
      {suffix}
    </span>
  );
}

/**
 * Pointer-tracked radial spotlight catchlight container.
 * Uses direct DOM custom properties (--spot-x / --spot-y) to guarantee zero re-renders on hover move.
 */
export function SpotlightPanel({
  as: Tag = 'div',
  className = '',
  children,
  onPointerMove,
  onPointerLeave,
  ...rest
}) {
  const ref = useRef(null);
  const reducedMotion = usePrefersReducedMotion();

  const handleMove = (e) => {
    if (!reducedMotion && ref.current) {
      const rect = ref.current.getBoundingClientRect();
      ref.current.style.setProperty('--spot-x', `${Math.round(e.clientX - rect.left)}px`);
      ref.current.style.setProperty('--spot-y', `${Math.round(e.clientY - rect.top)}px`);
      ref.current.dataset.spotActive = 'true';
    }
    onPointerMove?.(e);
  };

  const handleLeave = (e) => {
    if (ref.current) {
      delete ref.current.dataset.spotActive;
    }
    onPointerLeave?.(e);
  };

  return (
    <Tag
      ref={ref}
      className={`studio-spotlight-surface ${className}`.trim()}
      onPointerMove={handleMove}
      onPointerLeave={handleLeave}
      {...rest}
    >
      {children}
    </Tag>
  );
}

/**
 * Spring-animated segmented mode switcher powered by GPU translate3d.
 */
export function SegmentedSpringTabs({
  options = [],
  value,
  onChange,
  ariaLabel = 'Studio modes',
  className = '',
}) {
  const uid = useId();
  const tabRefs = useRef({});
  const activeIdx = Math.max(
    0,
    options.findIndex((o) => o.id === value)
  );
  const count = Math.max(1, options.length);

  const selectAndFocus = (optId) => {
    onChange(optId);
    tabRefs.current[optId]?.focus();
  };

  return (
    <div
      className={`studio-segmented-tabs ${className}`.trim()}
      role="tablist"
      aria-label={ariaLabel}
      style={{ '--seg-count': count, '--seg-idx': activeIdx }}
    >
      <span className="studio-segmented-glider" aria-hidden="true" />
      {options.map((opt, idx) => {
        const isActive = opt.id === value;
        const Icon = opt.icon;
        return (
          <button
            key={opt.id}
            ref={(el) => {
              if (el) tabRefs.current[opt.id] = el;
              else delete tabRefs.current[opt.id];
            }}
            id={`${uid}-${opt.id}`}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-controls={opt.panelId || undefined}
            tabIndex={isActive ? 0 : -1}
            className={`studio-segmented-btn ${isActive ? 'active' : ''}`}
            onClick={() => onChange(opt.id)}
            onKeyDown={(e) => {
              if (!options.length) return;
              if (e.key === 'ArrowRight') {
                e.preventDefault();
                selectAndFocus(options[(idx + 1) % options.length].id);
              } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                selectAndFocus(options[(idx - 1 + options.length) % options.length].id);
              } else if (e.key === 'Home') {
                e.preventDefault();
                selectAndFocus(options[0].id);
              } else if (e.key === 'End') {
                e.preventDefault();
                selectAndFocus(options[options.length - 1].id);
              }
            }}
          >
            {Icon && <Icon size={15} aria-hidden="true" />}
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}

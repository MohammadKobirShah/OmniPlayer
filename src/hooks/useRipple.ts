import { useEffect } from 'react';

/**
 * Material-style ripple feedback attached via event delegation: a single
 * listener on the container injects an `.omni-ripple` span on any
 * `.omni-btn` press. Keeps markup clean while giving every control the
 * premium "drop in water" effect at a smooth 60fps (transform/opacity only).
 *
 * Disabled on reduced-motion / low-power devices.
 */
export function useRipple(
  containerRef: React.RefObject<HTMLElement | null>,
  enabled: boolean,
) {
  useEffect(() => {
    if (!enabled) return;
    const container = containerRef.current;
    if (!container) return;

    const spawn = (e: PointerEvent) => {
      const target = (e.target as HTMLElement)?.closest<HTMLElement>('.omni-btn');
      if (!target) return;
      const rect = target.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height) * 1.1;
      const span = document.createElement('span');
      span.className = 'omni-ripple';
      span.style.width = `${size}px`;
      span.style.height = `${size}px`;
      span.style.left = `${e.clientX - rect.left - size / 2}px`;
      span.style.top = `${e.clientY - rect.top - size / 2}px`;
      target.appendChild(span);
      // Remove after the animation finishes.
      window.setTimeout(() => span.remove(), 620);
    };

    container.addEventListener('pointerdown', spawn);
    return () => container.removeEventListener('pointerdown', spawn);
  }, [containerRef, enabled]);
}

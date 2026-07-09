import { useEffect } from 'react';

type Dir = 'left' | 'right' | 'up' | 'down';

const VECTORS: Record<Dir, { x: number; y: number }> = {
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
};

function center(el: HTMLElement) {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height };
}

function isVisible(el: Element): el is HTMLElement {
  if (!(el instanceof HTMLElement)) return false;
  if ((el as HTMLButtonElement).disabled) return false;
  const r = el.getBoundingClientRect();
  // Off-DOM or zero-size elements are not navigable.
  if (r.width < 2 || r.height < 2) return false;
  if (el.offsetParent === null && getComputedStyle(el).position !== 'fixed') return false;
  return true;
}

/** Determine which region currently owns focus (drawer / menu / controls). */
function getScope(container: HTMLElement): HTMLElement | null {
  const drawer = container.querySelector<HTMLElement>('.omni-drawer.is-open');
  if (drawer) return drawer;
  for (const sel of ['.omni-menu', '.omni-stats', '.omni-help']) {
    const el = container.querySelector<HTMLElement>(sel);
    if (el) return el;
  }
  return container.querySelector<HTMLElement>('.omni-controls-wrapper') ?? container;
}

function gatherFocusables(scope: HTMLElement): HTMLElement[] {
  const nodes = scope.querySelectorAll<HTMLElement>(
    'button, [data-focusable], input[type="range"], input, [tabindex]:not([tabindex="-1"])',
  );
  return Array.from(nodes).filter(isVisible);
}

/** Move focus to the geometrically-nearest element in the given direction. */
function move(dir: Dir, scope: HTMLElement): boolean {
  const items = gatherFocusables(scope);
  if (items.length === 0) return false;

  const active = document.activeElement;
  // If nothing in scope is focused, seed to the first item.
  let currentIdx = active instanceof HTMLElement ? items.indexOf(active) : -1;
  if (currentIdx === -1) {
    items[0].focus({ preventScroll: false });
    items[0].scrollIntoView({ block: 'nearest', inline: 'nearest' });
    return true;
  }

  const here = center(items[currentIdx]);
  const vec = VECTORS[dir];
  let bestIdx = -1;
  let bestScore = Infinity;

  for (let i = 0; i < items.length; i++) {
    if (i === currentIdx) continue;
    const there = center(items[i]);
    const dx = there.x - here.x;
    const dy = there.y - here.y;
    // Project onto the direction axis.
    const primary = dx * vec.x + dy * vec.y;
    if (primary <= 1) continue; // behind or same spot
    // Perpendicular offset (absolute).
    const perp = Math.abs(dx * (-vec.y) + dy * vec.x);
    // Prefer close + well-aligned; alignment matters more than raw distance.
    const score = perp * 1.4 + primary;
    if (score < bestScore) {
      bestScore = score;
      bestIdx = i;
    }
  }

  if (bestIdx === -1) return false;
  const target = items[bestIdx];
  target.focus({ preventScroll: true });
  target.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  return true;
}

/**
 * D-pad / arrow-key spatial navigation for 10-foot TV UIs. Replaces the
 * pointer model: arrows move focus between the geometrically nearest control
 * in the active scope; Enter activates it.
 *
 * The arrow/Enter keys are *consumed* here (stopImmediatePropagation) so the
 * desktop seek/volume shortcuts can be gated off in TV mode by the caller.
 */
export function useSpatialNav(
  containerRef: React.RefObject<HTMLElement | null>,
  enabled: boolean,
  onActivity?: () => void,
) {
  useEffect(() => {
    if (!enabled) return;
    const container = containerRef.current;
    if (!container) return;

    const onKey = (e: KeyboardEvent) => {
      const dirMap: Record<string, Dir> = {
        ArrowLeft: 'left',
        ArrowRight: 'right',
        ArrowUp: 'up',
        ArrowDown: 'down',
      };
      const dir = dirMap[e.key];
      if (dir) {
        const scope = getScope(container);
        if (scope && move(dir, scope)) {
          e.preventDefault();
          e.stopImmediatePropagation();
          onActivity?.();
        }
        return;
      }
      if (e.key === 'Enter') {
        const active = document.activeElement;
        if (active instanceof HTMLElement && container.contains(active)) {
          active.click();
          e.preventDefault();
          e.stopImmediatePropagation();
          onActivity?.();
        }
      }
    };

    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, containerRef, onActivity]);
}

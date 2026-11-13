/**
 * Cards a screen was opened from, so the detail can grow out of the card and
 * shrink back into it. Rects are snapshots taken at tap time; elements are
 * held weakly so a removed card never leaks.
 */
export interface SourceRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface SourceEntry {
  rect: SourceRect;
  element: WeakRef<Element> | null;
  at: number;
}

const sources = new Map<string, SourceEntry>();
const LIMIT = 30;

const weak = (element: Element): WeakRef<Element> | null =>
  typeof WeakRef === "function" ? new WeakRef(element) : null;

export function registerExpandSource(sourceId: string, element: Element) {
  const box = element.getBoundingClientRect();
  if (box.width <= 0 || box.height <= 0) return;
  sources.delete(sourceId);
  sources.set(sourceId, { rect: { x: box.left, y: box.top, width: box.width, height: box.height }, element: weak(element), at: Date.now() });
  while (sources.size > LIMIT) {
    const oldest = sources.keys().next().value;
    if (oldest === undefined) break;
    sources.delete(oldest);
  }
}

export function expandSourceRect(sourceId: string | undefined): SourceRect | null {
  if (!sourceId) return null;
  return sources.get(sourceId)?.rect ?? null;
}

/** Attribute that marks a card so collapse can find it again after Back. */
export const SCREEN_SOURCE_ATTRIBUTE = "data-screen-source-id";

/**
 * The card to collapse into, if it is back on screen and mostly visible
 * (not hidden under the header or bottom bar).
 */
export function findVisibleSource(root: ParentNode | null, sourceId: string | undefined, viewportHeight: number): Element | null {
  if (!root || !sourceId) return null;
  const escaped = typeof CSS !== "undefined" && CSS.escape ? CSS.escape(sourceId) : sourceId.replace(/"/g, '\\"');
  const element = root.querySelector(`[${SCREEN_SOURCE_ATTRIBUTE}="${escaped}"]`);
  if (!element) return null;
  const box = element.getBoundingClientRect();
  if (box.height <= 0) return null;
  const visible = Math.min(box.bottom, viewportHeight) - Math.max(box.top, 0);
  return visible / box.height >= 0.4 ? element : null;
}

export function __resetExpandSourcesForTests() {
  sources.clear();
}

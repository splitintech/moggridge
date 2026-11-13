import type { ScreenIntent, ScreenIntentState, ScreenTransition } from "./types";
import type { ScreenNavigationType } from "./classify";

/**
 * How each history entry was entered, so Back can play the exact reverse.
 * Session-scoped (a reload followed by Back still reverses correctly) and
 * capped so it never grows without bound.
 */
const STORAGE_KEY = "moggridge:screen-transitions:v1";
const LIMIT = 200;

let records: Map<string, ScreenTransition> | null = null;

function load(): Map<string, ScreenTransition> {
  if (records) return records;
  records = new Map();
  try {
    const raw = typeof sessionStorage === "undefined" ? null : sessionStorage.getItem(STORAGE_KEY);
    if (raw) {
      for (const [key, value] of JSON.parse(raw) as Array<[string, ScreenTransition]>) records.set(key, value);
    }
  } catch {
    /* storage blocked or malformed: start empty */
  }
  return records;
}

function persist() {
  try {
    if (typeof sessionStorage === "undefined" || !records) return;
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(records.entries())));
  } catch {
    /* quota or privacy mode: in-memory only */
  }
}

export function getEntryTransition(key: string | undefined): ScreenTransition | null {
  if (!key) return null;
  return load().get(key) ?? null;
}

export function setEntryTransition(key: string, transition: ScreenTransition) {
  const map = load();
  map.delete(key);
  // Interactive progress belongs to one gesture, never to the stored record.
  map.set(key, { ...transition, interactive: undefined });
  while (map.size > LIMIT) {
    const oldest = map.keys().next().value;
    if (oldest === undefined) break;
    map.delete(oldest);
  }
  persist();
}

/* History position ------------------------------------------------------- */

const keyIdx = new Map<string, number>();
let lastIdx = 0;

/**
 * BrowserRouter stores `idx` in history.state; MemoryRouter (tests, fixtures)
 * doesn't, so fall back to counting PUSH/REPLACE per location key.
 */
export function resolveHistoryIdx(locationKey: string, navigationType: ScreenNavigationType): number {
  const state = typeof window === "undefined" ? null : (window.history.state as { idx?: unknown; key?: unknown } | null);
  if (state && typeof state.idx === "number" && state.key === locationKey) {
    keyIdx.set(locationKey, state.idx);
    lastIdx = state.idx;
    return state.idx;
  }
  const known = keyIdx.get(locationKey);
  if (navigationType === "POP" && known !== undefined) {
    lastIdx = known;
    return known;
  }
  const idx = navigationType === "PUSH" ? lastIdx + 1 : lastIdx;
  keyIdx.set(locationKey, idx);
  lastIdx = idx;
  return idx;
}

/* Intents ---------------------------------------------------------------- */

let pending: { intent: ScreenIntent; at: number; expect?: ScreenNavigationType } | null = null;
const INTENT_TTL_MS = 1000;

/** For imperative navigation (Back buttons, gestures): consumed by the next screen change. */
export function setPendingScreenIntent(intent: ScreenIntent, expect?: ScreenNavigationType) {
  pending = { intent, at: Date.now(), expect };
}

export function clearPendingScreenIntent() {
  pending = null;
}

export function consumePendingScreenIntent(navigationType: ScreenNavigationType): ScreenIntent | null {
  const current = pending;
  pending = null;
  if (!current) return null;
  if (Date.now() - current.at > INTENT_TTL_MS) return null;
  if (current.expect && current.expect !== navigationType) return null;
  return current.intent;
}

/** `state` for a declarative <Link>; read only on forward navigations, so Back never replays it. */
export function screenIntentState(intent: ScreenIntent): ScreenIntentState {
  return { screenTransition: { v: 1, ...intent } };
}

export function readStateIntent(state: unknown): ScreenIntent | null {
  const payload = (state as ScreenIntentState | null)?.screenTransition;
  if (!payload || payload.v !== 1) return null;
  const { v: _version, ...intent } = payload;
  return intent;
}

/* Browser-drawn transitions ---------------------------------------------- */

let lastPop = { at: 0, uaTransition: false };
let installed = false;

/** Records whether the browser already animated a history step (Chrome predictive back, Safari swipe). */
export function installScreenMotionListeners() {
  if (installed || typeof window === "undefined") return;
  installed = true;
  window.addEventListener(
    "popstate",
    (event) => {
      lastPop = {
        at: Date.now(),
        uaTransition: Boolean((event as PopStateEvent & { hasUAVisualTransition?: boolean }).hasUAVisualTransition),
      };
    },
    { capture: true }
  );
}

/** True when the router has an entry to go Back to inside this app (react-router keeps `history.state.idx`). */
export function hasHistoryEntry(): boolean {
  if (typeof window === "undefined") return false;
  const idx = (window.history.state as { idx?: unknown } | null)?.idx;
  return typeof idx === "number" && idx > 0;
}

export function browserAnimatedLastPop(): boolean {
  return lastPop.uaTransition && Date.now() - lastPop.at < INTENT_TTL_MS;
}

export function __resetScreenHistoryForTests() {
  records = new Map();
  keyIdx.clear();
  lastIdx = 0;
  pending = null;
  lastPop = { at: 0, uaTransition: false };
}

import { useMemo } from 'react';
import { useDragControls } from 'framer-motion';

type Controls = ReturnType<typeof useDragControls>;
type Subscriber = { cancel(): void };
type LegacyControls = Controls & { subscribe(subscriber: Subscriber): () => void };
/** Early Motion12 exposes subscribe/start but no public cancel. Track the same
 * renderer subscriptions so cancellation still ends the engine gesture without
 * firing onDragEnd or starting momentum. Never inspect private engine fields. */
export function withDragCancellation(controls: Controls): Controls {
 if (typeof controls.cancel === 'function') return controls;
 const legacy = controls as LegacyControls;
 const subscribers = new Set<Subscriber>();
 const subscribe = legacy.subscribe.bind(controls);
 legacy.subscribe = (subscriber: Subscriber) => {
  subscribers.add(subscriber);
  const unsubscribe = subscribe(subscriber);
  return () => { subscribers.delete(subscriber); unsubscribe(); };
 };
 controls.cancel = () => { for (const subscriber of subscribers) subscriber.cancel(); };
 return controls;
}
export function useCancellableDragControls() {
 const controls = useDragControls();
 return useMemo(() => withDragCancellation(controls), [controls]);
}

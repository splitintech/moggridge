import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { animate, motion, useMotionValue } from "framer-motion";
import { useMotionTransition } from "./provider";
interface MediaContextValue {
  register: (id: string, element: HTMLElement) => () => void;
  setDestination: (id: string | null) => void;
  destination: string | null;
}
const Context = createContext<MediaContextValue | null>(null);
export function useMediaHost() {
  const value = useContext(Context);
  if (!value) throw new Error("A MediaHost is required");
  return value;
}
export interface MediaHostProps {
  children?: React.ReactNode;
  renderMedia: React.ReactNode;
  initialDestination?: string | null;
  destination?: string | null;
  onDestinationChange?: (id: string | null) => void;
  className?: string;
  style?: React.CSSProperties;
}
/** Player and parent stay mounted. Resize/scroll measurements write MotionValues, never frame state. */
export function MediaHost({
  children,
  renderMedia,
  initialDestination = null,
  destination: controlled,
  onDestinationChange,
  className,
  style,
}: MediaHostProps) {
  const slots = useRef(new Map<string, HTMLElement>()),
    observers = useRef(new Map<string, ResizeObserver>()),
    [selected, setSelected] = useState(initialDestination),
    destination = controlled === undefined ? selected : controlled,
    destinationRef = useRef(destination),
    transition = useMotionTransition(),
    transitionRef = useRef(transition),
    element = useRef<HTMLDivElement>(null);
  const pointerEvents = useRef(style?.pointerEvents);
  pointerEvents.current = style?.pointerEvents;
  destinationRef.current = destination;
  transitionRef.current = transition;
  const x = useMotionValue(0),
    y = useMotionValue(0),
    width = useMotionValue(0),
    height = useMotionValue(0),
    animations = useRef<ReturnType<typeof animate>[]>([]);
  const measure = useCallback(
    (animated = false) => {
      const slot = destinationRef.current
          ? slots.current.get(destinationRef.current)
          : null,
        rect = slot?.getBoundingClientRect();
      if (element.current) {
        element.current.style.visibility = rect ? "visible" : "hidden";
        element.current.style.pointerEvents = rect
          ? (pointerEvents.current ?? "auto")
          : "none";
      }
      animations.current.forEach((animation) => animation.stop());
      animations.current = [];
      if (!rect || !slot) return;
      let left = Math.max(0, rect.left),
        top = Math.max(0, rect.top),
        right = Math.min(window.innerWidth, rect.right),
        bottom = Math.min(window.innerHeight, rect.bottom);
      for (
        let parent = slot.parentElement;
        parent;
        parent = parent.parentElement
      ) {
        const css = getComputedStyle(parent),
          bounds = parent.getBoundingClientRect();
        if (/(auto|scroll|hidden|clip)/.test(css.overflowX || css.overflow)) {
          left = Math.max(left, bounds.left + parent.clientLeft);
          right = Math.min(
            right,
            bounds.left + parent.clientLeft + parent.clientWidth,
          );
        }
        if (/(auto|scroll|hidden|clip)/.test(css.overflowY || css.overflow)) {
          top = Math.max(top, bounds.top + parent.clientTop);
          bottom = Math.min(
            bottom,
            bounds.top + parent.clientTop + parent.clientHeight,
          );
        }
      }
      if (element.current) {
        element.current.style.clipPath = `inset(${Math.max(0, top - rect.top)}px ${Math.max(0, rect.right - right)}px ${Math.max(0, rect.bottom - bottom)}px ${Math.max(0, left - rect.left)}px)`;
        if (right <= left || bottom <= top) {
          element.current.style.visibility = "hidden";
          element.current.style.pointerEvents = "none";
        }
      }
      const values = [
        [x, rect.x],
        [y, rect.y],
        [width, rect.width],
        [height, rect.height],
      ] as const;
      for (const [value, target] of values) {
        if (animated)
          animations.current.push(
            animate(value, target, transitionRef.current),
          );
        else value.set(target);
      }
    },
    [x, y, width, height],
  );
  const register = useCallback(
    (id: string, slot: HTMLElement) => {
      observers.current.get(id)?.disconnect();
      slots.current.set(id, slot);
      const observer =
        typeof ResizeObserver === "undefined"
          ? null
          : new ResizeObserver(() => measure());
      observer?.observe(slot);
      if (observer) observers.current.set(id, observer);
      measure();
      return () => {
        if (slots.current.get(id) === slot) {
          slots.current.delete(id);
          observers.current.get(id)?.disconnect();
          observers.current.delete(id);
          measure();
        }
      };
    },
    [measure],
  );
  useEffect(() => {
    measure(true);
    const update = () => measure();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
      animations.current.forEach((animation) => animation.stop());
    };
  }, [destination, measure, style?.pointerEvents]);
  const callback = useRef(onDestinationChange);
  callback.current = onDestinationChange;
  const setDestination = useCallback((id: string | null) => {
    setSelected(id);
    callback.current?.(id);
  }, []);
  return (
    <Context.Provider value={{ register, setDestination, destination }}>
      {children}
      <motion.div
        ref={element}
        data-media-host
        className={className}
        style={{
          position: "fixed",
          left: 0,
          top: 0,
          overflow: "hidden",
          visibility: "hidden",
          pointerEvents: "none",
          zIndex: 1002,
          ...style,
          x,
          y,
          width,
          height,
        }}
      >
        {renderMedia}
      </motion.div>
    </Context.Provider>
  );
}
export interface MediaSlotProps extends React.HTMLAttributes<HTMLDivElement> {
  slotId: string;
  activateOnMount?: boolean;
}
export function MediaSlot({
  slotId,
  activateOnMount = false,
  ...props
}: MediaSlotProps) {
  const { register, setDestination } = useMediaHost(),
    ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const dispose = register(slotId, ref.current);
    if (activateOnMount) setDestination(slotId);
    return dispose;
  }, [slotId, activateOnMount, register, setDestination]);
  return <div {...props} ref={ref} data-media-slot={slotId} />;
}

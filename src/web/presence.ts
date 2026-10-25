import { useEffect, useState } from "react";
import { animate, useMotionValue } from "framer-motion";
import { useMotionTransition } from "./provider";
/** Retain semantic ownership until the actual exit completes; reversing cancels that exit. */
export function useRetainedPresence(open: boolean) {
  const [present, setPresent] = useState(open),
    progress = useMotionValue(open ? 1 : 0),
    transition = useMotionTransition();
  useEffect(() => {
    if (open) setPresent(true);
    if (!present && !open) return;
    const animation = animate(progress, open ? 1 : 0, {
      ...transition,
      onComplete: () => {
        if (!open) setPresent(false);
      },
    });
    return () => animation.stop();
  }, [open, present, progress, transition]);
  return { present, progress };
}

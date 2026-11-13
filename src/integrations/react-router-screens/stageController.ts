/**
 * The bridge between the global edge-swipe handler (MobileGestureNavigation)
 * and whichever screen stage is showing. The innermost mounted stage registers
 * itself; the gesture asks it whether the current screen can be dragged back
 * and drives it frame by frame.
 */
export interface InteractiveBackSession {
  /** 0 = untouched, 1 = fully off-screen. */
  update(progress: number): void;
  /** Hand off to the Back navigation; velocity is in screen widths per second. */
  commit(velocity: number): void;
  /** Spring back into place. */
  cancel(velocity: number): void;
  readonly width: number;
}

export interface InteractiveBackStage {
  beginInteractiveBack(): InteractiveBackSession | null;
}

const stack: InteractiveBackStage[] = [];

export function registerInteractiveBackStage(stage: InteractiveBackStage): () => void {
  stack.push(stage);
  return () => {
    const index = stack.lastIndexOf(stage);
    if (index !== -1) stack.splice(index, 1);
  };
}

export function beginInteractiveBack(): InteractiveBackSession | null {
  for (let index = stack.length - 1; index >= 0; index -= 1) {
    const session = stack[index].beginInteractiveBack();
    if (session) return session;
  }
  return null;
}

export function hasInteractiveBackStage(): boolean {
  return stack.length > 0;
}

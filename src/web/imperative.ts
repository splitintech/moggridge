import { animate } from "framer-motion";
export interface ElementMotionOptions {
  enabled?: boolean;
  disabled?: boolean;
  preserveNativeActivation?: boolean;
  reducedMotion?: boolean;
  scale?: number;
  interactionElement?: HTMLElement;
  onActivate?: (event: Event) => void;
}
/** Animate the inner wrapper; bind input to the focusable map marker root via interactionElement. */
export function bindElementMotion(
  element: HTMLElement,
  options: ElementMotionOptions = {},
) {
  const original = element.style.transform,
    interaction = options.interactionElement ?? element;
  let settings = options,
    disposed = false,
    selected = false,
    pressed = false,
    animation: ReturnType<typeof animate> | null = null;
  const render = () => {
    animation?.stop();
    if (disposed) return;
    const scale =
      (selected ? 1.08 : 1) * (pressed ? (settings.scale ?? 0.97) : 1);
    animation = animate(
      element,
      {
        scale: settings.enabled === false || settings.reducedMotion ? 1 : scale,
      },
      {
        duration:
          settings.enabled === false || settings.reducedMotion ? 0 : 0.16,
      },
    );
  };
  const down = () => {
      if (settings.disabled) return;
      pressed = true;
      render();
    },
    up = () => {
      pressed = false;
      render();
    },
    keydown = (event: KeyboardEvent) => {
      if (event.key === "Enter" || event.key === " ") {
        if (settings.disabled) return;
        if (!settings.preserveNativeActivation) event.preventDefault();
        if (!event.repeat) down();
      }
    },
    keyup = (event: KeyboardEvent) => {
      if (event.key === "Enter" || event.key === " ") {
        if (settings.disabled) return;
        if (!settings.preserveNativeActivation) event.preventDefault();
        up();
        if (!settings.preserveNativeActivation) settings.onActivate?.(event);
      }
    },
    click = (event: MouseEvent) => {
      if (!settings.disabled) settings.onActivate?.(event);
    };
  interaction.addEventListener("pointerdown", down);
  interaction.addEventListener("pointerup", up);
  interaction.addEventListener("pointercancel", up);
  interaction.addEventListener("pointerleave", up);
  interaction.addEventListener("blur", up);
  interaction.addEventListener("keydown", keydown);
  interaction.addEventListener("keyup", keyup);
  interaction.addEventListener("click", click);
  return {
    select(value: boolean) {
      selected = value;
      render();
    },
    update(next: ElementMotionOptions) {
      settings = next;
      render();
    },
    destroy() {
      if (disposed) return;
      disposed = true;
      animation?.stop();
      interaction.removeEventListener("pointerdown", down);
      interaction.removeEventListener("pointerup", up);
      interaction.removeEventListener("pointercancel", up);
      interaction.removeEventListener("pointerleave", up);
      interaction.removeEventListener("blur", up);
      interaction.removeEventListener("keydown", keydown);
      interaction.removeEventListener("keyup", keyup);
      interaction.removeEventListener("click", click);
      element.style.transform = original;
    },
  };
}

import { createMotionLifecycle, type MotionEvent, type ResolvedMotionPolicy } from '../core/motion';
export interface EffectCapability { name: string; supported: boolean; platform: 'web' | 'ios' | 'android' | 'test'; reason?: string }
export interface EffectRequest { target: number; policy: ResolvedMotionPolicy }
export interface NativeEffectExtension {
  capabilities(): readonly EffectCapability[];
  start(request: EffectRequest): number;
  retarget(request: EffectRequest): number;
  cancel(reason?: string): void;
  dispose(): void;
}
/** Executable contract double; no speculative native bridge. Engines complete the returned run ID. */
export function createEffectTestDouble(onEvent?: (event: MotionEvent) => void): NativeEffectExtension & {
  complete(id: number): boolean; sample(id: number, position: number, velocity: number): boolean;
} {
  const lifecycle = createMotionLifecycle(onEvent);
  const start = ({target,policy}: EffectRequest) => {
    const id = lifecycle.start(target);
    if (!policy.enabled || policy.reducedMotion) lifecycle.complete(id);
    return id;
  };
  return { capabilities: () => [{name:'scalar-transition',supported:true,platform:'test'}], start, retarget:start,
    cancel:reason=>{lifecycle.cancel(reason);}, dispose:()=>lifecycle.dispose(),
    complete:id=>lifecycle.complete(id), sample:(id,position,velocity)=>lifecycle.sample(id,position,velocity) };
}

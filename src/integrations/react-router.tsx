import { useCallback, useEffect, useRef } from "react";
import {
  useLocation,
  useNavigate,
  type NavigateOptions,
  type To,
} from "react-router-dom";
import { useTransitionHost, type SurfaceRequest } from "../web/hosts";
/** Install in a persistent route layout. This adapter owns each push/pop once. */
export function useMotionRouter() {
  const navigate = useNavigate(),
    location = useLocation(),
    host = useTransitionHost();
  const owned = useRef<{
      origin: To;
      originKey: string;
      target: string | null;
      replace: boolean;
    } | null>(null),
    previous = useRef(location.key),
    latest = useRef(location);
  latest.current = location;
  const rollback = useCallback(() => {
    const transaction = owned.current;
    if (!transaction) return;
    owned.current = null;
    // A blocker can reject navigate without throwing. Never pop the origin in that case.
    if (!transaction.target && latest.current.key === transaction.originKey)
      return;
    if (transaction.replace) navigate(transaction.origin, { replace: true });
    else navigate(-1);
  }, [navigate]);
  useEffect(() => {
    if (previous.current === location.key) return;
    previous.current = location.key;
    if (owned.current && !owned.current.target) {
      owned.current.target = location.key;
      return;
    }
    if (owned.current && owned.current.target !== location.key) {
      owned.current = null;
      host.close();
    }
  }, [location.key, host.close]);
  useEffect(
    () => () => {
      owned.current = null;
      host.close();
    },
    [host.close],
  );
  const cancel = useCallback(() => {
    rollback();
    host.close();
  }, [rollback, host.close]);
  const open = useCallback(
    (to: To, request: SurfaceRequest, options?: NavigateOptions) => {
      if (owned.current) return;
      owned.current = {
        origin: {
          pathname: location.pathname,
          search: location.search,
          hash: location.hash,
        },
        originKey: location.key,
        target: null,
        replace: !!options?.replace,
      };
      host.open({
        ...request,
        onClose: () => {
          request.onClose?.();
          rollback();
        },
      });
      try {
        navigate(to, options);
      } catch (error) {
        owned.current = null;
        host.close();
        throw error;
      }
    },
    [
      host.open,
      host.close,
      location.pathname,
      location.search,
      location.hash,
      location.key,
      navigate,
      rollback,
    ],
  );
  const reveal = useCallback(
    (request: SurfaceRequest) => host.open(request),
    [host.open],
  );
  return { open, reveal, cancel, close: host.close, activeId: host.activeId };
}

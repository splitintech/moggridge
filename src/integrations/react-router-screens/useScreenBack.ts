import { useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { hasHistoryEntry, setPendingScreenIntent } from "./history";
import { useScreenNavigation } from "./tracker";

/**
 * An in-app Back button.
 *
 * With screen motion on, it goes back when there is history and otherwise to
 * the screen's logical parent (from the route table), and it animates even in
 * iOS Safari, where browser-initiated Back is left to the browser. With motion
 * off (no tracker mounted) it is exactly `navigate(-1)`.
 */
export function useScreenBack() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const nav = useScreenNavigation();
  return useCallback(() => {
    if (!nav?.enabled) {
      navigate(-1);
      return;
    }
    const hasHistory = hasHistoryEntry();
    setPendingScreenIntent({ origin: "in-app-back" }, hasHistory ? "POP" : "REPLACE");
    if (hasHistory) navigate(-1);
    else navigate(nav.table.logicalParentPath(pathname), { replace: true });
  }, [nav, navigate, pathname]);
}

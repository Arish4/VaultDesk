import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";

/**
 * The selected building lives in the URL (?building=3), not in React state, so the
 * choice survives a refresh, works with back/forward, and can be shared as a link.
 */
export function useBuilding() {
  const [params, setParams] = useSearchParams();
  const building = params.get("building") ?? "";

  const setBuilding = useCallback(
    (id) =>
      setParams((current) => {
        const next = new URLSearchParams(current);
        if (id) next.set("building", id);
        else next.delete("building");
        return next;
      }),
    [setParams],
  );

  return [building, setBuilding];
}

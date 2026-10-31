import { useCallback, useEffect, useState } from "react";

/**
 * Loads data from an async function and tracks loading / error state.
 *
 *   const { data, loading, error, reload } = useApi((signal) => spacesApi.get(id, signal), [id]);
 *
 * When deps change, the previous request is aborted, so an old slow response can never
 * overwrite newer data (a classic race condition with useEffect + fetch).
 */
export function useApi(request, deps) {
  const [state, setState] = useState({ data: null, error: null, loading: true });
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setState((previous) => ({ ...previous, loading: true, error: null }));

    request(controller.signal)
      .then((data) => setState({ data, error: null, loading: false }))
      .catch((error) => {
        if (error.name !== "AbortError") setState({ data: null, error, loading: false });
      });

    return () => controller.abort(); // cleanup runs before the next effect and on unmount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, version]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);
  return { ...state, reload };
}

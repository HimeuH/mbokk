import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * True only after the client has hydrated — false on the server and on the
 * client's first render, so a component can safely defer anything that
 * reads client-only state (localStorage, etc.) without a hydration
 * mismatch. useSyncExternalStore's server/client snapshot split does this
 * natively; unlike `useEffect(() => setMounted(true), [])`, it never calls
 * setState from inside an effect (react-hooks/set-state-in-effect).
 */
export function useMounted(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}

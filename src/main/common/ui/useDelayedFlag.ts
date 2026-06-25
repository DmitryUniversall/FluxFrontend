import { useEffect, useState } from "react";

/**
 * Anti-flicker helper: mirrors a boolean, but a false->true transition is
 * reported only after `delayMs`. Used for loading spinners so loads faster
 * than the delay never flash one - the screen simply goes from old content
 * to new content.
 */
export function useDelayedFlag(value: boolean, delayMs = 150): boolean {
    const [delayed, setDelayed] = useState(value && delayMs <= 0);
    useEffect(() => {
        if (!value) {
            setDelayed(false);
            return;
        }
        const t = setTimeout(() => setDelayed(true), delayMs);
        return () => clearTimeout(t);
    }, [value, delayMs]);
    return value && delayed;
}

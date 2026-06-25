// Closes a transient popup (dropdown, inline menu) on Escape. Native context
// menus already handle this; use it for custom dropdowns. Esc is safe to handle
// even while typing - it shouldn't interfere with text input.
import { useEffect } from "react";

export function useEscClose(active: boolean, onClose: () => void): void {
    useEffect(() => {
        if (!active) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                e.stopPropagation();
                onClose();
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [active, onClose]);
}

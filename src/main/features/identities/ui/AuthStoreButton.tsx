import { KeyRound } from "lucide-react";
import { cn } from "@/main/common/utils/cn";
import { useAuthStoreScreen } from "./useAuthStoreScreen";

export function AuthStoreButton() {
    const open = useAuthStoreScreen((s) => s.open);
    const toggle = useAuthStoreScreen((s) => s.toggle);

    return (
        <button
            onClick={toggle}
            title="Auth store"
            aria-label="Auth store"
            className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full transition-colors ring-accent",
                open ? "bg-accent/15 text-accent" : "text-muted hover:bg-elevated hover:text-fg",
            )}
        >
            <KeyRound size={16} />
        </button>
    );
}

import { TerminalSquare } from "lucide-react";
import { ANCHORS, tourAnchor } from "@/main/features/guide/domain/anchors";
import { cn } from "@/main/common/utils/cn";
import { useRequestConsole } from "./useRequestConsole";

export function RequestConsoleButton() {
    const open = useRequestConsole((s) => s.open);
    const unseen = useRequestConsole((s) => s.unseen);
    const toggle = useRequestConsole((s) => s.toggle);

    return (
        <button
            onClick={toggle}
            title="Request console"
            aria-label="Request console"
            {...tourAnchor(ANCHORS.consoleButton)}
            className={cn(
                "relative flex h-8 w-8 items-center justify-center rounded-full transition-colors ring-accent",
                open ? "bg-accent/15 text-accent" : "text-muted hover:bg-elevated hover:text-fg",
            )}
        >
            <TerminalSquare size={16} />
            {unseen > 0 && !open && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-white">
                    {unseen > 9 ? "9+" : unseen}
                </span>
            )}
        </button>
    );
}

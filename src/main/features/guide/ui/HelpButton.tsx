import { HelpCircle } from "lucide-react";
import { cn } from "@/main/common/utils/cn";
import type { Tour } from "../domain/types";
import { useHelp } from "./useHelp";

/** A small round "?" that offers a screen-scoped tutorial. It asks the user
 *  first (via the confirm dialog) rather than launching straight away. Pass a
 *  static `tour`, or a `run` launcher for tours that build a sandbox first. */
export function HelpButton({
    title,
    tour,
    run,
    className,
}: {
    title: string;
    tour?: Tour;
    run?: () => void | Promise<void>;
    className?: string;
}) {
    const launch = run ?? (tour ? () => useHelp.getState().startTour(tour) : () => {});
    return (
        <button
            type="button"
            onClick={() => useHelp.getState().askTour(title, launch)}
            title={`Tutorial: ${title}`}
            aria-label={`Tutorial: ${title}`}
            className={cn(
                "flex h-7 w-7 items-center justify-center rounded-md text-subtle transition-colors hover:bg-elevated hover:text-accent ring-accent",
                className,
            )}
        >
            <HelpCircle size={16} />
        </button>
    );
}

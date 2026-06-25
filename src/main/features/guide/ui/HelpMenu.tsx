import { AnimatePresence, motion } from "framer-motion";
import {
    BookOpen,
    ChevronRight,
    Compass,
    Fingerprint,
    Footprints,
    Handshake,
    HelpCircle,
    PackageOpen,
    Sparkles,
    type LucideIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/main/common/utils/cn";
import { useChangelog } from "@/main/features/changelog/ui/useChangelog";
import { useWhatsNew } from "@/main/features/changelog/ui/useWhatsNew";
import { ANCHORS, tourAnchor } from "../domain/anchors";
import { useHelp } from "./useHelp";

/** The global "?" in the top bar: documentation, plus a nested "Tours" flyout
 *  with the replayable onboarding and the follow-up tutorials. */
export function HelpMenu() {
    const [open, setOpen] = useState(false);
    const [toursOpen, setToursOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const hasUnseen = useWhatsNew((s) => s.hasUnseen);
    const openDocs = useHelp((s) => s.openDocs);
    const startOnboarding = useHelp((s) => s.startOnboarding);
    const startImportTour = useHelp((s) => s.startImportTour);
    const startCollaborationTour = useHelp((s) => s.startCollaborationTour);
    const startAuthStoreTour = useHelp((s) => s.startAuthStoreTour);

    useEffect(() => {
        const onClick = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
                setToursOpen(false);
            }
        };
        window.addEventListener("mousedown", onClick);
        return () => window.removeEventListener("mousedown", onClick);
    }, []);

    const run = (fn: () => void) => () => {
        setOpen(false);
        setToursOpen(false);
        fn();
    };

    return (
        <div className="relative" ref={ref}>
            <button
                {...tourAnchor(ANCHORS.helpButton)}
                onClick={() => setOpen((v) => !v)}
                title="Help & onboarding"
                aria-label="Help & onboarding"
                className="relative flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-elevated hover:text-fg ring-accent"
            >
                <HelpCircle size={17} />
                {hasUnseen && (
                    <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-accent ring-2 ring-surface" />
                )}
            </button>

            <AnimatePresence>
                {open && (
                    <motion.div
                        className="absolute right-0 z-50 mt-1.5 w-60 rounded-xl border border-border bg-elevated p-1 shadow-2xl"
                        initial={{ opacity: 0, scale: 0.97, y: -4 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.97 }}
                        transition={{ duration: 0.12 }}
                    >
                        <p className="px-2.5 pb-1 pt-1.5 text-[10.5px] font-semibold uppercase tracking-wide text-subtle">
                            Help
                        </p>
                        <MenuItem icon={BookOpen} label="Documentation" onClick={run(openDocs)} />
                        <MenuItem
                            icon={Sparkles}
                            label="What's new"
                            badge={hasUnseen}
                            onClick={run(() => useChangelog.getState().show())}
                        />

                        {/* Tours live in a nested flyout that opens beside the menu on hover. */}
                        <div
                            className="relative"
                            onMouseEnter={() => setToursOpen(true)}
                            onMouseLeave={() => setToursOpen(false)}
                        >
                            <button
                                className={cn(
                                    "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-[13px] text-fg transition-colors hover:bg-surface",
                                    toursOpen && "bg-surface",
                                )}
                            >
                                <Compass size={15} className="shrink-0 text-subtle" />
                                <span className="flex-1">Tours</span>
                                <ChevronRight size={14} className="text-subtle" />
                            </button>

                            <AnimatePresence>
                                {toursOpen && (
                                    <motion.div
                                        className="absolute right-full top-0 w-56 rounded-xl border border-border bg-elevated p-1 shadow-2xl"
                                        initial={{ opacity: 0, scale: 0.97, x: 4 }}
                                        animate={{ opacity: 1, scale: 1, x: 0 }}
                                        exit={{ opacity: 0, scale: 0.97 }}
                                        transition={{ duration: 0.1 }}
                                    >
                                        <p className="px-2.5 pb-1 pt-1.5 text-[10.5px] font-semibold uppercase tracking-wide text-subtle">
                                            Tours
                                        </p>
                                        <MenuItem
                                            icon={Footprints}
                                            label="Take onboarding again"
                                            hint="Creates a fresh sandbox"
                                            onClick={run(() => void startOnboarding())}
                                        />
                                        <MenuItem
                                            icon={PackageOpen}
                                            label="Import tour"
                                            onClick={run(startImportTour)}
                                        />
                                        <MenuItem
                                            icon={Handshake}
                                            label="Collaboration tour"
                                            onClick={run(startCollaborationTour)}
                                        />
                                        <MenuItem
                                            icon={Fingerprint}
                                            label="Auth store tour"
                                            onClick={run(() => void startAuthStoreTour())}
                                        />
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function MenuItem({
    icon: Icon,
    label,
    hint,
    badge,
    onClick,
}: {
    icon: LucideIcon;
    label: string;
    hint?: string;
    badge?: boolean;
    onClick: () => void;
}) {
    return (
        <button
            onClick={onClick}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-[13px] text-fg transition-colors hover:bg-surface"
        >
            <Icon size={15} className="shrink-0 text-subtle" />
            <span className="min-w-0 flex-1">
                <span className="block truncate">{label}</span>
                {hint && <span className="block truncate text-[11px] text-subtle">{hint}</span>}
            </span>
            {badge && <span className="h-2 w-2 shrink-0 rounded-full bg-accent" />}
        </button>
    );
}

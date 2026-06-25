import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Sparkles, X } from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";
import type { Placement, ScreenSpot, TourStep } from "../domain/types";
import { CopyChip } from "./CopyChip";
import type { Rect } from "./useTargetRect";

/** The concrete side a beak points at (after `auto` is resolved). */
type Beak = "top" | "bottom" | "left" | "right";

const GAP = 14; // distance between target and callout
const MARGIN = 12; // min distance from viewport edge
const OVERLAP_PAD = 10; // breathing room kept between the callout and its target
const BEAK = 9; // beak triangle half-base
const FALLBACK = { w: 330, h: 200 }; // size estimate before first measure

const SCREEN_SPOTS = new Set<ScreenSpot>([
    "center",
    "top-left",
    "top-center",
    "top-right",
    "left-center",
    "right-center",
    "bottom-left",
    "bottom-center",
    "bottom-right",
]);

interface Props {
    step: TourStep;
    index: number;
    total: number;
    rect: Rect | null;
    viewport: { w: number; h: number };
    /** Whether the (manual) gate is satisfied - controls the Next button. */
    gateMet: boolean;
    onNext: () => void;
    onBack: () => void;
    onEnd: () => void;
}

export function GuideCallout({ step, index, total, rect, viewport, gateMet, onNext, onBack, onEnd }: Props) {
    const ref = useRef<HTMLDivElement>(null);
    const [size, setSize] = useState(FALLBACK);

    // Measure after layout so positioning uses the real box; re-measure when the
    // step (content) or available space changes.
    useLayoutEffect(() => {
        const el = ref.current;
        if (!el) return;
        setSize({ w: el.offsetWidth, h: el.offsetHeight });
    }, [step.id, rect, viewport.w, viewport.h]);

    const placement: Placement = step.placement ?? (rect ? "auto" : "center");
    const { top, left, beak } = place(rect, placement, size, viewport);

    const gate = step.gate ?? { kind: "manual" as const };
    const manualAdvance = gate.kind === "manual" || (gate.kind === "condition" && !!gate.manual);
    const isLast = index === total - 1;
    const canGoBack = index > 0;

    return (
        <motion.div
            key={step.id}
            ref={ref}
            role="dialog"
            aria-label={step.title}
            className="pointer-events-auto fixed z-[120] w-[330px] max-w-[calc(100vw-24px)] rounded-2xl border border-border bg-elevated shadow-2xl shadow-black/40"
            style={{ top, left }}
            initial={{ opacity: 0, scale: 0.96, y: beak === "top" ? 6 : -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        >
            {rect && beak && <BeakArrow side={beak} rect={rect} calloutTop={top} calloutLeft={left} size={size} />}

            {/* header: progress + end */}
            <div className="flex items-center gap-2 px-4 pt-3">
                <span className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wide text-accent">
                    <Sparkles size={12} /> Guide
                </span>
                <span className="text-[11px] font-medium text-subtle">
                    {index + 1} / {total}
                </span>
                <div className="ml-auto flex items-center gap-1">
                    <button
                        onClick={onEnd}
                        title="End tour"
                        className="flex h-6 w-6 items-center justify-center rounded-md text-subtle transition-colors hover:bg-surface hover:text-fg"
                    >
                        <X size={14} />
                    </button>
                </div>
            </div>

            {/* progress bar */}
            <div className="mx-4 mt-2 h-1 overflow-hidden rounded-full bg-surface">
                <motion.div
                    className="h-full rounded-full bg-accent"
                    initial={false}
                    animate={{ width: `${((index + 1) / total) * 100}%` }}
                    transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                />
            </div>

            {/* body */}
            <div className="px-4 pb-3 pt-3">
                <h3 className="text-[14px] font-semibold text-fg">{step.title}</h3>
                {step.body && <div className="mt-1.5 text-[12.5px] leading-relaxed text-muted">{step.body}</div>}

                {step.copy && step.copy.length > 0 && (
                    <div className="mt-2.5 flex flex-col gap-1.5">
                        {step.copy.map((item, i) => (
                            <CopyChip key={i} item={item} />
                        ))}
                    </div>
                )}

                {step.hint && !gateMet && (
                    <div className="mt-2.5 flex items-start gap-1.5 rounded-lg bg-accent/10 px-2.5 py-1.5 text-[12px] text-accent">
                        <ArrowRight size={13} className="mt-0.5 shrink-0" />
                        <span>{step.hint}</span>
                    </div>
                )}
            </div>

            {/* footer */}
            <div className="flex items-center gap-2 border-t border-border px-4 py-2.5">
                {canGoBack ? (
                    <button
                        onClick={onBack}
                        className="flex items-center gap-1 rounded-lg px-2 py-1 text-[12px] font-medium text-muted transition-colors hover:bg-surface hover:text-fg"
                    >
                        <ArrowLeft size={13} /> Back
                    </button>
                ) : (
                    <button
                        onClick={onEnd}
                        className="rounded-lg px-2 py-1 text-[12px] font-medium text-subtle transition-colors hover:text-fg"
                    >
                        Skip tour
                    </button>
                )}

                <div className="ml-auto">
                    {manualAdvance ? (
                        <button
                            onClick={onNext}
                            disabled={!gateMet}
                            className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-[12.5px] font-semibold text-white shadow-sm shadow-accent/20 transition-all hover:brightness-110 active:brightness-95 disabled:pointer-events-none disabled:opacity-40"
                        >
                            {isLast ? (
                                <>
                                    Finish <Check size={14} />
                                </>
                            ) : (
                                <>
                                    Next <ArrowRight size={14} />
                                </>
                            )}
                        </button>
                    ) : (
                        <span className="flex items-center gap-1.5 text-[11.5px] font-medium text-subtle">
                            <motion.span
                                className="h-1.5 w-1.5 rounded-full bg-accent"
                                animate={{ opacity: [1, 0.25, 1], scale: [1, 0.8, 1] }}
                                transition={{ duration: 1.3, repeat: Infinity, ease: "easeInOut" }}
                            />
                            Watching…
                        </span>
                    )}
                </div>
            </div>
        </motion.div>
    );
}

// positioning

function place(
    rect: Rect | null,
    placement: Placement,
    size: { w: number; h: number },
    vp: { w: number; h: number },
): { top: number; left: number; beak: Beak | null } {
    // exact coordinates
    if (typeof placement === "object") {
        const left = coord(placement.x, vp.w);
        const top = coord(placement.y, vp.h);
        return {
            top: clamp(top, MARGIN, vp.h - size.h - MARGIN),
            left: clamp(left, MARGIN, vp.w - size.w - MARGIN),
            beak: null,
        };
    }

    // fixed screen spot (independent of the target)
    if (SCREEN_SPOTS.has(placement as ScreenSpot)) {
        return { ...screenSpot(placement as ScreenSpot, size, vp), beak: null };
    }

    // beside the target
    if (!rect) {
        return { top: (vp.h - size.h) / 2, left: (vp.w - size.w) / 2, beak: null };
    }
    const r = { ...rect, right: rect.left + rect.width, bottom: rect.top + rect.height };
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const side: Beak = placement === "auto" ? autoSide(r, size, vp) : (placement as Beak);

    let top = 0;
    let left = 0;
    switch (side) {
        case "bottom":
            top = r.bottom + GAP;
            left = cx - size.w / 2;
            break;
        case "top":
            top = r.top - GAP - size.h;
            left = cx - size.w / 2;
            break;
        case "right":
            left = r.right + GAP;
            top = cy - size.h / 2;
            break;
        case "left":
            left = r.left - GAP - size.w;
            top = cy - size.h / 2;
            break;
    }
    top = clamp(top, MARGIN, vp.h - size.h - MARGIN);
    left = clamp(left, MARGIN, vp.w - size.w - MARGIN);

    // If the target is large, the clamped box can land on top of it (or the
    // controls inside it). In that case drop the beak and park the message in the
    // freest screen spot away from the target - so it never covers what it points
    // at or the UI the user needs to touch.
    const box = { left, top, right: left + size.w, bottom: top + size.h };
    if (overlaps(box, r)) {
        return { ...bestFreeSpot(r, size, vp), beak: null };
    }
    return { top, left, beak: side };
}

const overlaps = (
    a: { left: number; top: number; right: number; bottom: number },
    b: { left: number; top: number; right: number; bottom: number },
) =>
    a.left < b.right + OVERLAP_PAD &&
    a.right > b.left - OVERLAP_PAD &&
    a.top < b.bottom + OVERLAP_PAD &&
    a.bottom > b.top - OVERLAP_PAD;

const overlapArea = (
    a: { left: number; top: number; right: number; bottom: number },
    b: { left: number; top: number; right: number; bottom: number },
) =>
    Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) *
    Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));

/** Pick the screen spot whose box clears the target best (and sits farthest from it). */
function bestFreeSpot(
    target: { left: number; top: number; right: number; bottom: number },
    size: { w: number; h: number },
    vp: { w: number; h: number },
): { top: number; left: number } {
    const tcx = (target.left + target.right) / 2;
    const tcy = (target.top + target.bottom) / 2;
    const spots: ScreenSpot[] = [
        "bottom-right",
        "bottom-left",
        "top-right",
        "top-left",
        "right-center",
        "left-center",
        "bottom-center",
        "top-center",
        "center",
    ];
    let best = screenSpot("bottom-right", size, vp);
    let bestScore = -Infinity;
    for (const s of spots) {
        const p = screenSpot(s, size, vp);
        const box = { left: p.left, top: p.top, right: p.left + size.w, bottom: p.top + size.h };
        const ov = overlapArea(box, target);
        const dist = Math.hypot(p.left + size.w / 2 - tcx, p.top + size.h / 2 - tcy);
        // No-overlap spots always beat overlapping ones; among equals, prefer far.
        const score = ov > 0 ? -ov : 1_000_000 + dist;
        if (score > bestScore) {
            bestScore = score;
            best = p;
        }
    }
    return best;
}

function screenSpot(spot: ScreenSpot, size: { w: number; h: number }, vp: { w: number; h: number }) {
    const leftEdge = MARGIN;
    const centerX = (vp.w - size.w) / 2;
    const rightEdge = vp.w - size.w - MARGIN;
    const topEdge = MARGIN;
    const middleY = (vp.h - size.h) / 2;
    const bottomEdge = vp.h - size.h - MARGIN;

    const X = { left: leftEdge, center: centerX, right: rightEdge };
    const Y = { top: topEdge, middle: middleY, bottom: bottomEdge };

    switch (spot) {
        case "center":
            return { top: Y.middle, left: X.center };
        case "top-left":
            return { top: Y.top, left: X.left };
        case "top-center":
            return { top: Y.top, left: X.center };
        case "top-right":
            return { top: Y.top, left: X.right };
        case "left-center":
            return { top: Y.middle, left: X.left };
        case "right-center":
            return { top: Y.middle, left: X.right };
        case "bottom-left":
            return { top: Y.bottom, left: X.left };
        case "bottom-center":
            return { top: Y.bottom, left: X.center };
        case "bottom-right":
            return { top: Y.bottom, left: X.right };
    }
}

function autoSide(
    r: Rect & { right: number; bottom: number },
    size: { w: number; h: number },
    vp: { w: number; h: number },
): Beak {
    const space = { bottom: vp.h - r.bottom, top: r.top, right: vp.w - r.right, left: r.left };
    if (space.bottom >= size.h + GAP + MARGIN) return "bottom";
    if (space.top >= size.h + GAP + MARGIN) return "top";
    if (space.right >= size.w + GAP + MARGIN) return "right";
    if (space.left >= size.w + GAP + MARGIN) return "left";
    return (Object.entries(space).sort((a, b) => b[1] - a[1])[0]?.[0] as Beak) ?? "bottom";
}

const coord = (v: number | `${number}%`, total: number): number =>
    typeof v === "number" ? v : (parseFloat(v) / 100) * total;

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), Math.max(lo, hi));

// beak (little arrow that points from the callout at the target)

function BeakArrow({
    side,
    rect,
    calloutTop,
    calloutLeft,
    size,
}: {
    side: Beak;
    rect: Rect;
    calloutTop: number;
    calloutLeft: number;
    size: { w: number; h: number };
}) {
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const fill = "rgb(var(--elevated))";
    const stroke = "rgb(var(--border))";

    // Vertical beaks (target above/below) slide along the top/bottom edge;
    // horizontal beaks slide along the left/right edge - clamped off the corners.
    if (side === "top" || side === "bottom") {
        const x = clamp(cx - calloutLeft, 16, size.w - 16);
        const onTop = side === "bottom"; // callout below target -> beak on its top edge
        return (
            <svg
                width={BEAK * 2}
                height={BEAK}
                viewBox={`0 0 ${BEAK * 2} ${BEAK}`}
                className="pointer-events-none absolute"
                style={{ left: x - BEAK, [onTop ? "top" : "bottom"]: -BEAK + 1 }}
            >
                {onTop ? (
                    <>
                        <path d={`M0 ${BEAK} L${BEAK} 0 L${BEAK * 2} ${BEAK} Z`} fill={fill} />
                        <path d={`M0 ${BEAK} L${BEAK} 0 L${BEAK * 2} ${BEAK}`} fill="none" stroke={stroke} />
                    </>
                ) : (
                    <>
                        <path d={`M0 0 L${BEAK} ${BEAK} L${BEAK * 2} 0 Z`} fill={fill} />
                        <path d={`M0 0 L${BEAK} ${BEAK} L${BEAK * 2} 0`} fill="none" stroke={stroke} />
                    </>
                )}
            </svg>
        );
    }

    const y = clamp(cy - calloutTop, 16, size.h - 16);
    const onLeft = side === "right"; // callout right of target -> beak on its left edge
    return (
        <svg
            width={BEAK}
            height={BEAK * 2}
            viewBox={`0 0 ${BEAK} ${BEAK * 2}`}
            className="pointer-events-none absolute"
            style={{ top: y - BEAK, [onLeft ? "left" : "right"]: -BEAK + 1 }}
        >
            {onLeft ? (
                <>
                    <path d={`M${BEAK} 0 L0 ${BEAK} L${BEAK} ${BEAK * 2} Z`} fill={fill} />
                    <path d={`M${BEAK} 0 L0 ${BEAK} L${BEAK} ${BEAK * 2}`} fill="none" stroke={stroke} />
                </>
            ) : (
                <>
                    <path d={`M0 0 L${BEAK} ${BEAK} L0 ${BEAK * 2} Z`} fill={fill} />
                    <path d={`M0 0 L${BEAK} ${BEAK} L0 ${BEAK * 2}`} fill="none" stroke={stroke} />
                </>
            )}
        </svg>
    );
}

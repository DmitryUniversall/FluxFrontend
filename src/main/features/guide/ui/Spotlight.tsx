import { AnimatePresence, motion } from "framer-motion";
import type { Rect } from "./useTargetRect";

const MASK_ID = "guide-spotlight-mask";
const SPRING = { type: "spring", stiffness: 380, damping: 34 } as const;

/**
 * The focus layer. Two independent jobs:
 *   - `dim`        darken the page (with a rounded hole punched out of the
 *                  target when we're also highlighting), via an SVG mask.
 *   - `highlight`  draw a pulsing accent ring around the target.
 * Either can run without the other: highlight-without-dim is a non-intrusive
 * coach-mark; dim-without-highlight is a focused "welcome" backdrop.
 *
 * Remounting the ring per `stepKey` gives a crisp fade-in at each new target
 * instead of a slide across the screen, while within a step it tracks the
 * target as it scrolls.
 */
export function Spotlight({
    rect,
    viewport,
    padding,
    radius,
    dim,
    highlight,
    stepKey,
}: {
    rect: Rect | null;
    viewport: { w: number; h: number };
    padding: number;
    radius: number;
    dim: boolean;
    highlight: boolean;
    stepKey: string;
}) {
    const hole =
        rect && highlight
            ? {
                  x: rect.left - padding,
                  y: rect.top - padding,
                  width: rect.width + padding * 2,
                  height: rect.height + padding * 2,
              }
            : null;

    return (
        <>
            {dim && (
                <svg
                    className="pointer-events-none fixed inset-0 z-[100]"
                    width={viewport.w}
                    height={viewport.h}
                    aria-hidden
                >
                    {hole ? (
                        <>
                            <defs>
                                <mask id={MASK_ID}>
                                    {/* white = dimmed, black = clear hole */}
                                    <rect x={0} y={0} width={viewport.w} height={viewport.h} fill="white" />
                                    <motion.rect
                                        initial={false}
                                        animate={{ x: hole.x, y: hole.y, width: hole.width, height: hole.height }}
                                        transition={SPRING}
                                        rx={radius}
                                        ry={radius}
                                        fill="black"
                                    />
                                </mask>
                            </defs>
                            <rect
                                x={0}
                                y={0}
                                width={viewport.w}
                                height={viewport.h}
                                fill="rgb(7 9 13 / 0.66)"
                                mask={`url(#${MASK_ID})`}
                            />
                        </>
                    ) : (
                        <rect x={0} y={0} width={viewport.w} height={viewport.h} fill="rgb(7 9 13 / 0.66)" />
                    )}
                </svg>
            )}

            <AnimatePresence>
                {hole && (
                    <motion.div
                        key={stepKey}
                        className="pointer-events-none fixed z-[110]"
                        style={{ borderRadius: radius }}
                        initial={{ opacity: 0, scale: 1.08 }}
                        animate={{
                            opacity: 1,
                            scale: 1,
                            top: hole.y,
                            left: hole.x,
                            width: hole.width,
                            height: hole.height,
                        }}
                        exit={{ opacity: 0 }}
                        transition={{
                            opacity: { duration: 0.2 },
                            scale: { duration: 0.2 },
                            top: SPRING,
                            left: SPRING,
                            width: SPRING,
                            height: SPRING,
                        }}
                    >
                        {/* solid ring */}
                        <div
                            className="absolute inset-0"
                            style={{ borderRadius: "inherit", boxShadow: "0 0 0 2px rgb(var(--accent))" }}
                        />
                        {/* breathing glow */}
                        <motion.div
                            className="absolute inset-0"
                            style={{ borderRadius: "inherit" }}
                            animate={{
                                boxShadow: [
                                    "0 0 0 4px rgb(var(--accent) / 0.28), 0 0 22px 2px rgb(var(--accent) / 0.35)",
                                    "0 0 0 7px rgb(var(--accent) / 0.10), 0 0 30px 6px rgb(var(--accent) / 0.18)",
                                    "0 0 0 4px rgb(var(--accent) / 0.28), 0 0 22px 2px rgb(var(--accent) / 0.35)",
                                ],
                            }}
                            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}

// The single global host for the running tour. Mounted once near the app root
// (next to <Toaster/>). It reads the engine store, tracks the target element,
// runs each step's lifecycle + gate, and renders the dimming/spotlight and the
// floating instruction box through a portal so it floats above everything.
import { AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { guideBus } from "../domain/guide-bus";
import { stepSelector } from "../domain/anchors";
import type { TourStep } from "../domain/types";
import { GuideCallout } from "./GuideCallout";
import { Spotlight } from "./Spotlight";
import { useGuide } from "./useGuide";
import { useTargetRect, useViewport } from "./useTargetRect";

export function GuideLayer() {
    const running = useGuide((s) => s.running);
    const tour = useGuide((s) => s.tour);
    const index = useGuide((s) => s.index);

    const step: TourStep | null = running && tour ? (tour.steps[index] ?? null) : null;
    const total = tour?.steps.length ?? 0;
    const selector = step ? stepSelector(step) : null;

    const viewport = useViewport();
    const rect = useTargetRect(selector, !!step);
    const [gateMet, setGateMet] = useState(false);

    // lifecycle: onEnter / onLeave + scroll target into view
    const enteredKey = useRef<string | null>(null);
    const prevStep = useRef<TourStep | null>(null);
    useEffect(() => {
        if (!running || !tour) {
            if (prevStep.current) void prevStep.current.onLeave?.();
            prevStep.current = null;
            enteredKey.current = null;
            return;
        }
        const active = tour.steps[index];
        if (!active) return;
        const key = `${tour.id}#${index}`;
        if (enteredKey.current === key) return; // guard StrictMode double-invoke / stray re-renders
        if (prevStep.current && prevStep.current !== active) void prevStep.current.onLeave?.();
        enteredKey.current = key;
        prevStep.current = active;
        void active.onEnter?.();

        // The element may be mounted by onEnter (a panel opening); retry briefly.
        const sel = stepSelector(active);
        if (!sel) return;
        let tries = 0;
        const iv = setInterval(() => {
            const el = document.querySelector(sel);
            if (el) {
                el.scrollIntoView({ block: "center", inline: "center", behavior: "smooth" });
                clearInterval(iv);
            } else if (++tries > 20) {
                clearInterval(iv);
            }
        }, 100);
        return () => clearInterval(iv);
    }, [running, tour, index]);

    // gate: decide when the step completes
    useEffect(() => {
        setGateMet(false);
        if (!running || !tour) return;
        const active = tour.steps[index];
        if (!active) return;
        const gate = active.gate ?? { kind: "manual" as const };
        const sel = stepSelector(active);
        const advance = () => useGuide.getState().next();

        if (gate.kind === "manual") {
            setGateMet(true);
            return;
        }

        if (gate.kind === "click") {
            // Listen on the real target (capture phase) so the user's own click both
            // performs the action and advances the tour. Re-attach if it remounts.
            let el: Element | null = null;
            const handler = () => advance();
            const attach = () => {
                const found = sel ? document.querySelector(sel) : null;
                if (found && found !== el) {
                    el?.removeEventListener("click", handler, true);
                    el = found;
                    el.addEventListener("click", handler, true);
                }
            };
            attach();
            const iv = setInterval(attach, 150);
            return () => {
                clearInterval(iv);
                el?.removeEventListener("click", handler, true);
            };
        }

        if (gate.kind === "event") {
            return guideBus.subscribe((name) => {
                if (name === gate.name) advance();
            });
        }

        // condition: poll until satisfied, then auto-advance (or just enable Next).
        const pollMs = gate.pollMs ?? 300;
        const evaluate = (): boolean => {
            let ok = false;
            try {
                ok = gate.check();
            } catch {
                ok = false;
            }
            if (!ok) return false;
            if (gate.manual) setGateMet(true);
            else advance();
            return true;
        };
        if (evaluate()) return;
        const iv = setInterval(() => {
            if (evaluate()) clearInterval(iv);
        }, pollMs);
        return () => clearInterval(iv);
    }, [running, tour, index]);

    // end on Escape
    useEffect(() => {
        if (!running) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") useGuide.getState().end("skip");
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [running]);

    if (!step || !tour) return null;

    // Highlight (ring) and dim (dark backdrop) are independent. Default: a step
    // with a target highlights it; dimming follows the highlight unless overridden
    // - so you can spotlight an element without darkening the whole screen.
    const hasTarget = !!selector;
    const highlight = step.highlight ?? hasTarget;
    const dim = step.dim ?? highlight;

    return createPortal(
        // Rendered as flat siblings (no wrapping stacking context) so the dim, ring
        // and callout keep distinct z-layers. That lets a portalled dropdown sit
        // above the dim while the ring/callout still sit above the dropdown - needed
        // to highlight a specific menu item. Nothing here blocks the page; the
        // callout opts into pointer events itself.
        <>
            {(dim || highlight) && (
                <Spotlight
                    rect={rect}
                    viewport={viewport}
                    padding={step.padding ?? 8}
                    radius={step.radius ?? 12}
                    dim={dim}
                    highlight={highlight}
                    stepKey={`${tour.id}#${index}`}
                />
            )}
            <AnimatePresence mode="wait">
                <GuideCallout
                    key={`${tour.id}#${index}`}
                    step={step}
                    index={index}
                    total={total}
                    rect={hasTarget ? rect : null}
                    viewport={viewport}
                    gateMet={gateMet}
                    onNext={() => useGuide.getState().next()}
                    onBack={() => useGuide.getState().back()}
                    onEnd={() => useGuide.getState().end("skip")}
                />
            </AnimatePresence>
        </>,
        document.body,
    );
}

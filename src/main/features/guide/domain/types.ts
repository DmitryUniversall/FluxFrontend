// The Guide SDK: a small declarative engine for product tours / coach-marks.
// A `Tour` is an ordered list of `TourStep`s. Each step can highlight an element,
// optionally dim the rest of the screen, show a floating message ("do this
// next") anywhere on screen, and decide for itself when it is complete (its
// `gate`) - so the tour refuses to advance until the user has actually done the
// right thing (e.g. pasted the copied value into a real input).
import type { ReactNode } from "react";

// Placement
// The message box can sit beside the highlighted target, at a fixed spot on the
// screen (independent of any target), or at exact coordinates.

/** Beside the highlighted target - a little beak points at it. */
export type TargetSide = "top" | "bottom" | "left" | "right" | "auto";

/** A fixed spot on the screen, regardless of the target (a 3×3 grid). */
export type ScreenSpot =
    | "center"
    | "top-left"
    | "top-center"
    | "top-right"
    | "left-center"
    | "right-center"
    | "bottom-left"
    | "bottom-center"
    | "bottom-right";

/** Exact viewport position of the callout's top-left corner. px number or `"50%"`. */
export interface ScreenPoint {
    x: number | `${number}%`;
    y: number | `${number}%`;
}

export type Placement = TargetSide | ScreenSpot | ScreenPoint;

/** Named shortcuts for the common screen spots - `placement: screen.left` ("слева по центру"). */
export const screen = {
    center: "center",
    topLeft: "top-left",
    top: "top-center",
    topRight: "top-right",
    left: "left-center",
    right: "right-center",
    bottomLeft: "bottom-left",
    bottom: "bottom-center",
    bottomRight: "bottom-right",
} as const satisfies Record<string, ScreenSpot>;

/** Place the message at exact coordinates: `placement: at("50%", 120)`. */
export const at = (x: ScreenPoint["x"], y: ScreenPoint["y"]): ScreenPoint => ({ x, y });

// Content / gating

/**
 * A value the user can drop onto the clipboard with one click - so they never
 * hand-type a URL or JSON body. They paste it into the real interface field the
 * step points at; a `condition` gate then validates that field.
 */
export interface CopyItem {
    /** Chip label; defaults to the value itself. */
    label?: string;
    /** Text written to the clipboard. */
    value: string;
    /** Render hint only (monospace for code). Default true. */
    mono?: boolean;
}

/**
 * How a step is considered complete. Until the gate is satisfied the tour will
 * not move on - this is what lets the guide block progress when the user did
 * the wrong thing or an error occurred.
 *
 *  - `manual`     a "Next" button the user presses (the default).
 *  - `click`      advances the moment the highlighted target is clicked.
 *  - `event`      advances when app code calls `guide.signal(name)`.
 *  - `condition`  polls `check()`; when it returns true the step completes -
 *                 auto-advancing, or merely enabling "Next" when `manual` is set.
 */
export type Gate =
    | { kind: "manual" }
    | { kind: "click" }
    | { kind: "event"; name: string }
    | { kind: "condition"; check: () => boolean; pollMs?: number; manual?: boolean };

export interface TourStep {
    /** Stable id - used for React keys, enter/leave bookkeeping and analytics. */
    id: string;

    // Targeting
    /** A `data-tour` id to point at, resolved as `[data-tour="<anchor>"]`. */
    anchor?: string;
    /** Raw CSS selector to point at (alternative to `anchor`). */
    selector?: string;
    /** Where the message box sits. Default: `"auto"` beside the target, else `"center"`. */
    placement?: Placement;

    // Content
    title: string;
    body?: ReactNode;
    /** One-click "copy to clipboard" chips rendered under the body. */
    copy?: CopyItem[];

    // Visuals (independent toggles)
    /** Draw the accent ring around the target. Default: true when a target exists. */
    highlight?: boolean;
    /** Darken the rest of the screen. Default: follows `highlight`. Set false to
     *  highlight an element without dimming everything; set true on a target-less
     *  step for a focused "welcome" backdrop. */
    dim?: boolean;
    /** Extra px of breathing room around the highlight ring / hole. Default 8. */
    padding?: number;
    /** Corner radius of the ring / hole. Default 12. */
    radius?: number;

    // Gating
    /** How this step completes. Default `{ kind: "manual" }`. */
    gate?: Gate;
    /** Call-to-action shown while the gate is still unmet (accent-toned). */
    hint?: string;

    // Lifecycle
    /** Runs when the step becomes active - e.g. open the panel it points at. Must be idempotent. */
    onEnter?: () => void | Promise<void>;
    /** Runs when leaving the step in either direction. */
    onLeave?: () => void | Promise<void>;
}

export interface Tour {
    id: string;
    /** Optional human label (e.g. shown in a "you're in onboarding" pill later). */
    title?: string;
    steps: TourStep[];
    /** Fired when the user reaches the end of the tour. */
    onComplete?: () => void;
    /** Fired when the user ends the tour early. */
    onSkip?: () => void;
}

/** Identity helper that gives full type-checking + inference when authoring a tour. */
export const defineTour = (tour: Tour): Tour => tour;

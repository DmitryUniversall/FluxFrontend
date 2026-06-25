// Ready-made predicates for `condition` gates, so onboarding steps can validate
// that the user did the thing in the real UI - e.g. pasted the copied URL into
// the request's URL field - without each step re-writing the DOM lookup.
//
//   gate: { kind: "condition", check: fieldEquals(urlSelector, EXAMPLE_URL) }

/** Current value of an input/textarea/select matched by selector ("" if absent). */
export function fieldValue(selector: string): string {
    const el = document.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(selector);
    return el?.value ?? "";
}

/** True once the field's trimmed value equals `expected`. */
export const fieldEquals = (selector: string, expected: string) => (): boolean =>
    fieldValue(selector).trim() === expected.trim();

/** True once the field contains `substr` (handy for templated values like {{var}}). */
export const fieldContains = (selector: string, substr: string) => (): boolean => fieldValue(selector).includes(substr);

/** True once an element matching the selector is present in the DOM. */
export const elementExists = (selector: string) => (): boolean => !!document.querySelector(selector);

/** True once the element is absent (e.g. a modal has closed). */
export const elementGone = (selector: string) => (): boolean => !document.querySelector(selector);

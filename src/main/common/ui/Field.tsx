import { Check } from "lucide-react";
import { forwardRef, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "../utils/cn";

const base =
    "w-full rounded-lg bg-surface border border-border px-3 text-sm text-fg placeholder:text-subtle transition-colors hover:border-subtle focus:border-accent ring-accent";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
    ({ className, ...rest }, ref) => <input ref={ref} className={cn(base, "h-9", className)} {...rest} />,
);
Input.displayName = "Input";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
    ({ className, ...rest }, ref) => (
        <textarea ref={ref} className={cn(base, "py-2 resize-none", className)} {...rest} />
    ),
);
Textarea.displayName = "Textarea";

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
    ({ className, children, ...rest }, ref) => (
        <select ref={ref} className={cn(base, "h-9 cursor-pointer appearance-none pr-8", className)} {...rest}>
            {children}
        </select>
    ),
);
Select.displayName = "Select";

export function Label({ children }: { children: React.ReactNode }) {
    return <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-subtle">{children}</label>;
}

// Dark-theme-friendly checkbox: a custom box (so it doesn't render as a stark
// light native control) with a checkmark when checked.
export const Checkbox = forwardRef<HTMLInputElement, Omit<InputHTMLAttributes<HTMLInputElement>, "type">>(
    ({ className, ...rest }, ref) => (
        <span className={cn("relative inline-flex h-4 w-4 shrink-0 items-center justify-center", className)}>
            <input
                ref={ref}
                type="checkbox"
                className="peer h-4 w-4 cursor-pointer appearance-none rounded-[5px] border border-border bg-bg transition-colors hover:border-subtle checked:border-accent checked:bg-accent ring-accent"
                {...rest}
            />
            <Check
                size={11}
                strokeWidth={3.5}
                className="pointer-events-none absolute inset-0 m-auto hidden text-white peer-checked:block"
            />
        </span>
    ),
);
Checkbox.displayName = "Checkbox";

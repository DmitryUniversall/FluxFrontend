import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "../utils/cn";

type Variant = "primary" | "ghost" | "subtle" | "danger";
type Size = "sm" | "md";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: Variant;
    size?: Size;
    leftIcon?: ReactNode;
}

const variants: Record<Variant, string> = {
    primary: "bg-accent text-white hover:brightness-110 active:brightness-95 shadow-sm shadow-accent/20",
    ghost: "text-muted hover:text-fg hover:bg-elevated",
    subtle: "bg-elevated text-fg border border-border hover:border-subtle",
    danger: "text-red-400 hover:bg-red-500/10",
};
const sizes: Record<Size, string> = {
    sm: "h-7 px-2.5 text-[13px] gap-1.5",
    md: "h-9 px-4 text-sm gap-2",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    ({ variant = "subtle", size = "md", leftIcon, className, children, ...rest }, ref) => (
        <button
            ref={ref}
            className={cn(
                "inline-flex items-center justify-center rounded-lg font-medium transition-all ring-accent disabled:opacity-40 disabled:pointer-events-none",
                variants[variant],
                sizes[size],
                className,
            )}
            {...rest}
        >
            {leftIcon}
            {children}
        </button>
    ),
);
Button.displayName = "Button";

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    label: string;
}
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
    ({ label, className, children, ...rest }, ref) => (
        <button
            ref={ref}
            title={label}
            aria-label={label}
            className={cn(
                "inline-flex h-7 w-7 items-center justify-center rounded-md text-muted transition-colors hover:bg-elevated hover:text-fg ring-accent",
                className,
            )}
            {...rest}
        >
            {children}
        </button>
    ),
);
IconButton.displayName = "IconButton";

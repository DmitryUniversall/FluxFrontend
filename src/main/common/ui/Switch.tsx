// On/off toggle switch matching the dark theme - used across the settings
// screen. Accessible (role=switch) and keyboard-operable as a <button>.
import { cn } from "@/main/common/utils/cn";

interface Props {
    checked: boolean;
    onChange: (checked: boolean) => void;
    disabled?: boolean;
    label?: string;
}

export function Switch({ checked, onChange, disabled, label }: Props) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            aria-label={label}
            disabled={disabled}
            onClick={() => onChange(!checked)}
            className={cn(
                "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ring-accent disabled:opacity-40",
                checked ? "bg-accent" : "bg-elevated border border-border",
            )}
        >
            <span
                className={cn(
                    "inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform",
                    checked ? "translate-x-[18px]" : "translate-x-[3px]",
                )}
            />
        </button>
    );
}

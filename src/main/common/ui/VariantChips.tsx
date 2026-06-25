// Quick-pick chips for choosing one of a fixed set of preset variants. Used
// wherever a "selected" value is switched fast: the env side panel, the run
// form, and flow Call/Wait args. Selection-only - the variant list itself is
// edited elsewhere (the environment modal / Inputs tab) via OptionsEditor.
import { cn } from "@/main/common/utils/cn";

interface Props {
    options: string[];
    value: string;
    onPick: (value: string) => void;
    className?: string;
}

export function VariantChips({ options, value, onPick, className }: Props) {
    const variants = options.filter((o) => o.trim() !== "");
    if (variants.length === 0) return null;
    return (
        <div className={cn("flex flex-wrap gap-1", className)}>
            {variants.map((opt, i) => {
                const active = opt === value;
                return (
                    <button
                        key={`${opt}-${i}`}
                        type="button"
                        onClick={() => onPick(opt)}
                        title={opt}
                        className={cn(
                            "mono max-w-[14rem] truncate rounded-md border px-2 py-0.5 text-[12px] transition-colors",
                            active
                                ? "border-accent/60 bg-accent/15 text-accent"
                                : "border-border bg-surface text-muted hover:border-subtle hover:text-fg",
                        )}
                    >
                        {opt}
                    </button>
                );
            })}
        </div>
    );
}

// Editor for the fixed list of preset variants behind a "selected" value.
// Lives in modals/editors (environment modal, Inputs tab) - never in the quick
// side surfaces, which only pick a variant (see VariantChips).
//
// When `current`/`onSelectCurrent` are supplied (environment "selected" vars) a
// radio marks the active option, and edits/removals keep the current selection
// in sync so the chosen value never points at a stale or deleted variant.
import { Plus, Trash2 } from "lucide-react";
import { Button, IconButton } from "@/main/common/ui/Button";
import { HighlightedInput } from "@/main/common/ui/HighlightedInput";

interface Props {
    options: string[];
    onChange: (options: string[]) => void;
    // Optional "active variant" semantics: render a radio per row.
    current?: string;
    onSelectCurrent?: (value: string) => void;
    placeholder?: string;
    addLabel?: string;
}

export function OptionsEditor({
    options,
    onChange,
    current,
    onSelectCurrent,
    placeholder = "variant value",
    addLabel = "Add variant",
}: Props) {
    const selectable = !!onSelectCurrent;

    const edit = (i: number, value: string) => {
        const prev = options[i];
        const next = options.map((o, idx) => (idx === i ? value : o));
        onChange(next);
        // Keep the active selection pointing at the (renamed) option.
        if (selectable && prev === current) onSelectCurrent!(value);
    };

    const remove = (i: number) => {
        const removed = options[i];
        const next = options.filter((_, idx) => idx !== i);
        onChange(next);
        if (selectable && removed === current) onSelectCurrent!(next[0] ?? "");
    };

    const add = () => onChange([...options, ""]);

    return (
        <div className="space-y-1.5">
            {options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                    {selectable && (
                        <input
                            type="radio"
                            checked={opt === current}
                            onChange={() => onSelectCurrent!(opt)}
                            title="Use this variant"
                            className="h-3.5 w-3.5 shrink-0 accent-accent"
                        />
                    )}
                    <HighlightedInput
                        value={opt}
                        onChange={(v) => edit(i, v)}
                        placeholder={placeholder}
                        wrapperClassName="h-8 flex-1 rounded-lg border border-border bg-bg"
                        textClassName="px-2.5 mono text-[13px]"
                    />
                    <IconButton label="Remove variant" onClick={() => remove(i)}>
                        <Trash2 size={13} />
                    </IconButton>
                </div>
            ))}
            <Button variant="ghost" size="sm" leftIcon={<Plus size={14} />} onClick={add}>
                {addLabel}
            </Button>
        </div>
    );
}

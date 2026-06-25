// Deliberately lightweight code editor: a styled textarea with tab handling.
// No Monaco - keeps the app fast to load and snappy to type in, which is the
// whole point of this tool.
import { useRef } from "react";
import { cn } from "@/main/common/utils/cn";

interface CodeEditorProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    minHeight?: number;
}

export function CodeEditor({ value, onChange, placeholder, minHeight = 220 }: CodeEditorProps) {
    const ref = useRef<HTMLTextAreaElement>(null);

    const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Tab") {
            e.preventDefault();
            const el = e.currentTarget;
            const start = el.selectionStart;
            const end = el.selectionEnd;
            const next = value.slice(0, start) + "  " + value.slice(end);
            onChange(next);
            requestAnimationFrame(() => {
                el.selectionStart = el.selectionEnd = start + 2;
            });
        }
    };

    return (
        <div className="overflow-hidden rounded-xl border border-border bg-bg">
            <div className="flex items-center justify-between border-b border-border bg-surface px-3 py-1.5">
                <span className="mono text-[11px] uppercase tracking-wide text-subtle">JavaScript</span>
                <span className="mono text-[11px] text-subtle">pm.environment.set("token", …)</span>
            </div>
            <textarea
                ref={ref}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder={placeholder}
                spellCheck={false}
                className={cn(
                    "mono block w-full resize-none bg-transparent p-3 text-[13px] leading-relaxed text-fg outline-none placeholder:text-subtle",
                )}
                style={{ minHeight }}
            />
        </div>
    );
}

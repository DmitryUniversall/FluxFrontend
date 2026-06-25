import { cn } from "../utils/cn";

export interface TabItem {
    id: string;
    label: string;
    badge?: number;
}

interface TabsProps {
    items: TabItem[];
    active: string;
    onChange: (id: string) => void;
    size?: "sm" | "md";
}

export function Tabs({ items, active, onChange, size = "md" }: TabsProps) {
    return (
        <div className="flex items-center gap-1 border-b border-border">
            {items.map((item) => {
                const isActive = item.id === active;
                return (
                    <button
                        key={item.id}
                        data-tour={`tab-${item.id}`}
                        onClick={() => onChange(item.id)}
                        className={cn(
                            "relative flex items-center gap-1.5 font-medium transition-colors ring-accent",
                            size === "sm" ? "px-2.5 py-2 text-[13px]" : "px-3.5 py-2.5 text-sm",
                            isActive ? "text-fg" : "text-subtle hover:text-muted",
                        )}
                    >
                        {item.label}
                        {item.badge ? (
                            <span className="rounded-full bg-accent/15 px-1.5 text-[10px] font-semibold text-accent">
                                {item.badge}
                            </span>
                        ) : null}
                        {/* Static underline - no layout animation, so it never jumps on
                re-render (e.g. while sending) or after the tab regains focus. */}
                        {isActive && <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-accent" />}
                    </button>
                );
            })}
        </div>
    );
}

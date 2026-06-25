import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "../utils/cn";

export function Spinner({ className }: { className?: string }) {
    return <Loader2 className={cn("animate-spin", className)} />;
}

export function EmptyState({ icon, title, hint }: { icon?: ReactNode; title: string; hint?: string }) {
    return (
        <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center">
            {icon && <div className="text-subtle">{icon}</div>}
            <p className="text-sm font-medium text-muted">{title}</p>
            {hint && <p className="max-w-xs text-xs text-subtle">{hint}</p>}
        </div>
    );
}

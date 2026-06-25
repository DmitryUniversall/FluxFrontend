import { cn } from "../utils/cn";

export function methodColor(method: string): string {
    switch (method.toUpperCase()) {
        case "GET":
            return "text-emerald-400";
        case "POST":
            return "text-amber-400";
        case "PUT":
            return "text-blue-400";
        case "PATCH":
            return "text-violet-400";
        case "DELETE":
            return "text-red-400";
        default:
            return "text-muted";
    }
}

export function MethodBadge({ method, className }: { method: string; className?: string }) {
    return (
        <span className={cn("mono text-[11px] font-semibold tracking-wide", methodColor(method), className)}>
            {method.toUpperCase()}
        </span>
    );
}

export function statusColor(status: number): string {
    if (status >= 200 && status < 300) return "text-emerald-400";
    if (status >= 300 && status < 400) return "text-blue-400";
    if (status >= 400 && status < 500) return "text-amber-400";
    if (status >= 500) return "text-red-400";
    return "text-muted";
}

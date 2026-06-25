// Tiny dependency-free SVG sparkline for the dashboard metric cards.
import { cn } from "@/main/common/utils/cn";

interface SparklineProps {
    values: number[];
    width?: number;
    height?: number;
    className?: string;
}

export function Sparkline({ values, width = 260, height = 44, className }: SparklineProps) {
    if (values.length === 0) {
        return <div className="text-[11px] text-subtle">No data yet</div>;
    }
    const max = Math.max(...values, 1);
    const stepX = values.length > 1 ? width / (values.length - 1) : 0;
    const points = values
        .map((v, i) => `${(i * stepX).toFixed(1)},${(height - (v / max) * height).toFixed(1)}`)
        .join(" ");
    const last = values[values.length - 1];
    const lastX = (values.length - 1) * stepX;
    const lastY = height - (last / max) * height;

    return (
        <svg
            viewBox={`0 0 ${width} ${height}`}
            preserveAspectRatio="none"
            className={cn("h-11 w-full text-accent", className)}
        >
            <polyline
                points={points}
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                vectorEffect="non-scaling-stroke"
            />
            <circle cx={lastX} cy={lastY} r={2} fill="currentColor" />
        </svg>
    );
}

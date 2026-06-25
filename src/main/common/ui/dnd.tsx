// Shared drag-and-drop helpers built on dnd-kit + the pure moveItem tree util.
// One DndContext is mounted at the root of an editor; every level is a
// SortableContext keyed by its container id. treeDragEnd resolves the active /
// over containers from dnd-kit's sortable data and applies an atomic tree move.
import {
    closestCenter,
    DndContext,
    KeyboardSensor,
    PointerSensor,
    useDroppable,
    useSensor,
    useSensors,
    type DragEndEvent,
} from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { CSSProperties, HTMLAttributes, ReactNode } from "react";
import { cn } from "../utils/cn";
import { moveItem, ROOT, type ChildrenOf, type WithChildren } from "../utils/dnd-tree";

export { DndContext, closestCenter };

export function useDndSensors() {
    return useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(KeyboardSensor));
}

interface SortableRenderProps {
    setNodeRef: (el: HTMLElement | null) => void;
    style: CSSProperties;
    handle: HTMLAttributes<HTMLElement>;
    isDragging: boolean;
    /** True while another draggable hovers this item (drop-target feedback). */
    isOver: boolean;
}

export function SortableItem({
    id,
    disabled,
    children,
}: {
    id: string;
    disabled?: boolean;
    children: (p: SortableRenderProps) => ReactNode;
}) {
    const { setNodeRef, transform, transition, attributes, listeners, isDragging, isOver } = useSortable({
        id,
        disabled,
    });
    const style: CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : undefined,
        position: "relative",
        zIndex: isDragging ? 50 : undefined,
    };
    return (
        <>
            {children({
                setNodeRef,
                style,
                handle: { ...attributes, ...listeners } as HTMLAttributes<HTMLElement>,
                isDragging,
                isOver,
            })}
        </>
    );
}

// Drop target for an empty container, so a node can be dragged into it.
export function EmptyDrop({ containerId, label = "drop a step here" }: { containerId: string; label?: string }) {
    const { setNodeRef, isOver } = useDroppable({ id: "empty:" + containerId });
    return (
        <div
            ref={setNodeRef}
            className={cn(
                "rounded-lg border border-dashed px-2.5 py-2 text-[11px]",
                isOver ? "border-accent text-accent" : "border-border text-subtle",
            )}
        >
            {label}
        </div>
    );
}

export function treeDragEnd<T extends { id: string }>(
    e: DragEndEvent,
    root: T[],
    ch: ChildrenOf<T>,
    w: WithChildren<T>,
    apply: (next: T[]) => void,
) {
    const { active, over } = e;
    if (!over) return;
    const activeId = String(active.id);
    const aSortable = (active.data.current as { sortable?: { containerId?: string } } | undefined)?.sortable;
    const oSortable = (over.data.current as { sortable?: { containerId?: string; index?: number } } | undefined)
        ?.sortable;
    const activeContainer = String(aSortable?.containerId ?? ROOT);

    let overContainer: string;
    let overIndex: number;
    if (oSortable) {
        overContainer = String(oSortable.containerId);
        overIndex = Number(oSortable.index ?? 0);
    } else if (String(over.id).startsWith("empty:")) {
        overContainer = String(over.id).slice(6);
        overIndex = 0;
    } else {
        overContainer = String(over.id);
        overIndex = 0;
    }

    if (activeId === String(over.id)) return;
    const next = moveItem(root, ch, w, activeId, activeContainer, overContainer, overIndex);
    if (next) apply(next);
}

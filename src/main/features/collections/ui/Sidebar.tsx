import {
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    Copy,
    FileDown,
    FolderPlus,
    MoreHorizontal,
    Pencil,
    Plus,
    TerminalSquare,
    Trash2,
    Workflow,
} from "lucide-react";
import { useState } from "react";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { PointerSensor, useDroppable, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { useLayout } from "@/main/common/ui/useLayout";
import { ANCHORS, tourAnchor } from "@/main/features/guide/domain/anchors";
import { toast } from "@/main/common/ui/toast";
import { useEnvironments } from "@/main/features/environments/ui/useEnvironments";
import { useIdentities } from "@/main/features/identities/ui/useIdentities";
import { requestsRepository } from "@/main/features/request-editor/data/requests-repository";
import { toCurl } from "@/main/features/request-editor/domain/curl";
import { buildOutgoing } from "@/main/features/request-editor/domain/use-cases";
import { useRequestEditor } from "@/main/features/request-editor/ui/useRequestEditor";
import { canWrite } from "@/main/features/workspaces/domain/models";
import { WorkspaceSwitcher } from "@/main/features/workspaces/ui/WorkspaceSwitcher";
import { closestCenter, DndContext, SortableItem } from "@/main/common/ui/dnd";
import { ContextMenu, type MenuItem, type MenuPosition } from "@/main/common/ui/ContextMenu";
import { MethodBadge } from "@/main/common/ui/badges";
import { EmptyState } from "@/main/common/ui/feedback";
import { IconButton } from "@/main/common/ui/Button";
import { cn } from "@/main/common/utils/cn";
import type { CollectionNode, RequestSummary } from "../domain/models";
import { useCollections } from "./useCollections";
import { useSidebarState } from "./useSidebarState";
import { useSwaggerImport } from "@/main/features/swagger-import/ui/useSwaggerImport";

// Sortable id scheme: "col:<id>" for collections (container "collections"),
// "req:<id>" for requests (container = the collection id). The prefixes make
// the drag-end handler trivially type-aware.
const colId = (id: string) => `col:${id}`;
const reqId = (id: string) => `req:${id}`;

export function Sidebar() {
    const vm = useCollections();
    const { sidebarCollapsed, toggleSidebar } = useLayout();
    const expanded = useSidebarState((s) => s.expanded);
    const toggle = useSidebarState((s) => s.toggle);
    const expand = useSidebarState((s) => s.expand);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [menu, setMenu] = useState<{ pos: MenuPosition; items: MenuItem[] } | null>(null);
    // Pointer-only on purpose: rows are focusable buttons, and the keyboard
    // sensor would hijack Enter/Space (select) to start a drag instead. The 5px
    // activation distance keeps plain clicks working.
    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

    const addCollection = async () => {
        const id = await vm.createCollection("New collection");
        if (id) expand(id); // show the freshly created (empty) folder
    };

    const addRequest = (collectionId: string, kind?: "http" | "flow") => {
        expand(collectionId); // reveal what was just created
        void vm.createRequest(collectionId, kind);
    };

    const collectionMenu = (col: CollectionNode): MenuItem[] => {
        const items: MenuItem[] = [
            { id: "add", label: "Add request", icon: <Plus size={14} />, onSelect: () => addRequest(col.id) },
            {
                id: "add-flow",
                label: "Add flow",
                icon: <Workflow size={14} />,
                onSelect: () => addRequest(col.id, "flow"),
            },
        ];
        if (canWrite(col.role)) {
            items.push({
                id: "import-swagger",
                label: "Import from Swagger…",
                icon: <FileDown size={14} />,
                separatorBefore: true,
                onSelect: () => useSwaggerImport.getState().openFor(col.id),
            });
            items.push({
                id: "rename",
                label: "Rename",
                icon: <Pencil size={14} />,
                separatorBefore: true,
                onSelect: () => setEditingId(col.id),
            });
            items.push({
                id: "delete",
                label: "Delete collection",
                icon: <Trash2 size={14} />,
                danger: true,
                onSelect: () => vm.deleteCollection(col.id),
            });
        }
        return items;
    };

    const copyCurl = async (req: RequestSummary) => {
        try {
            const live = useRequestEditor.getState().request;
            const full = live && live.id === req.id ? live : await requestsRepository.get(req.id);
            const withAuth = { ...full, auth: useIdentities.getState().resolve(full.auth) };
            const outgoing = buildOutgoing(withAuth, useEnvironments.getState().resolve);
            await navigator.clipboard?.writeText(toCurl(outgoing));
            toast.success("Copied as cURL");
        } catch {
            toast.error("Couldn't copy cURL");
        }
    };

    const requestMenu = (req: RequestSummary): MenuItem[] => {
        const items: MenuItem[] = [
            {
                id: "duplicate",
                label: "Duplicate",
                icon: <Copy size={14} />,
                onSelect: () => vm.duplicateRequest(req.id),
            },
        ];
        if (req.kind !== "flow") {
            items.push({
                id: "curl",
                label: "Copy as cURL",
                icon: <TerminalSquare size={14} />,
                onSelect: () => void copyCurl(req),
            });
        }
        items.push({
            id: "delete",
            label: "Delete request",
            icon: <Trash2 size={14} />,
            danger: true,
            separatorBefore: true,
            onSelect: () => vm.deleteRequest(req.id),
        });
        return items;
    };

    const openMenu = (e: React.MouseEvent, items: MenuItem[]) => {
        e.preventDefault();
        e.stopPropagation();
        setMenu({ pos: { x: e.clientX, y: e.clientY }, items });
    };

    // ---- drag-and-drop -------------------------------------------------------
    const collectionOf = (requestId: string) => vm.tree.find((c) => c.requests.some((r) => r.id === requestId));

    const onDragEnd = (e: DragEndEvent) => {
        const { active, over } = e;
        if (!over) return;
        const a = String(active.id);
        const o = String(over.id);
        if (a === o) return;
        const overSortable = (over.data.current as { sortable?: { containerId?: string; index?: number } } | undefined)
            ?.sortable;

        if (a.startsWith("col:")) {
            // Reorder collections. Dropping over a request counts as over its folder.
            const activeColId = a.slice(4);
            const overColId = o.startsWith("col:")
                ? o.slice(4)
                : o.startsWith("req:")
                  ? collectionOf(o.slice(4))?.id
                  : o.startsWith("empty:")
                    ? o.slice(6)
                    : undefined;
            if (!overColId || overColId === activeColId) return;
            const ids = vm.tree.map((c) => c.id);
            const from = ids.indexOf(activeColId);
            const to = ids.indexOf(overColId);
            if (from < 0 || to < 0 || from === to) return;
            ids.splice(from, 1);
            ids.splice(to, 0, activeColId);
            void vm.reorderCollections(ids);
            return;
        }

        if (a.startsWith("req:")) {
            const requestId = a.slice(4);
            let targetColId: string | undefined;
            let index = 0;
            if (o.startsWith("req:")) {
                targetColId = overSortable?.containerId != null ? String(overSortable.containerId) : undefined;
                index = Number(overSortable?.index ?? 0);
            } else if (o.startsWith("empty:")) {
                targetColId = o.slice(6);
                index = 0;
            } else if (o.startsWith("col:")) {
                // Dropping onto a folder header (e.g. a collapsed one) appends to it.
                targetColId = o.slice(4);
                index = vm.tree.find((c) => c.id === targetColId)?.requests.length ?? 0;
            }
            const target = targetColId ? vm.tree.find((c) => c.id === targetColId) : undefined;
            if (!target || !canWrite(target.role)) return;
            const source = collectionOf(requestId);
            if (source?.id === target.id && source.requests.findIndex((r) => r.id === requestId) === index) return;
            if (source?.id !== target.id) expand(target.id); // show where it landed
            void vm.moveRequest(requestId, target.id, index);
        }
    };

    if (sidebarCollapsed) {
        return (
            <aside className="flex w-9 shrink-0 flex-col items-center gap-2 border-r border-border bg-surface py-2.5">
                <IconButton label="Show collections" onClick={toggleSidebar}>
                    <ChevronsRight size={16} />
                </IconButton>
                <div className="mt-1 rotate-180 text-[11px] font-semibold uppercase tracking-wider text-subtle [writing-mode:vertical-rl]">
                    Collections
                </div>
            </aside>
        );
    }

    return (
        <aside
            className="flex h-full w-[264px] shrink-0 flex-col border-r border-border bg-surface"
            {...tourAnchor(ANCHORS.sidebar)}
        >
            <WorkspaceSwitcher />
            <div className="flex items-center justify-between px-3.5 pb-2 pt-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-subtle">Collections</span>
                <div className="flex items-center gap-0.5">
                    <IconButton
                        label="Import from Swagger / OpenAPI"
                        onClick={() => useSwaggerImport.getState().openFor()}
                    >
                        <FileDown size={15} />
                    </IconButton>
                    <IconButton label="New collection" onClick={addCollection}>
                        <FolderPlus size={15} />
                    </IconButton>
                    <IconButton label="Collapse" onClick={toggleSidebar}>
                        <ChevronsLeft size={15} />
                    </IconButton>
                </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
                {vm.tree.length === 0 ? (
                    <EmptyState
                        icon={<FolderPlus size={22} />}
                        title="No collections"
                        hint="Create one to start adding requests."
                    />
                ) : (
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                        <SortableContext
                            id="collections"
                            items={vm.tree.map((c) => colId(c.id))}
                            strategy={verticalListSortingStrategy}
                        >
                            {vm.tree.map((col) => {
                                const isExpanded = !!expanded[col.id];
                                const writable = canWrite(col.role);
                                return (
                                    <SortableItem key={col.id} id={colId(col.id)} disabled={!writable}>
                                        {({ setNodeRef, style, handle, isOver }) => (
                                            <div ref={setNodeRef} style={style} className="mb-0.5">
                                                <div
                                                    {...handle}
                                                    className={cn(
                                                        "group flex items-center gap-1 rounded-lg px-1.5 py-1.5 hover:bg-elevated",
                                                        isOver && "bg-accent/10 ring-1 ring-inset ring-accent/40",
                                                    )}
                                                    onContextMenu={(e) => openMenu(e, collectionMenu(col))}
                                                >
                                                    <button
                                                        onClick={() => toggle(col.id)}
                                                        className="text-subtle ring-accent"
                                                    >
                                                        <ChevronRight
                                                            size={14}
                                                            className={cn(
                                                                "transition-transform",
                                                                isExpanded && "rotate-90",
                                                            )}
                                                        />
                                                    </button>
                                                    {editingId === col.id ? (
                                                        <input
                                                            autoFocus
                                                            defaultValue={col.name}
                                                            className="h-6 flex-1 rounded border border-accent bg-bg px-1.5 text-[13px] outline-none"
                                                            onPointerDown={(e) =>
                                                                e.stopPropagation()
                                                            } /* don't start a drag while selecting text */
                                                            onBlur={(e) => {
                                                                const v = e.target.value.trim();
                                                                if (v && v !== col.name) vm.renameCollection(col.id, v);
                                                                setEditingId(null);
                                                            }}
                                                            onKeyDown={(e) => {
                                                                e.stopPropagation(); /* keep keys away from the drag keyboard sensor */
                                                                if (e.key === "Enter")
                                                                    (e.target as HTMLInputElement).blur();
                                                                if (e.key === "Escape") setEditingId(null);
                                                            }}
                                                        />
                                                    ) : (
                                                        <button
                                                            onClick={() => toggle(col.id)}
                                                            onDoubleClick={() => writable && setEditingId(col.id)}
                                                            className="flex min-w-0 flex-1 items-center gap-1.5 text-left text-[13px] font-medium text-fg"
                                                        >
                                                            <span className="truncate">{col.name}</span>
                                                        </button>
                                                    )}
                                                    <span className="mono text-[11px] text-subtle opacity-0 group-hover:opacity-100">
                                                        {col.requests.length}
                                                    </span>
                                                    <IconButton
                                                        label="Add request"
                                                        className="opacity-0 group-hover:opacity-100"
                                                        onClick={() => addRequest(col.id)}
                                                    >
                                                        <Plus size={14} />
                                                    </IconButton>
                                                    <IconButton
                                                        label="More"
                                                        className="opacity-0 group-hover:opacity-100"
                                                        onClick={(e) => openMenu(e, collectionMenu(col))}
                                                    >
                                                        <MoreHorizontal size={14} />
                                                    </IconButton>
                                                </div>

                                                {isExpanded && (
                                                    <div className="ml-3.5 border-l border-border pl-1.5">
                                                        <SortableContext
                                                            id={col.id}
                                                            items={col.requests.map((r) => reqId(r.id))}
                                                            strategy={verticalListSortingStrategy}
                                                        >
                                                            {col.requests.length === 0 ? (
                                                                <EmptyCollectionDrop collectionId={col.id} />
                                                            ) : (
                                                                col.requests.map((req) => {
                                                                    const selected = vm.selectedRequestId === req.id;
                                                                    return (
                                                                        <SortableItem
                                                                            key={req.id}
                                                                            id={reqId(req.id)}
                                                                            disabled={!writable}
                                                                        >
                                                                            {({
                                                                                setNodeRef: setReqRef,
                                                                                style: reqStyle,
                                                                                handle: reqHandle,
                                                                            }) => (
                                                                                <button
                                                                                    ref={setReqRef}
                                                                                    style={reqStyle}
                                                                                    {...reqHandle}
                                                                                    data-tour={`req-${req.id}`}
                                                                                    onClick={() => vm.select(req.id)}
                                                                                    onContextMenu={(e) =>
                                                                                        openMenu(e, requestMenu(req))
                                                                                    }
                                                                                    className={cn(
                                                                                        "group flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors",
                                                                                        selected
                                                                                            ? "bg-accent/15 text-fg"
                                                                                            : "text-muted hover:bg-elevated hover:text-fg",
                                                                                    )}
                                                                                >
                                                                                    {req.kind === "flow" ? (
                                                                                        <span className="flex w-10 shrink-0 items-center justify-center">
                                                                                            <Workflow
                                                                                                size={14}
                                                                                                className="text-accent"
                                                                                            />
                                                                                        </span>
                                                                                    ) : (
                                                                                        <MethodBadge
                                                                                            method={req.method}
                                                                                            className="w-10 shrink-0"
                                                                                        />
                                                                                    )}
                                                                                    <span className="flex-1 truncate text-[13px]">
                                                                                        {req.name}
                                                                                    </span>
                                                                                </button>
                                                                            )}
                                                                        </SortableItem>
                                                                    );
                                                                })
                                                            )}
                                                        </SortableContext>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </SortableItem>
                                );
                            })}
                        </SortableContext>
                    </DndContext>
                )}
            </div>

            <ContextMenu position={menu?.pos ?? null} items={menu?.items ?? []} onClose={() => setMenu(null)} />
        </aside>
    );
}

/** Drop target inside an expanded empty folder, so a request can be dragged in. */
function EmptyCollectionDrop({ collectionId }: { collectionId: string }) {
    const { setNodeRef, isOver } = useDroppable({ id: "empty:" + collectionId });
    return (
        <p
            ref={setNodeRef}
            className={cn(
                "rounded-lg px-2 py-1 text-[12px] transition-colors",
                isOver ? "bg-accent/10 text-accent" : "text-subtle",
            )}
        >
            Empty
        </p>
    );
}

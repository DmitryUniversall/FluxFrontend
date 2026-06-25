// Shared authoring tool for content blocks (the same ContentBlock model the docs
// and changelog render). Provides an icon palette to add blocks, drag-and-drop
// reordering, per-block duplicate/delete, and helpers to import/normalize blocks
// from arbitrary JSON. Reusable anywhere blocks are edited (releases, docs).
import { DndContext, closestCenter, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, verticalListSortingStrategy } from "@dnd-kit/sortable";
import {
    Code,
    Copy,
    GripVertical,
    Heading,
    Image as ImageIcon,
    Link2,
    List,
    ListOrdered,
    Pilcrow,
    PlayCircle,
    Plus,
    StickyNote,
    Tag,
    Trash2,
    type LucideIcon,
} from "lucide-react";
import { useRef, useState, type ReactNode } from "react";
import { AnchoredMenu } from "./AnchoredMenu";
import { Button, IconButton } from "./Button";
import { SortableItem, useDndSensors } from "./dnd";
import { Input, Select, Textarea } from "./Field";
import { useEscClose } from "./useEscClose";
import type { BadgeKind, ContentBlock, DemoKind } from "./ContentBlocks";

type Kind = ContentBlock["kind"];

// A block plus a stable id, so drag-and-drop and React keys survive edits.
export interface EditableBlock {
    id: string;
    block: ContentBlock;
}

function makeId(): string {
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function newEditableBlock(block: ContentBlock): EditableBlock {
    return { id: makeId(), block };
}

export function toEditableBlocks(blocks: ContentBlock[]): EditableBlock[] {
    return blocks.map(newEditableBlock);
}

export function fromEditableBlocks(items: EditableBlock[]): ContentBlock[] {
    return items.map((item) => item.block);
}

const TYPES: { kind: Kind; label: string; icon: LucideIcon; group: string }[] = [
    { kind: "heading", label: "Heading", icon: Heading, group: "Text" },
    { kind: "paragraph", label: "Paragraph", icon: Pilcrow, group: "Text" },
    { kind: "note", label: "Note", icon: StickyNote, group: "Text" },
    { kind: "code", label: "Code", icon: Code, group: "Text" },
    { kind: "list", label: "Bullet list", icon: List, group: "Structure" },
    { kind: "steps", label: "Steps", icon: ListOrdered, group: "Structure" },
    { kind: "badge", label: "Change badge", icon: Tag, group: "Structure" },
    { kind: "image", label: "Image", icon: ImageIcon, group: "Media" },
    { kind: "linkButton", label: "Link button", icon: Link2, group: "Media" },
    { kind: "demo", label: "Interactive demo", icon: PlayCircle, group: "Interactive" },
];
const GROUPS = ["Text", "Structure", "Media", "Interactive"];
const LABELS = Object.fromEntries(TYPES.map((t) => [t.kind, t.label])) as Record<Kind, string>;
const KNOWN_KINDS = new Set<string>(TYPES.map((t) => t.kind));

export function defaultBlock(kind: Kind): ContentBlock {
    switch (kind) {
        case "heading":
            return { kind, text: "" };
        case "paragraph":
            return { kind, text: "" };
        case "list":
            return { kind, items: [""] };
        case "steps":
            return { kind, items: [""] };
        case "code":
            return { kind, text: "" };
        case "note":
            return { kind, text: "" };
        case "badge":
            return { kind, badge: "added", text: "" };
        case "image":
            return { kind, src: "", alt: "" };
        case "linkButton":
            return { kind, href: "", label: "" };
        case "demo":
            return { kind, demo: "template" };
    }
}

// Coerce arbitrary parsed JSON into valid ContentBlocks: drop unknown kinds and
// type-check every field, so imported data can never crash the renderer.
export function normalizeBlocks(raw: unknown): ContentBlock[] {
    if (!Array.isArray(raw)) return [];
    const out: ContentBlock[] = [];
    for (const item of raw) {
        if (!item || typeof item !== "object") continue;
        const o = item as Record<string, unknown>;
        if (typeof o.kind !== "string" || !KNOWN_KINDS.has(o.kind)) continue;
        out.push(coerceBlock(o.kind as Kind, o));
    }
    return out;
}

const str = (v: unknown): string => (typeof v === "string" ? v : "");
const strArray = (v: unknown): string[] => (Array.isArray(v) && v.length > 0 ? v.map((x) => String(x)) : [""]);
const oneOf = <T extends string>(v: unknown, options: readonly T[], fallback: T): T =>
    options.includes(v as T) ? (v as T) : fallback;

function coerceBlock(kind: Kind, o: Record<string, unknown>): ContentBlock {
    switch (kind) {
        case "heading":
        case "paragraph":
        case "code":
        case "note":
            return { kind, text: str(o.text) };
        case "list":
        case "steps":
            return { kind, items: strArray(o.items) };
        case "badge":
            return {
                kind,
                badge: oneOf(o.badge, ["added", "changed", "fixed", "removed"] as const, "added"),
                text: str(o.text),
            };
        case "image":
            return { kind, src: str(o.src), alt: str(o.alt) };
        case "linkButton":
            return { kind, href: str(o.href), label: str(o.label) };
        case "demo":
            return { kind, demo: oneOf(o.demo, ["template", "dynamics", "expression"] as const, "template") };
    }
}

export function BlockEditor({
    blocks,
    onChange,
}: {
    blocks: EditableBlock[];
    onChange: (blocks: EditableBlock[]) => void;
}) {
    const sensors = useDndSensors();
    const [menuOpen, setMenuOpen] = useState(false);
    const addBtnRef = useRef<HTMLButtonElement>(null);
    useEscClose(menuOpen, () => setMenuOpen(false));

    const update = (id: string, block: ContentBlock) =>
        onChange(blocks.map((item) => (item.id === id ? { ...item, block } : item)));
    const remove = (id: string) => onChange(blocks.filter((item) => item.id !== id));
    const duplicate = (id: string) => {
        const i = blocks.findIndex((item) => item.id === id);
        if (i < 0) return;
        const copy = newEditableBlock(structuredClone(blocks[i].block));
        onChange([...blocks.slice(0, i + 1), copy, ...blocks.slice(i + 1)]);
    };
    const add = (kind: Kind) => {
        onChange([...blocks, newEditableBlock(defaultBlock(kind))]);
        setMenuOpen(false);
    };
    const onDragEnd = (e: DragEndEvent) => {
        const { active, over } = e;
        if (!over || active.id === over.id) return;
        const from = blocks.findIndex((b) => b.id === active.id);
        const to = blocks.findIndex((b) => b.id === over.id);
        if (from >= 0 && to >= 0) onChange(arrayMove(blocks, from, to));
    };

    return (
        <div className="space-y-2.5">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-2.5">
                        {blocks.map((item) => (
                            <SortableItem key={item.id} id={item.id}>
                                {({ setNodeRef, style, handle }) => (
                                    <div
                                        ref={setNodeRef}
                                        style={style}
                                        className="rounded-lg border border-border bg-bg p-2.5"
                                    >
                                        <div className="mb-2 flex items-center gap-1.5">
                                            <button
                                                {...handle}
                                                aria-label="Drag to reorder"
                                                className="cursor-grab touch-none text-subtle hover:text-fg"
                                            >
                                                <GripVertical size={14} />
                                            </button>
                                            <span className="text-[11px] font-semibold uppercase tracking-wide text-subtle">
                                                {LABELS[item.block.kind]}
                                            </span>
                                            <div className="flex-1" />
                                            <IconButton
                                                label="Duplicate"
                                                onClick={() => duplicate(item.id)}
                                                className="h-6 w-6"
                                            >
                                                <Copy size={13} />
                                            </IconButton>
                                            <IconButton
                                                label="Delete block"
                                                onClick={() => remove(item.id)}
                                                className="h-6 w-6"
                                            >
                                                <Trash2 size={13} />
                                            </IconButton>
                                        </div>
                                        <BlockFields block={item.block} onChange={(b) => update(item.id, b)} />
                                    </div>
                                )}
                            </SortableItem>
                        ))}
                    </div>
                </SortableContext>
            </DndContext>

            <div className="relative">
                <Button
                    ref={addBtnRef}
                    variant="subtle"
                    size="sm"
                    leftIcon={<Plus size={14} />}
                    onClick={() => setMenuOpen((v) => !v)}
                >
                    Add block
                </Button>
                <AnchoredMenu
                    open={menuOpen}
                    anchorRef={addBtnRef}
                    onClose={() => setMenuOpen(false)}
                    align="left"
                    width={220}
                >
                    {GROUPS.map((group) => (
                        <div key={group} className="mb-1 last:mb-0">
                            <p className="px-2.5 pb-0.5 pt-1 text-[10px] font-semibold uppercase tracking-wide text-subtle">
                                {group}
                            </p>
                            {TYPES.filter((t) => t.group === group).map((t) => (
                                <button
                                    key={t.kind}
                                    onClick={() => add(t.kind)}
                                    className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-[13px] text-fg hover:bg-accent/15 hover:text-accent"
                                >
                                    <t.icon size={14} className="opacity-80" />
                                    {t.label}
                                </button>
                            ))}
                        </div>
                    ))}
                </AnchoredMenu>
            </div>
        </div>
    );
}

function BlockFields({ block, onChange }: { block: ContentBlock; onChange: (b: ContentBlock) => void }): ReactNode {
    switch (block.kind) {
        case "heading":
            return (
                <Input
                    value={block.text}
                    onChange={(e) => onChange({ ...block, text: e.target.value })}
                    placeholder="Heading text"
                />
            );
        case "paragraph":
        case "note":
            return (
                <Textarea
                    rows={2}
                    value={block.text}
                    onChange={(e) => onChange({ ...block, text: e.target.value })}
                    placeholder={block.kind === "note" ? "Note text" : "Paragraph text"}
                />
            );
        case "code":
            return (
                <Textarea
                    rows={3}
                    className="mono"
                    value={block.text}
                    onChange={(e) => onChange({ ...block, text: e.target.value })}
                    placeholder="Code"
                />
            );
        case "list":
        case "steps":
            return (
                <Textarea
                    rows={3}
                    value={block.items.join("\n")}
                    onChange={(e) => onChange({ ...block, items: e.target.value.split("\n") })}
                    placeholder="One item per line"
                />
            );
        case "badge":
            return (
                <div className="flex gap-2">
                    <Select
                        className="h-9 w-32"
                        value={block.badge}
                        onChange={(e) => onChange({ ...block, badge: e.target.value as BadgeKind })}
                    >
                        <option value="added">Added</option>
                        <option value="changed">Changed</option>
                        <option value="fixed">Fixed</option>
                        <option value="removed">Removed</option>
                    </Select>
                    <Input
                        value={block.text}
                        onChange={(e) => onChange({ ...block, text: e.target.value })}
                        placeholder="What changed"
                    />
                </div>
            );
        case "image":
            return (
                <div className="space-y-2">
                    <Input
                        value={block.src}
                        onChange={(e) => onChange({ ...block, src: e.target.value })}
                        placeholder="Image URL (https://…)"
                    />
                    <Input
                        value={block.alt ?? ""}
                        onChange={(e) => onChange({ ...block, alt: e.target.value })}
                        placeholder="Alt text (optional)"
                    />
                </div>
            );
        case "linkButton":
            return (
                <div className="space-y-2">
                    <Input
                        value={block.label}
                        onChange={(e) => onChange({ ...block, label: e.target.value })}
                        placeholder="Button label"
                    />
                    <Input
                        value={block.href}
                        onChange={(e) => onChange({ ...block, href: e.target.value })}
                        placeholder="Link URL (https://…)"
                    />
                </div>
            );
        case "demo":
            return (
                <Select
                    className="h-9 w-44"
                    value={block.demo}
                    onChange={(e) => onChange({ ...block, demo: e.target.value as DemoKind })}
                >
                    <option value="template">Templating</option>
                    <option value="dynamics">Dynamic variables</option>
                    <option value="expression">Expressions</option>
                </Select>
            );
    }
}

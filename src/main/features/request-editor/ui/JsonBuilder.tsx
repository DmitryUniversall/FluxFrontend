// Recursive form/tree editor for a JSON body. Each row has a key (in objects),
// a type selector and a type-specific value editor; template values ({{var}} /
// {{$dynamic}}) get the same highlighting + autocomplete as elsewhere. Operates
// on the template-aware node model from core/json-template. Drag-and-drop
// (dnd-kit) reorders fields and moves them between objects/arrays.
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CircleSlash, CornerDownRight, GripVertical, Plus, Trash2 } from "lucide-react";
import { IconButton } from "@/main/common/ui/Button";
import { closestCenter, DndContext, EmptyDrop, SortableItem, treeDragEnd, useDndSensors } from "@/main/common/ui/dnd";
import { Select } from "@/main/common/ui/Field";
import { HighlightedInput } from "@/main/common/ui/HighlightedInput";
import { cn } from "@/main/common/utils/cn";
import { ROOT } from "@/main/common/utils/dnd-tree";
import {
    isSingleTemplate,
    makeEntry,
    makeNode,
    type Entry,
    type JsonNode,
    type JsonNodeType,
} from "@/core/json-template";

const TYPES: JsonNodeType[] = ["string", "number", "boolean", "null", "object", "array", "expression"];
const isContainer = (t: JsonNodeType) => t === "object" || t === "array";

const childrenOf = (e: Entry) => (e.node.type === "object" || e.node.type === "array" ? e.node.entries : undefined);
const withChildren = (e: Entry, c: Entry[]): Entry => ({ ...e, node: { ...e.node, entries: c } });

function transformType(n: JsonNode, t: JsonNodeType): JsonNode {
    if (t === n.type) return n;
    if (isContainer(t)) return { ...n, type: t, value: "", entries: isContainer(n.type) ? n.entries : [] };
    if (t === "boolean") return { ...n, type: t, value: n.value === "false" ? "false" : "true", entries: [] };
    if (t === "null") return { ...n, type: t, value: "", entries: [] };
    return { ...n, type: t, value: n.value, entries: [] }; // string / number / expression keep text
}

function TplInput({
    value,
    onChange,
    placeholder,
}: {
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
}) {
    return (
        <HighlightedInput
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            wrapperClassName="h-8 flex-1 rounded-lg border border-border bg-bg"
            textClassName="px-2.5 mono text-[13px]"
        />
    );
}

function ValueEditor({ node, onChange }: { node: JsonNode; onChange: (n: JsonNode) => void }) {
    const set = (value: string) => onChange({ ...node, value });
    switch (node.type) {
        case "string":
            return <TplInput value={node.value} onChange={set} placeholder="value or {{var}}" />;
        case "number":
            return <TplInput value={node.value} onChange={set} placeholder="0" />;
        case "expression":
            return <TplInput value={node.value} onChange={set} placeholder="{{var}} or {{$uuid}}" />;
        case "boolean":
            return (
                <Select
                    value={node.value === "false" ? "false" : "true"}
                    onChange={(e) => set(e.target.value)}
                    className="h-8 w-28"
                >
                    <option value="true">true</option>
                    <option value="false">false</option>
                </Select>
            );
        case "null":
            return <span className="mono flex h-8 flex-1 items-center px-1 text-[13px] text-subtle">null</span>;
        default:
            return <span className="flex-1" />;
    }
}

function Row({
    entry,
    parentType,
    index,
    onChange,
    onRemove,
    depth,
    dragHandleProps,
}: {
    entry: Entry;
    parentType: "object" | "array";
    index: number;
    onChange: (e: Entry) => void;
    onRemove: () => void;
    depth: number;
    dragHandleProps?: React.HTMLAttributes<HTMLElement>;
}) {
    const n = entry.node;
    const container = isContainer(n.type);
    const setNode = (node: JsonNode) => onChange({ ...entry, node });
    const showRawToggle = (n.type === "string" || n.type === "expression") && isSingleTemplate(n.value);

    return (
        <div>
            <div className="flex items-center gap-1.5 py-0.5">
                <span
                    {...dragHandleProps}
                    className="shrink-0 cursor-grab text-subtle hover:text-fg active:cursor-grabbing"
                    title="Drag to reorder"
                >
                    <GripVertical size={14} />
                </span>
                {parentType === "object" ? (
                    <HighlightedInput
                        value={entry.key}
                        onChange={(key) => onChange({ ...entry, key })}
                        placeholder="key"
                        wrapperClassName="h-8 w-44 shrink-0 rounded-lg border border-border bg-bg"
                        textClassName="px-2.5 mono text-[13px]"
                    />
                ) : (
                    <span className="mono w-44 shrink-0 px-2 text-[12px] text-subtle">{index}</span>
                )}

                <Select
                    value={n.type}
                    onChange={(e) => setNode(transformType(n, e.target.value as JsonNodeType))}
                    className="h-8 !w-28 shrink-0"
                >
                    {TYPES.map((t) => (
                        <option key={t} value={t}>
                            {t}
                        </option>
                    ))}
                </Select>

                {!container && <ValueEditor node={n} onChange={setNode} />}
                {container && (
                    <span className="flex-1 text-[12px] text-subtle">
                        {n.entries.length} {n.type === "object" ? "field(s)" : "item(s)"}
                    </span>
                )}

                {showRawToggle && (
                    <button
                        onClick={() => setNode(transformType(n, n.type === "string" ? "expression" : "string"))}
                        title={n.type === "string" ? "Treat as raw value (unquoted)" : "Treat as string (quoted)"}
                        className={cn(
                            "shrink-0 rounded-md border border-border px-1.5 py-0.5 text-[11px] font-medium",
                            n.type === "expression" ? "bg-teal-500/15 text-teal-300" : "text-subtle hover:text-fg",
                        )}
                    >
                        {n.type === "expression" ? "raw" : "str"}
                    </button>
                )}

                {parentType === "object" && !container && (
                    <button
                        onClick={() => onChange({ ...entry, omitEmpty: !entry.omitEmpty })}
                        title={
                            entry.omitEmpty
                                ? "Omitted when empty - click to always include"
                                : "Always included - click to omit when empty"
                        }
                        className={cn(
                            "flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors",
                            entry.omitEmpty ? "bg-accent/15 text-accent" : "text-subtle hover:text-fg",
                        )}
                    >
                        <CircleSlash size={13} />
                    </button>
                )}

                <div className="flex shrink-0 items-center">
                    {container && (
                        <IconButton
                            label="Add child"
                            onClick={() =>
                                setNode({ ...n, entries: [...n.entries, makeEntry("", makeNode("string"))] })
                            }
                        >
                            <Plus size={13} />
                        </IconButton>
                    )}
                    <IconButton label="Remove" onClick={onRemove}>
                        <Trash2 size={13} />
                    </IconButton>
                </div>
            </div>

            {container && (
                <div className="ml-3 border-l border-border pl-3">
                    <Container node={n} onChange={setNode} depth={depth + 1} containerId={entry.id} />
                </div>
            )}
        </div>
    );
}

function Container({
    node,
    onChange,
    depth,
    containerId,
}: {
    node: JsonNode;
    onChange: (n: JsonNode) => void;
    depth: number;
    containerId: string;
}) {
    const setEntry = (i: number, entry: Entry) =>
        onChange({ ...node, entries: node.entries.map((e, idx) => (idx === i ? entry : e)) });
    const removeEntry = (i: number) => onChange({ ...node, entries: node.entries.filter((_, idx) => idx !== i) });
    const add = () => onChange({ ...node, entries: [...node.entries, makeEntry("", makeNode("string"))] });
    const parentType = node.type as "object" | "array";

    return (
        <div>
            <SortableContext
                id={containerId}
                items={node.entries.map((e) => e.id)}
                strategy={verticalListSortingStrategy}
            >
                {node.entries.map((e, i) => (
                    <SortableItem key={e.id} id={e.id}>
                        {({ setNodeRef, style, handle }) => (
                            <div ref={setNodeRef} style={style}>
                                <Row
                                    entry={e}
                                    parentType={parentType}
                                    index={i}
                                    onChange={(en) => setEntry(i, en)}
                                    onRemove={() => removeEntry(i)}
                                    depth={depth}
                                    dragHandleProps={handle}
                                />
                            </div>
                        )}
                    </SortableItem>
                ))}
                {node.entries.length === 0 && (
                    <EmptyDrop
                        containerId={containerId}
                        label={`drop a ${parentType === "object" ? "field" : "item"} here`}
                    />
                )}
            </SortableContext>
            <button
                onClick={add}
                className="mt-0.5 flex items-center gap-1 px-1 py-1 text-[12px] text-subtle hover:text-fg"
            >
                <CornerDownRight size={12} /> add {parentType === "object" ? "field" : "item"}
            </button>
        </div>
    );
}

export function JsonBuilder({ node, onChange }: { node: JsonNode; onChange: (n: JsonNode) => void }) {
    const sensors = useDndSensors();
    if (!isContainer(node.type)) {
        return (
            <div className="space-y-2 rounded-xl border border-border p-3">
                <div className="flex items-center gap-2">
                    <span className="text-[13px] text-muted">Root is a {node.type}.</span>
                    <button
                        onClick={() => onChange(makeNode("object"))}
                        className="text-[12px] text-accent hover:underline"
                    >
                        convert to object
                    </button>
                </div>
                <ValueEditor node={node} onChange={onChange} />
            </div>
        );
    }
    return (
        <div className="rounded-xl border border-border p-2">
            <div className="mb-1 flex items-center gap-2 px-1">
                <span className="text-[11px] uppercase tracking-wide text-subtle">root</span>
                <Select
                    value={node.type}
                    onChange={(e) => onChange(transformType(node, e.target.value as JsonNodeType))}
                    className="h-7 w-24 text-[12px]"
                >
                    <option value="object">object</option>
                    <option value="array">array</option>
                </Select>
            </div>
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={(e) =>
                    treeDragEnd(e, node.entries, childrenOf, withChildren, (next) =>
                        onChange({ ...node, entries: next }),
                    )
                }
            >
                <Container node={node} onChange={onChange} depth={0} containerId={ROOT} />
            </DndContext>
        </div>
    );
}

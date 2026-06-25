// The visual block list with an "add block" menu. Recurses through BlockRow for
// nested containers (condition / withVars). Drag-and-drop (dnd-kit) handles
// reordering within a level and moving blocks into/out of containers; the root
// list owns the single DndContext and applies atomic tree moves.
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Boxes, GitBranch, KeyRound, Plus, Save, ShieldCheck, Terminal, Variable } from "lucide-react";
import { useRef, useState } from "react";
import { AnchoredMenu } from "@/main/common/ui/AnchoredMenu";
import { Button } from "@/main/common/ui/Button";
import { closestCenter, DndContext, EmptyDrop, SortableItem, treeDragEnd, useDndSensors } from "@/main/common/ui/dnd";
import { EmptyState } from "@/main/common/ui/feedback";
import { ROOT } from "@/main/common/utils/dnd-tree";
import { useEscClose } from "@/main/common/ui/useEscClose";
import { createBlock, type Block, type BlockType } from "../domain/blocks";
import { BlockRow } from "./BlockRow";

interface BlocksEditorProps {
    blocks: Block[];
    onChange: (blocks: Block[]) => void;
    nested?: boolean;
    responseJson?: unknown;
    containerId?: string;
}

const ADD_OPTIONS: { type: BlockType; label: string; icon: React.ReactNode; group: string }[] = [
    { type: "condition", label: "Condition", icon: <GitBranch size={14} />, group: "Logic" },
    { type: "withVars", label: "With temp vars", icon: <Boxes size={14} />, group: "Logic" },
    { type: "assert", label: "Assert (test)", icon: <ShieldCheck size={14} />, group: "Tests" },
    { type: "saveToEnv", label: "Save field to env", icon: <Save size={14} />, group: "Variables" },
    { type: "setEnv", label: "Set variable", icon: <Variable size={14} />, group: "Variables" },
    { type: "setAuth", label: "Set auth", icon: <KeyRound size={14} />, group: "Auth & output" },
    { type: "log", label: "Log", icon: <Terminal size={14} />, group: "Auth & output" },
];
const ADD_GROUPS = ["Logic", "Tests", "Variables", "Auth & output"];

const childrenOf = (b: Block) => ("children" in b ? b.children : undefined);
const withChildren = (b: Block, c: Block[]) => ({ ...b, children: c }) as Block;

export function BlocksEditor({ blocks, onChange, nested, responseJson, containerId = ROOT }: BlocksEditorProps) {
    const [menuOpen, setMenuOpen] = useState(false);
    const addBtnRef = useRef<HTMLButtonElement>(null);
    const sensors = useDndSensors();
    useEscClose(menuOpen, () => setMenuOpen(false));

    const add = (type: BlockType) => {
        onChange([...blocks, createBlock(type)]);
        setMenuOpen(false);
    };
    const replace = (i: number, block: Block) => onChange(blocks.map((b, idx) => (idx === i ? block : b)));
    const remove = (i: number) => onChange(blocks.filter((_, idx) => idx !== i));

    const list = (
        <SortableContext id={containerId} items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
                {blocks.map((block, i) => (
                    <SortableItem key={block.id} id={block.id}>
                        {({ setNodeRef, style, handle }) => (
                            <div ref={setNodeRef} style={style}>
                                <BlockRow
                                    block={block}
                                    onChange={(b) => replace(i, b)}
                                    onRemove={() => remove(i)}
                                    responseJson={responseJson}
                                    dragHandleProps={handle}
                                />
                            </div>
                        )}
                    </SortableItem>
                ))}
                {nested && blocks.length === 0 && <EmptyDrop containerId={containerId} label="drop a block here" />}
            </div>
        </SortableContext>
    );

    const addMenu = (
        <div className="relative flex justify-center">
            <Button
                ref={addBtnRef}
                variant="ghost"
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
                align="center"
                placement="top"
                tourId={nested ? undefined : "blocks-add-menu"}
            >
                {ADD_GROUPS.map((group) => (
                    <div key={group} className="mb-1 last:mb-0">
                        <p className="px-2.5 pb-0.5 pt-1 text-[10px] font-semibold uppercase tracking-wide text-subtle">
                            {group}
                        </p>
                        {ADD_OPTIONS.filter((opt) => opt.group === group).map((opt) => (
                            <button
                                key={opt.type}
                                onClick={() => add(opt.type)}
                                data-tour={nested ? undefined : `block-add-${opt.type}`}
                                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-[13px] text-fg hover:bg-accent/15 hover:text-accent"
                            >
                                <span className="opacity-80">{opt.icon}</span>
                                {opt.label}
                            </button>
                        ))}
                    </div>
                ))}
            </AnchoredMenu>
        </div>
    );

    const body = (
        <div className="space-y-2">
            {list}
            {addMenu}
        </div>
    );

    return (
        <div className="space-y-2">
            {blocks.length === 0 && !nested && (
                <EmptyState
                    icon={<GitBranch size={20} />}
                    title="No blocks yet"
                    hint="Add blocks, or right-click a field in the response to save it here automatically."
                />
            )}
            {nested ? (
                body
            ) : (
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={(e) => treeDragEnd(e, blocks, childrenOf, withChildren, onChange)}
                >
                    {body}
                </DndContext>
            )}
        </div>
    );
}

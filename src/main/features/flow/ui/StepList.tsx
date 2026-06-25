// A list of flow steps at one level. Used at the top level and recursively
// inside container steps (forEach/if). Drag-and-drop (dnd-kit) reorders within a
// level and moves steps into/out of containers; the root list owns the single
// DndContext and applies atomic tree moves.
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import {
    ArrowRightCircle,
    Database,
    GitBranch,
    KeyRound,
    Keyboard,
    Plus,
    Repeat,
    Repeat2,
    ShieldCheck,
    Timer,
    Variable,
} from "lucide-react";
import { useRef, useState } from "react";
import { AnchoredMenu } from "@/main/common/ui/AnchoredMenu";
import { Button } from "@/main/common/ui/Button";
import { ANCHORS, tourAnchor } from "@/main/features/guide/domain/anchors";
import { closestCenter, DndContext, EmptyDrop, SortableItem, treeDragEnd, useDndSensors } from "@/main/common/ui/dnd";
import { ROOT } from "@/main/common/utils/dnd-tree";
import { useEscClose } from "@/main/common/ui/useEscClose";
import type { FlowStep, FlowStepType } from "@/main/features/request-editor/domain/models";
import { createFlowStep } from "../domain/steps";
import { FlowStepRow, type TargetOption } from "./FlowStepRow";

const ADD: { type: FlowStepType; label: string; icon: React.ReactNode; group: string }[] = [
    { type: "call", label: "Call request", icon: <ArrowRightCircle size={14} />, group: "Request" },
    { type: "set", label: "Set variable", icon: <Variable size={14} />, group: "Variables" },
    { type: "setEnv", label: "Set env variable", icon: <Database size={14} />, group: "Variables" },
    { type: "input", label: "Ask for input", icon: <Keyboard size={14} />, group: "Variables" },
    { type: "if", label: "If", icon: <GitBranch size={14} />, group: "Flow control" },
    { type: "forEach", label: "For each", icon: <Repeat2 size={14} />, group: "Flow control" },
    { type: "wait", label: "Wait / Poll", icon: <Repeat size={14} />, group: "Flow control" },
    { type: "delay", label: "Delay", icon: <Timer size={14} />, group: "Flow control" },
    { type: "assert", label: "Assert", icon: <ShieldCheck size={14} />, group: "Validation & auth" },
    { type: "setAuth", label: "Set auth", icon: <KeyRound size={14} />, group: "Validation & auth" },
];
const ADD_GROUPS = ["Request", "Variables", "Flow control", "Validation & auth"];

const childrenOf = (s: FlowStep) => ("children" in s ? s.children : undefined);
const withChildren = (s: FlowStep, c: FlowStep[]) => ({ ...s, children: c }) as FlowStep;

export function StepList({
    steps,
    onChange,
    targets,
    nested,
    containerId = ROOT,
}: {
    steps: FlowStep[];
    onChange: (steps: FlowStep[]) => void;
    targets: TargetOption[];
    nested?: boolean;
    containerId?: string;
}) {
    const [menuOpen, setMenuOpen] = useState(false);
    const addBtnRef = useRef<HTMLButtonElement>(null);
    const sensors = useDndSensors();
    useEscClose(menuOpen, () => setMenuOpen(false));

    const add = (t: FlowStepType) => {
        onChange([...steps, createFlowStep(t)]);
        setMenuOpen(false);
    };
    const replace = (i: number, s: FlowStep) => onChange(steps.map((x, idx) => (idx === i ? s : x)));
    const remove = (i: number) => onChange(steps.filter((_, idx) => idx !== i));

    const list = (
        <SortableContext id={containerId} items={steps.map((s) => s.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
                {steps.map((step, i) => (
                    <SortableItem key={step.id} id={step.id}>
                        {({ setNodeRef, style, handle }) => (
                            <div ref={setNodeRef} style={style}>
                                <FlowStepRow
                                    step={step}
                                    index={i}
                                    onChange={(s) => replace(i, s)}
                                    onRemove={() => remove(i)}
                                    targets={targets}
                                    dragHandleProps={handle}
                                />
                            </div>
                        )}
                    </SortableItem>
                ))}
                {nested && steps.length === 0 && <EmptyDrop containerId={containerId} />}
            </div>
        </SortableContext>
    );

    const addMenu = (
        <div className="relative">
            <Button
                ref={addBtnRef}
                variant="ghost"
                size="sm"
                leftIcon={<Plus size={14} />}
                onClick={() => setMenuOpen((v) => !v)}
                {...(nested ? {} : tourAnchor(ANCHORS.flowAddStep))}
            >
                {nested ? "Add nested step" : "Add step"}
            </Button>
            <AnchoredMenu
                open={menuOpen}
                anchorRef={addBtnRef}
                onClose={() => setMenuOpen(false)}
                align="left"
                placement="bottom"
                tourId={nested ? undefined : "flow-add-menu"}
            >
                {ADD_GROUPS.map((group) => (
                    <div key={group} className="mb-1 last:mb-0">
                        <p className="px-2.5 pb-0.5 pt-1 text-[10px] font-semibold uppercase tracking-wide text-subtle">
                            {group}
                        </p>
                        {ADD.filter((opt) => opt.group === group).map((opt) => (
                            <button
                                key={opt.type}
                                onClick={() => add(opt.type)}
                                data-tour={nested ? undefined : `flow-add-${opt.type}`}
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

    if (nested) return body;
    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={(e) => treeDragEnd(e, steps, childrenOf, withChildren, onChange)}
        >
            {body}
        </DndContext>
    );
}

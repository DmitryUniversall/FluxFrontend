// Flow editor - the step tree for a flow node, with a Run/Stop control. Lives in
// the top pane (run results show in the bottom pane).
import { Play, Square, Workflow, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button, IconButton } from "@/main/common/ui/Button";
import { Input } from "@/main/common/ui/Field";
import { Modal } from "@/main/common/ui/Modal";
import { TemplateScopeProvider, type ScopeVar } from "@/main/common/ui/templateScope";
import { Spinner } from "@/main/common/ui/feedback";
import { useDelayedFlag } from "@/main/common/ui/useDelayedFlag";
import { toast } from "@/main/common/ui/toast";
import { useCollections } from "@/main/features/collections/ui/useCollections";
import { ANCHORS, tourAnchor } from "@/main/features/guide/domain/anchors";
import { HelpButton } from "@/main/features/guide/ui/HelpButton";
import { useHelp } from "@/main/features/guide/ui/useHelp";
import type { FlowStep } from "@/main/features/request-editor/domain/models";
import { collectFlowVarNames } from "../domain/steps";
import { StepList } from "./StepList";
import { type TargetOption } from "./FlowStepRow";
import { useFlowEditor } from "./useFlowEditor";

export function FlowEditor() {
    const { flow, loading, running, setSteps, rename, run, stop } = useFlowEditor();
    const showLoading = useDelayedFlag(loading);
    const tree = useCollections((s) => s.tree);

    const targets: TargetOption[] = useMemo(
        () =>
            tree.flatMap((c) =>
                c.requests.filter((r) => r.kind !== "flow").map((r) => ({ id: r.id, label: `${c.name} · ${r.name}` })),
            ),
        [tree],
    );

    const steps = useMemo(() => flow?.flow?.steps ?? [], [flow]);
    // Flow-scope locals for {{template}} highlighting/autocomplete (green).
    const flowVars = useMemo<ScopeVar[]>(
        () => collectFlowVarNames(steps).map((name) => ({ name, hint: "flow variable" })),
        [steps],
    );

    // hotkeys: Cmd/Ctrl+Enter runs the flow, Cmd/Ctrl+S flushes a save
    const runRef = useRef(run);
    runRef.current = run;
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (!(e.metaKey || e.ctrlKey)) return;
            if (e.key === "Enter") {
                e.preventDefault();
                void runRef.current();
            } else if (e.key.toLowerCase() === "s") {
                e.preventDefault();
                void useFlowEditor.getState().save();
                toast.success("Saved");
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, []);

    if (loading) {
        if (!showLoading) return null;
        return (
            <div className="flex h-full items-center justify-center">
                <Spinner className="h-5 w-5 text-subtle" />
            </div>
        );
    }
    if (!flow) return null;

    return (
        <TemplateScopeProvider flowVars={flowVars}>
            <div className="flex h-full flex-col">
                <div className="flex items-center gap-2 px-4 pt-3">
                    <Workflow size={16} className="shrink-0 text-accent" />
                    <input
                        value={flow.name}
                        onChange={(e) => rename(e.target.value)}
                        className="flex-1 bg-transparent text-sm font-semibold text-fg outline-none placeholder:text-subtle"
                        placeholder="Flow name"
                    />
                    <HelpButton title="Flows" run={() => useHelp.getState().startFlowTour()} />
                    <IconButton label="Close flow" onClick={() => useCollections.getState().select(null)}>
                        <X size={16} />
                    </IconButton>
                    {running ? (
                        <Button variant="ghost" className="h-9 px-4" onClick={stop} leftIcon={<Square size={14} />}>
                            Stop
                        </Button>
                    ) : (
                        <Button
                            variant="primary"
                            className="h-9 px-5"
                            onClick={() => void run()}
                            leftIcon={<Play size={15} />}
                            {...tourAnchor(ANCHORS.flowRun)}
                        >
                            Run
                        </Button>
                    )}
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto p-4" {...tourAnchor(ANCHORS.flowSteps)}>
                    {steps.length === 0 && (
                        <p className="mb-3 text-[13px] text-subtle">
                            Empty flow - add steps to call requests in sequence, capture values, assert, loop and
                            orchestrate.
                        </p>
                    )}
                    <StepList steps={steps} onChange={(s: FlowStep[]) => setSteps(s)} targets={targets} />
                </div>

                <FlowInputDialog />
            </div>
        </TemplateScopeProvider>
    );
}

// Shown when a running flow reaches an `input` step: the run is paused until the
// user submits (continue) or dismisses (cancel -> stops the flow).
function FlowInputDialog() {
    const pending = useFlowEditor((s) => s.pendingInput);
    const submit = useFlowEditor((s) => s.submitInput);
    const [value, setValue] = useState("");

    useEffect(() => {
        setValue(pending?.defaultValue ?? "");
    }, [pending]);

    return (
        <Modal
            open={!!pending}
            onClose={() => submit(null)}
            title="Flow paused - input needed"
            tourId="flow-input"
            footer={
                <>
                    <Button variant="ghost" onClick={() => submit(null)}>
                        Cancel run
                    </Button>
                    <Button variant="primary" onClick={() => submit(value)}>
                        Continue
                    </Button>
                </>
            }
        >
            {pending && (
                <div className="space-y-2.5">
                    <p className="text-[13px] text-fg">{pending.prompt}</p>
                    <Input
                        type={pending.secret ? "password" : "text"}
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && submit(value)}
                        placeholder={`Value for ${pending.variable}`}
                        autoFocus
                    />
                    <p className="text-[11px] text-subtle">
                        Stored as <span className="mono text-accent">{pending.variable}</span> and available to later
                        steps.
                    </p>
                </div>
            )}
        </Modal>
    );
}

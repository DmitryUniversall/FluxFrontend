import { ClipboardCopy, FileJson, Route, Save, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { pathToDisplay, valueToString } from "@/core/json-path";
import type { Json, JsonPath } from "@/core/types";
import { ContextMenu, type MenuItem, type MenuPosition } from "@/main/common/ui/ContextMenu";
import { ANCHORS, tourAnchor } from "@/main/features/guide/domain/anchors";
import { toast } from "@/main/common/ui/toast";
import { createBlock, type AssertBlock, type AssertOp } from "@/main/features/scripting/domain/blocks";
import { useRequestEditor } from "@/main/features/request-editor/ui/useRequestEditor";
import { SaveToEnvDialog } from "./SaveToEnvDialog";
import { JsonNode } from "./JsonNode";

interface JsonViewProps {
    data: Json;
}

interface DialogState {
    pathSegments: JsonPath;
    displayPath: string;
    value: Json;
}

export function JsonView({ data }: JsonViewProps) {
    const [menu, setMenu] = useState<{ pos: MenuPosition; items: MenuItem[] } | null>(null);
    const [dialog, setDialog] = useState<DialogState | null>(null);

    const copy = (text: string, label: string) => {
        void navigator.clipboard?.writeText(text);
        toast.info(`${label} copied`);
    };

    // Build assert blocks for an "Add check" action. Primitives -> equals current
    // value; objects -> a check per immediate field (existence for nested
    // objects/arrays); arrays -> an existence check.
    const mkCheck = (p: JsonPath, op: AssertOp, value: string): AssertBlock => ({
        ...(createBlock("assert") as AssertBlock),
        label: pathToDisplay(p),
        kind: "json",
        expr: pathToDisplay(p),
        mode: "path",
        op,
        value,
    });
    const buildChecks = (path: JsonPath, value: Json): AssertBlock[] => {
        if (Array.isArray(value)) return [mkCheck(path, "exists", "")];
        if (value !== null && typeof value === "object") {
            const out = Object.entries(value).map(([k, v]) =>
                v !== null && typeof v === "object"
                    ? mkCheck([...path, k], "exists", "")
                    : mkCheck([...path, k], "eq", valueToString(v)),
            );
            return out.length ? out : [mkCheck(path, "exists", "")];
        }
        return [mkCheck(path, "eq", valueToString(value))];
    };
    const addCheck = (path: JsonPath, value: Json) => {
        const blocks = buildChecks(path, value);
        useRequestEditor.getState().addPostBlocks(blocks);
        toast.success(
            blocks.length === 1 ? "Check added to Post-response" : `${blocks.length} checks added to Post-response`,
        );
    };

    const onContext = (e: React.MouseEvent, path: JsonPath, value: Json) => {
        e.preventDefault();
        e.stopPropagation();
        const display = pathToDisplay(path);
        const items: MenuItem[] = [
            {
                id: "check",
                label: "Add check",
                icon: <ShieldCheck size={14} />,
                onSelect: () => addCheck(path, value),
            },
            {
                id: "save",
                label: "Save to environment…",
                icon: <Save size={14} />,
                onSelect: () => setDialog({ pathSegments: path, displayPath: display, value }),
            },
            {
                id: "copy-val",
                label: "Copy value",
                icon: <ClipboardCopy size={14} />,
                separatorBefore: true,
                onSelect: () => copy(valueToString(value), "Value"),
            },
            { id: "copy-path", label: "Copy path", icon: <Route size={14} />, onSelect: () => copy(display, "Path") },
            {
                id: "copy-json",
                label: "Copy as JSON",
                icon: <FileJson size={14} />,
                onSelect: () => copy(JSON.stringify(value, null, 2), "JSON"),
            },
        ];
        setMenu({ pos: { x: e.clientX, y: e.clientY }, items });
    };

    return (
        <div className="mono p-3 text-[13px]" {...tourAnchor(ANCHORS.responseJson)}>
            <JsonNode value={data} path={[]} depth={0} onContext={onContext} />
            <ContextMenu position={menu?.pos ?? null} items={menu?.items ?? []} onClose={() => setMenu(null)} />
            {dialog && (
                <SaveToEnvDialog
                    open
                    onClose={() => setDialog(null)}
                    pathSegments={dialog.pathSegments}
                    displayPath={dialog.displayPath}
                    value={dialog.value}
                />
            )}
        </div>
    );
}

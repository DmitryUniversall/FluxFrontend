import { ChevronDown, Send, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button, IconButton } from "@/main/common/ui/Button";
import { useCollections } from "@/main/features/collections/ui/useCollections";
import { HighlightedInput } from "@/main/common/ui/HighlightedInput";
import { TemplateScopeProvider, type ScopeVar } from "@/main/common/ui/templateScope";
import { Tabs, type TabItem } from "@/main/common/ui/Tabs";
import { ANCHORS, tourAnchor } from "@/main/features/guide/domain/anchors";
import { HelpButton } from "@/main/features/guide/ui/HelpButton";
import { useHelp } from "@/main/features/guide/ui/useHelp";
import { toast } from "@/main/common/ui/toast";
import { Spinner } from "@/main/common/ui/feedback";
import { useDelayedFlag } from "@/main/common/ui/useDelayedFlag";
import { methodColor } from "@/main/common/ui/badges";
import { cn } from "@/main/common/utils/cn";
import { METHODS, type Method } from "../domain/models";
import { CurlMenu } from "./CurlMenu";
import { RunParamsDialog } from "./RunParamsDialog";
import { getForceParams, lastParamValues } from "./runPrefs";
import { useRequestEditor } from "./useRequestEditor";
import { useUiPrefs } from "@/main/common/ui/useUiPrefs";
import { ParamsTab } from "./tabs/ParamsTab";
import { HeadersTab } from "./tabs/HeadersTab";
import { AuthTab } from "./tabs/AuthTab";
import { BodyTab } from "./tabs/BodyTab";
import { InputsTab } from "./tabs/InputsTab";
import { ScriptsTab } from "./tabs/ScriptsTab";

export function RequestEditor() {
    const { request, update, send, sending, loading } = useRequestEditor();
    // Loads faster than 150ms (cache hits are instant, misses are usually quick)
    // never flash a spinner - the screen goes straight to the editor.
    const showLoading = useDelayedFlag(loading);
    const [tab, setTab] = useState("params");
    const [runOpen, setRunOpen] = useState(false);

    const declared = (request?.parameters ?? []).filter((p) => p.name.trim());
    const hasParams = declared.length > 0;
    // Feed the request's declared parameters into every {{template}} field below
    // so they highlight as params (gold) and appear in autocomplete. Keyed on a
    // stable signature so editing an unrelated field doesn't churn the scope.
    const paramSig = declared.map((p) => `${p.name}\u0000${p.default}\u0000${p.required}`).join("\u0001");
    const paramScope = useMemo<ScopeVar[]>(
        () => declared.map((p) => ({ name: p.name.trim(), hint: p.default || (p.required ? "required" : "optional") })),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [paramSig],
    );
    const needAuthPrompt = request?.auth.type === "parameter";
    const triggerSend = () => {
        if (!request) return;
        if (!hasParams && !needAuthPrompt) return void send();
        // Show the form if auth must be chosen, if forced (per-request or by the
        // global Editor preference), or if some declared param has no default.
        const needForm =
            needAuthPrompt ||
            getForceParams(request.id) ||
            useUiPrefs.getState().runFormByDefault ||
            declared.some((p) => !(p.default ?? "").trim());
        if (needForm) {
            setRunOpen(true);
            return;
        }
        const last = lastParamValues(request.id);
        const values: Record<string, string> = {};
        for (const p of declared) values[p.name] = last[p.name] ?? p.default;
        void send(values);
    };

    // hotkeys: Cmd/Ctrl+Enter sends, Cmd/Ctrl+S saves (without the browser dialog)
    const sendRef = useRef(triggerSend);
    sendRef.current = triggerSend;
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (!(e.metaKey || e.ctrlKey)) return;
            if (e.key === "Enter") {
                e.preventDefault();
                sendRef.current();
            } else if (e.key.toLowerCase() === "s") {
                e.preventDefault();
                void useRequestEditor.getState().save();
                toast.success("Saved");
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, []);

    const tabs: TabItem[] = useMemo(() => {
        if (!request) return [];
        const params = request.params.filter((p) => p.key).length;
        const headers = request.headers.filter((h) => h.key).length;
        const inputs = request.parameters?.filter((p) => p.name.trim()).length ?? 0;
        const s = request.scripts;
        const scripts =
            s.pre.blocks.length + s.post.blocks.length + (s.pre.code.trim() ? 1 : 0) + (s.post.code.trim() ? 1 : 0);
        return [
            { id: "params", label: "Params", badge: params || undefined },
            { id: "headers", label: "Headers", badge: headers || undefined },
            { id: "auth", label: "Auth" },
            { id: "body", label: "Body" },
            { id: "inputs", label: "Inputs", badge: inputs || undefined },
            { id: "scripts", label: "Scripts", badge: scripts || undefined },
        ];
    }, [request]);

    if (loading) {
        if (!showLoading) return null;
        return (
            <div className="flex h-full items-center justify-center">
                <Spinner className="h-5 w-5 text-subtle" />
            </div>
        );
    }
    if (!request) return null;

    return (
        <TemplateScopeProvider params={paramScope}>
            <div className="flex h-full flex-col">
                {/* name */}
                <div className="flex items-center gap-2 px-4 pt-3">
                    <input
                        value={request.name}
                        onChange={(e) => update({ name: e.target.value })}
                        className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-fg outline-none placeholder:text-subtle"
                        placeholder="Request name"
                    />
                    <HelpButton title="Request editor" run={() => useHelp.getState().startRequestTour()} />
                    <IconButton label="Close request" onClick={() => useCollections.getState().select(null)}>
                        <X size={16} />
                    </IconButton>
                </div>

                {/* method + url + send */}
                <div className="flex items-center gap-2 px-4 py-3" {...tourAnchor(ANCHORS.composeRow)}>
                    <div className="relative flex h-10 items-center rounded-lg border border-border bg-surface transition-colors hover:border-subtle focus-within:border-accent">
                        <select
                            value={request.method}
                            onChange={(e) => update({ method: e.target.value as Method })}
                            className={cn(
                                "mono h-full cursor-pointer appearance-none border-0 bg-transparent pl-3 pr-8 text-[13px] font-semibold outline-none",
                                methodColor(request.method),
                            )}
                        >
                            {METHODS.map((m) => (
                                <option key={m} value={m} className="bg-elevated text-fg">
                                    {m}
                                </option>
                            ))}
                        </select>
                        <ChevronDown size={14} className="pointer-events-none absolute right-2 text-subtle" />
                    </div>
                    <HighlightedInput
                        value={request.url}
                        onChange={(url) => update({ url })}
                        onKeyDown={(e) => e.key === "Enter" && triggerSend()}
                        placeholder="https://api.example.com/users  ·  {{base_url}}/users"
                        wrapperClassName="h-10 flex-1 rounded-lg border border-border bg-surface transition-colors hover:border-subtle focus-within:border-accent"
                        textClassName="px-3 mono text-[13px]"
                    />
                    <CurlMenu />
                    <Button
                        variant="primary"
                        className="h-10 px-5"
                        onClick={triggerSend}
                        disabled={sending}
                        leftIcon={<Send size={15} />}
                        {...tourAnchor(ANCHORS.sendButton)}
                    >
                        {sending ? "Sending…" : "Send"}
                    </Button>
                </div>

                {/* tabs */}
                <div className="px-4" {...tourAnchor(ANCHORS.requestTabs)}>
                    <Tabs items={tabs} active={tab} onChange={setTab} size="sm" />
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto" {...tourAnchor(ANCHORS.requestTabContent)}>
                    {tab === "params" && <ParamsTab request={request} update={update} />}
                    {tab === "headers" && <HeadersTab request={request} update={update} />}
                    {tab === "auth" && <AuthTab request={request} update={update} />}
                    {tab === "body" && <BodyTab request={request} update={update} />}
                    {tab === "inputs" && <InputsTab request={request} update={update} />}
                    {tab === "scripts" && <ScriptsTab request={request} update={update} />}
                </div>

                <RunParamsDialog
                    open={runOpen}
                    request={request}
                    onClose={() => setRunOpen(false)}
                    onRun={(v, a) => void send(v, a)}
                />
            </div>
        </TemplateScopeProvider>
    );
}

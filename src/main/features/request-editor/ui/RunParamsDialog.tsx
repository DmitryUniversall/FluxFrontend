// Run form shown on Send when a request declares parameters. Pre-fills from the
// last-used values (localStorage, per request) falling back to each param's
// default. Required params must be non-empty. Values support {{}} and dynamics
// (resolved at send time against the environment).
import { Play } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/main/common/ui/Button";
import { HighlightedInput } from "@/main/common/ui/HighlightedInput";
import { Modal } from "@/main/common/ui/Modal";
import { VariantChips } from "@/main/common/ui/VariantChips";
import type { Auth, HttpRequest } from "../domain/models";
import { AuthFields } from "./AuthFields";

const storeKey = (id: string) => `flux:params:${id}`;
const authKey = (id: string) => `flux:runauth:${id}`;

const blankAuth = (): Auth => ({
    type: "bearer",
    token: "",
    username: "",
    password: "",
    key: "",
    api_key_name: "",
    add_to: "header",
});

function loadLast(id: string): Record<string, string> {
    try {
        const raw = localStorage.getItem(storeKey(id));
        return raw ? (JSON.parse(raw) as Record<string, string>) : {};
    } catch {
        return {};
    }
}

function loadLastAuth(id: string): Auth {
    try {
        const raw = localStorage.getItem(authKey(id));
        return raw ? { ...blankAuth(), ...(JSON.parse(raw) as Auth) } : blankAuth();
    } catch {
        return blankAuth();
    }
}

interface Props {
    open: boolean;
    request: HttpRequest;
    onClose: () => void;
    onRun: (values: Record<string, string>, runtimeAuth?: Auth) => void;
}

export function RunParamsDialog({ open, request, onClose, onRun }: Props) {
    const declared = (request.parameters ?? []).filter((p) => p.name.trim());
    const needAuth = request.auth.type === "parameter";
    const [values, setValues] = useState<Record<string, string>>({});
    const [auth, setAuth] = useState<Auth>(blankAuth);

    useEffect(() => {
        if (!open) return;
        const last = loadLast(request.id);
        const init: Record<string, string> = {};
        for (const p of declared) init[p.name] = last[p.name] ?? p.default;
        setValues(init);
        if (needAuth) setAuth(loadLastAuth(request.id));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, request.id]);

    const missing = declared.filter((p) => p.required && !(values[p.name] ?? "").trim()).map((p) => p.name);

    const run = () => {
        if (missing.length) return;
        try {
            localStorage.setItem(storeKey(request.id), JSON.stringify(values));
            if (needAuth) localStorage.setItem(authKey(request.id), JSON.stringify(auth));
        } catch {
            /* ignore quota / disabled storage */
        }
        onRun(values, needAuth ? auth : undefined);
        onClose();
    };

    return (
        <Modal
            open={open}
            onClose={onClose}
            title="Run with parameters"
            width={480}
            tourId="run-params"
            footer={
                <>
                    <Button variant="ghost" size="sm" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button
                        variant="primary"
                        size="sm"
                        onClick={run}
                        disabled={missing.length > 0}
                        leftIcon={<Play size={14} />}
                    >
                        Send
                    </Button>
                </>
            }
        >
            <div className="space-y-3.5">
                {needAuth && (
                    <div className="rounded-lg border border-border bg-bg/40 p-3">
                        <p className="mb-2 text-[12px] font-medium uppercase tracking-wide text-subtle">
                            Authorization
                        </p>
                        <AuthFields
                            auth={auth}
                            onChange={(patch) => setAuth((a) => ({ ...a, ...patch }))}
                            allowIdentity
                        />
                    </div>
                )}
                {declared.map((p) => (
                    <div key={p.name}>
                        <div className="mb-1 flex items-baseline gap-2">
                            <label className="mono text-[13px] text-fg">{p.name}</label>
                            {p.required && <span className="text-[11px] font-medium text-amber-400">required</span>}
                            {p.description && (
                                <span className="truncate text-[12px] text-subtle">- {p.description}</span>
                            )}
                        </div>
                        <HighlightedInput
                            value={values[p.name] ?? ""}
                            onChange={(v) => setValues((s) => ({ ...s, [p.name]: v }))}
                            placeholder={p.default || "value or {{var}}"}
                            wrapperClassName="h-9 w-full rounded-lg border border-border bg-bg"
                            textClassName="px-2.5 mono text-[13px]"
                        />
                        {(p.options?.length ?? 0) > 0 && (
                            <VariantChips
                                options={p.options ?? []}
                                value={values[p.name] ?? ""}
                                onPick={(v) => setValues((s) => ({ ...s, [p.name]: v }))}
                                className="mt-1.5"
                            />
                        )}
                    </div>
                ))}
                {missing.length > 0 && (
                    <p className="text-[12px] text-amber-400">Fill required: {missing.join(", ")}</p>
                )}
            </div>
        </Modal>
    );
}

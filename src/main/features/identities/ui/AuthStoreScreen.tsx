// Full-screen Auth Store: manage the workspace's reusable identities. Left = the
// list (with the default marked), right = an editor for the selected identity.
import { KeyRound, Plus, Star, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button, IconButton } from "@/main/common/ui/Button";
import { Input, Label, Select } from "@/main/common/ui/Field";
import { HighlightedInput } from "@/main/common/ui/HighlightedInput";
import { EmptyState } from "@/main/common/ui/feedback";
import { toast } from "@/main/common/ui/toast";
import { cn } from "@/main/common/utils/cn";
import { HelpButton } from "@/main/features/guide/ui/HelpButton";
import { useHelp } from "@/main/features/guide/ui/useHelp";
import { tourAnchor } from "@/main/features/guide/domain/anchors";
import type { Auth, AuthType } from "@/main/features/request-editor/domain/models";
import type { Identity } from "../domain/models";
import { useAuthStoreScreen } from "./useAuthStoreScreen";
import { useIdentities } from "./useIdentities";

const AUTH_LABEL: Record<string, string> = { none: "No auth", bearer: "Bearer", basic: "Basic", apikey: "API key" };

export function AuthStoreScreen() {
    const { identities, loaded, load, create, save, remove, setDefault } = useIdentities();
    const setScreen = useAuthStoreScreen((s) => s.setOpen);
    const [selectedId, setSelectedId] = useState<string | null>(null);

    useEffect(() => {
        if (!loaded) void load();
    }, [loaded, load]);

    // keep a valid selection
    useEffect(() => {
        if (selectedId && !identities.some((i) => i.id === selectedId)) setSelectedId(null);
        if (!selectedId && identities.length) setSelectedId(identities[0].id);
    }, [identities, selectedId]);

    const selected = identities.find((i) => i.id === selectedId) ?? null;

    const addIdentity = async () => {
        const created = await create(`Identity ${identities.length + 1}`);
        setSelectedId(created.id);
    };

    return (
        <div className="flex min-h-0 flex-1 flex-col bg-bg">
            <div className="flex h-11 shrink-0 items-center gap-2 border-b border-border px-4">
                <KeyRound size={16} className="text-accent" />
                <span className="text-sm font-semibold">Auth store</span>
                <span className="text-[12px] text-subtle">- reusable identities for this workspace</span>
                <div className="flex-1" />
                <HelpButton title="Auth store" run={() => useHelp.getState().startAuthStoreTour()} />
                <IconButton label="Close" onClick={() => setScreen(false)}>
                    <X size={16} />
                </IconButton>
            </div>

            <div className="flex min-h-0 flex-1">
                <aside className="flex w-64 shrink-0 flex-col border-r border-border">
                    <div className="min-h-0 flex-1 overflow-y-auto p-2">
                        {identities.length === 0 ? (
                            <p className="px-2 py-6 text-center text-[12px] text-subtle">No identities yet.</p>
                        ) : (
                            identities.map((i) => (
                                <button
                                    key={i.id}
                                    onClick={() => setSelectedId(i.id)}
                                    className={cn(
                                        "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[13px]",
                                        i.id === selectedId
                                            ? "bg-accent/15 text-fg"
                                            : "text-muted hover:bg-elevated hover:text-fg",
                                    )}
                                >
                                    <KeyRound size={13} className="shrink-0 text-subtle" />
                                    <span className="min-w-0 flex-1 truncate">{i.name}</span>
                                    {i.is_default && (
                                        <Star size={12} className="shrink-0 fill-amber-400 text-amber-400" />
                                    )}
                                    <span className="shrink-0 text-[10px] uppercase text-subtle">
                                        {AUTH_LABEL[i.auth.type] ?? i.auth.type}
                                    </span>
                                </button>
                            ))
                        )}
                    </div>
                    <div className="border-t border-border p-2">
                        <Button
                            variant="subtle"
                            size="sm"
                            leftIcon={<Plus size={14} />}
                            onClick={addIdentity}
                            className="w-full"
                            {...tourAnchor("auth-new-identity")}
                        >
                            New identity
                        </Button>
                    </div>
                </aside>

                <main className="min-h-0 flex-1 overflow-y-auto">
                    {selected ? (
                        <IdentityEditor
                            key={selected.id}
                            identity={selected}
                            onSave={save}
                            onDelete={async () => {
                                await remove(selected.id);
                                toast.info("Identity deleted");
                            }}
                            onMakeDefault={() => setDefault(selected.id)}
                        />
                    ) : (
                        <EmptyState
                            icon={<KeyRound size={24} />}
                            title="No identity selected"
                            hint="Create an identity to store a reusable auth configuration (e.g. Admin -> bearer {{admin_token}})."
                        />
                    )}
                </main>
            </div>
        </div>
    );
}

function IdentityEditor({
    identity,
    onSave,
    onDelete,
    onMakeDefault,
}: {
    identity: Identity;
    onSave: (i: Identity) => Promise<void>;
    onDelete: () => Promise<void>;
    onMakeDefault: () => void;
}) {
    const [draft, setDraft] = useState<Identity>(identity);
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Sync when the saved entity changes from outside (e.g. default toggled).
    useEffect(() => {
        setDraft(identity);
    }, [identity]);

    const schedule = (next: Identity) => {
        setDraft(next);
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => void onSave(next), 500);
    };
    const setName = (name: string) => schedule({ ...draft, name });
    const setAuth = (patch: Partial<Auth>) => schedule({ ...draft, auth: { ...draft.auth, ...patch } });

    const a = draft.auth;

    return (
        <div className="max-w-2xl space-y-5 p-5" {...tourAnchor("auth-identity-editor")}>
            <div className="flex items-center gap-3">
                <Input
                    value={draft.name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Identity name"
                    className="h-9 max-w-xs text-sm font-medium"
                />
                {draft.is_default ? (
                    <span className="flex items-center gap-1 text-[12px] font-medium text-amber-400">
                        <Star size={13} className="fill-amber-400" /> Default
                    </span>
                ) : (
                    <Button
                        variant="ghost"
                        size="sm"
                        leftIcon={<Star size={14} />}
                        onClick={onMakeDefault}
                        {...tourAnchor("auth-make-default")}
                    >
                        Make default
                    </Button>
                )}
                <div className="flex-1" />
                <Button variant="danger" size="sm" leftIcon={<Trash2 size={14} />} onClick={() => void onDelete()}>
                    Delete
                </Button>
            </div>

            <div>
                <Label>Auth type</Label>
                <Select value={a.type} onChange={(e) => setAuth({ type: e.target.value as AuthType })} className="w-52">
                    <option value="none">No auth</option>
                    <option value="bearer">Bearer token</option>
                    <option value="basic">Basic auth</option>
                    <option value="apikey">API key</option>
                </Select>
            </div>

            {a.type === "bearer" && (
                <Field label="Token">
                    <HighlightedInput
                        value={a.token}
                        onChange={(v) => setAuth({ token: v })}
                        placeholder="{{admin_access_token}}"
                        {...inputChrome}
                    />
                </Field>
            )}

            {a.type === "basic" && (
                <div className="grid grid-cols-2 gap-3">
                    <Field label="Username">
                        <Input
                            value={a.username}
                            onChange={(e) => setAuth({ username: e.target.value })}
                            className="mono"
                        />
                    </Field>
                    <Field label="Password">
                        <Input
                            type="password"
                            value={a.password}
                            onChange={(e) => setAuth({ password: e.target.value })}
                            className="mono"
                        />
                    </Field>
                </div>
            )}

            {a.type === "apikey" && (
                <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Key name">
                            <Input
                                value={a.api_key_name}
                                onChange={(e) => setAuth({ api_key_name: e.target.value })}
                                placeholder="X-API-Key"
                                className="mono"
                            />
                        </Field>
                        <Field label="Value">
                            <HighlightedInput
                                value={a.key}
                                onChange={(v) => setAuth({ key: v })}
                                placeholder="{{api_key}}"
                                {...inputChrome}
                            />
                        </Field>
                    </div>
                    <Field label="Add to">
                        <Select
                            value={a.add_to}
                            onChange={(e) => setAuth({ add_to: e.target.value as "header" | "query" })}
                            className="w-40"
                        >
                            <option value="header">Header</option>
                            <option value="query">Query param</option>
                        </Select>
                    </Field>
                </div>
            )}

            <p className="text-[12px] text-subtle">
                Use <code className="mono">{"{{variables}}"}</code> from your environment for secrets. Reference this
                identity from a request's auth or a flow's Set-auth.
            </p>
        </div>
    );
}

const inputChrome = {
    wrapperClassName:
        "h-9 w-full rounded-lg border border-border bg-surface transition-colors hover:border-subtle focus-within:border-accent",
    textClassName: "px-3 mono text-[13px]",
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div>
            <Label>{label}</Label>
            {children}
        </div>
    );
}

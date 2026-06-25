// Full-screen Swagger / OpenAPI importer. Paste (or fetch) a spec, preview every
// operation grouped by tag, pick any subset, and import them - into a brand-new
// collection or an existing one. Selecting a single operation is just the
// one-request case of the same flow. Each operation becomes a request with its
// method/url/query/headers/body/auth and path params surfaced as Inputs.
import { Boxes, CheckSquare, Download, FileJson, Link2, Loader2, Square, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button, IconButton } from "@/main/common/ui/Button";
import { Checkbox, Input, Label, Select, Textarea } from "@/main/common/ui/Field";
import { MethodBadge } from "@/main/common/ui/badges";
import { EmptyState, Spinner } from "@/main/common/ui/feedback";
import { toast } from "@/main/common/ui/toast";
import { cn } from "@/main/common/utils/cn";
import { useCollections } from "@/main/features/collections/ui/useCollections";
import { useSidebarState } from "@/main/features/collections/ui/useSidebarState";
import { HelpButton } from "@/main/features/guide/ui/HelpButton";
import { importTour } from "@/main/features/guide/tours/scoped";
import { collectionsRepository } from "@/main/features/collections/data/collections-repository";
import { canWrite } from "@/main/features/workspaces/domain/models";
import { requestsRepository } from "@/main/features/request-editor/data/requests-repository";
import { sendOutgoing } from "@/main/features/request-editor/data/transport";
import type { HttpRequest } from "@/main/features/request-editor/domain/models";
import { parseOpenApi, type ImportOperation, type ParseResult } from "../domain/openapi";
import { useSwaggerImport } from "./useSwaggerImport";

const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n) : s);

const SAMPLE_HINT = `Paste an OpenAPI 3.x or Swagger 2.0 document (JSON or YAML) - or load it from a URL above.`;

export function SwaggerImportScreen() {
    const close = useSwaggerImport((s) => s.close);
    const launchCollectionId = useSwaggerImport((s) => s.collectionId);
    const presetSpec = useSwaggerImport((s) => s.presetSpec);
    const consumePreset = useSwaggerImport((s) => s.consumePreset);
    const tree = useCollections((s) => s.tree);
    const writableCollections = useMemo(() => tree.filter((c) => canWrite(c.role)), [tree]);

    const [text, setText] = useState("");
    const [url, setUrl] = useState("");
    const [fetching, setFetching] = useState(false);
    const [parsed, setParsed] = useState<ParseResult | null>(null);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [filter, setFilter] = useState("");

    const [dest, setDest] = useState<"new" | "existing">(launchCollectionId ? "existing" : "new");
    const [existingId, setExistingId] = useState<string | null>(
        launchCollectionId ?? writableCollections[0]?.id ?? null,
    );
    const [newName, setNewName] = useState("");
    const [baseUrl, setBaseUrl] = useState("");
    const [useBaseVar, setUseBaseVar] = useState(false);

    const [importing, setImporting] = useState(false);
    const [progress, setProgress] = useState({ done: 0, total: 0 });

    // The onboarding import tutorial pre-fills a sample spec; apply it once.
    useEffect(() => {
        if (presetSpec) {
            setText(presetSpec);
            consumePreset();
        }
    }, [presetSpec, consumePreset]);

    // Debounced parse as the spec text changes.
    useEffect(() => {
        if (!text.trim()) {
            setParsed(null);
            return;
        }
        const t = setTimeout(() => setParsed(parseOpenApi(text)), 250);
        return () => clearTimeout(t);
    }, [text]);

    // Seed selection + sensible defaults when a spec parses (without clobbering
    // anything the user has already typed into the destination fields).
    useEffect(() => {
        if (!parsed || !parsed.ok) return;
        setSelected(new Set(parsed.operations.map((o) => o.key)));
        setBaseUrl((prev) => (prev.trim() ? prev : (parsed.servers[0] ?? "")));
        setNewName((prev) => (prev.trim() ? prev : parsed.title));
    }, [parsed]);

    // Keep the existing-collection selection valid.
    useEffect(() => {
        if (existingId && !writableCollections.some((c) => c.id === existingId)) {
            setExistingId(writableCollections[0]?.id ?? null);
        }
    }, [writableCollections, existingId]);

    const ops = parsed?.ok ? parsed.operations : [];
    const filteredOps = useMemo(() => {
        const q = filter.trim().toLowerCase();
        if (!q) return ops;
        return ops.filter(
            (o) =>
                o.path.toLowerCase().includes(q) ||
                o.summary.toLowerCase().includes(q) ||
                o.method.toLowerCase().includes(q),
        );
    }, [ops, filter]);

    const grouped = useMemo(() => {
        const map = new Map<string, ImportOperation[]>();
        for (const o of filteredOps) {
            const list = map.get(o.tag) ?? [];
            list.push(o);
            map.set(o.tag, list);
        }
        return Array.from(map.entries());
    }, [filteredOps]);

    const selectedCount = selected.size;
    const toggle = (key: string) =>
        setSelected((prev) => {
            const next = new Set(prev);
            next.has(key) ? next.delete(key) : next.add(key);
            return next;
        });
    const selectAll = () => setSelected(new Set(ops.map((o) => o.key)));
    const selectNone = () => setSelected(new Set());
    const toggleGroup = (groupOps: ImportOperation[]) =>
        setSelected((prev) => {
            const next = new Set(prev);
            const allOn = groupOps.every((o) => next.has(o.key));
            for (const o of groupOps) allOn ? next.delete(o.key) : next.add(o.key);
            return next;
        });

    const fetchUrl = async () => {
        if (!url.trim()) return;
        setFetching(true);
        try {
            const res = await sendOutgoing({
                method: "GET",
                url: url.trim(),
                headers: { Accept: "application/json, application/yaml, text/yaml, text/plain, */*" },
                body: null,
            });
            if (res.status >= 400) {
                toast.error(`Couldn't fetch spec (HTTP ${res.status})`);
            }
            setText(res.body || "");
        } catch {
            toast.error("Couldn't fetch that URL");
        } finally {
            setFetching(false);
        }
    };

    const destReady = dest === "new" ? !!newName.trim() || (parsed?.ok ?? false) : !!existingId;
    const canImport = parsed?.ok === true && selectedCount > 0 && destReady && !importing;

    const doImport = async () => {
        if (!parsed?.ok) return;
        const chosen = parsed.operations.filter((o) => selected.has(o.key));
        if (!chosen.length) return;

        setImporting(true);
        setProgress({ done: 0, total: chosen.length });
        const base = useBaseVar ? "{{baseUrl}}" : baseUrl.trim();

        try {
            let collectionId = existingId;
            if (dest === "new") {
                const name = clip(newName.trim() || parsed.title || "Imported API", 120);
                const created = await useCollections.getState().createCollection(name);
                if (!created) throw new Error("Could not create the collection");
                collectionId = created;
            }
            if (!collectionId) throw new Error("Choose a destination collection");

            const failures: string[] = [];
            let firstId: string | null = null;
            let done = 0;
            for (const op of chosen) {
                try {
                    const fields = op.build({ baseUrl: base });
                    const displayName = clip(fields.name || `${op.method} ${op.path}`, 160);
                    const createdReq = await collectionsRepository.createRequest(
                        collectionId,
                        displayName,
                        op.method,
                        "http",
                    );
                    firstId ??= createdReq.id;
                    const full: HttpRequest = {
                        id: createdReq.id,
                        collection_id: createdReq.collection_id,
                        owner_id: "",
                        kind: "http",
                        name: displayName,
                        method: fields.method,
                        url: fields.url,
                        params: fields.params,
                        headers: fields.headers,
                        auth: fields.auth,
                        body: fields.body,
                        parameters: fields.parameters,
                        scripts: { pre: { blocks: [], code: "" }, post: { blocks: [], code: "" } },
                        flow: { steps: [] },
                        created_at: "",
                        updated_at: "",
                    };
                    await requestsRepository.save(full);
                } catch {
                    failures.push(op.key);
                } finally {
                    done += 1;
                    setProgress({ done, total: chosen.length });
                }
            }

            await useCollections.getState().refresh();
            if (collectionId) useSidebarState.getState().expand(collectionId);
            // Land the user on the first imported request when there's just one.
            if (chosen.length === 1 && firstId) useCollections.getState().select(firstId);

            const okCount = chosen.length - failures.length;
            if (failures.length === 0) {
                toast.success(`Imported ${okCount} request${okCount === 1 ? "" : "s"}`);
            } else {
                toast.error(`Imported ${okCount}/${chosen.length}; ${failures.length} failed`);
            }
            close();
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Import failed");
        } finally {
            setImporting(false);
        }
    };

    const parseError = parsed && !parsed.ok ? parsed.error : null;

    return (
        <div className="flex min-h-0 flex-1 flex-col bg-bg">
            {/* header */}
            <div className="flex h-11 shrink-0 items-center gap-2 border-b border-border px-4">
                <Download size={16} className="text-accent" />
                <span className="text-sm font-semibold">Import from Swagger / OpenAPI</span>
                <span className="hidden text-[12px] text-subtle sm:inline">
                    - bring in a single request or a whole collection
                </span>
                <div className="flex-1" />
                <HelpButton tour={importTour} title="Import" />
                <IconButton label="Close" onClick={close}>
                    <X size={16} />
                </IconButton>
            </div>

            {/* body: source/options (left) + operations (right) */}
            <div className="flex min-h-0 flex-1">
                <aside
                    className="flex w-[380px] shrink-0 flex-col gap-4 overflow-y-auto border-r border-border p-4"
                    data-tour="import-source"
                >
                    <div>
                        <Label>Spec URL (optional)</Label>
                        <div className="flex gap-2">
                            <Input
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && void fetchUrl()}
                                placeholder="https://api.example.com/openapi.json"
                                className="mono h-9 text-[13px]"
                            />
                            <Button
                                variant="subtle"
                                size="md"
                                className="h-9 shrink-0"
                                onClick={() => void fetchUrl()}
                                disabled={!url.trim() || fetching}
                                leftIcon={
                                    fetching ? <Loader2 size={14} className="animate-spin" /> : <Link2 size={14} />
                                }
                            >
                                Fetch
                            </Button>
                        </div>
                    </div>

                    <div className="flex min-h-[160px] flex-col">
                        <Label>Spec (JSON or YAML)</Label>
                        <Textarea
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            placeholder={
                                "openapi: 3.0.0\ninfo:\n  title: My API\npaths:\n  /users:\n    get: { summary: List users }"
                            }
                            className="mono h-44 flex-1 text-[12px]"
                        />
                        {parseError && <p className="mt-1.5 text-[12px] text-rose-400">{parseError}</p>}
                        {parsed?.ok && (
                            <p className="mt-1.5 text-[12px] text-emerald-400">
                                {parsed.title}
                                {parsed.version ? ` v${parsed.version}` : ""} · {ops.length} operation
                                {ops.length === 1 ? "" : "s"} · OpenAPI {parsed.specVersion}
                            </p>
                        )}
                    </div>

                    <div className="space-y-4" data-tour="import-dest">
                        {/* destination */}
                        <div className="space-y-2">
                            <Label>Import into</Label>
                            <div className="space-y-2">
                                <label className="flex cursor-pointer items-center gap-2 text-[13px] text-fg">
                                    <input
                                        type="radio"
                                        name="dest"
                                        checked={dest === "new"}
                                        onChange={() => setDest("new")}
                                        className="accent-[rgb(var(--accent))]"
                                    />
                                    <Boxes size={14} className="text-subtle" /> New collection
                                </label>
                                {dest === "new" && (
                                    <Input
                                        value={newName}
                                        onChange={(e) => setNewName(e.target.value)}
                                        placeholder="Collection name"
                                        className="ml-6 h-9 w-[calc(100%-1.5rem)] text-[13px]"
                                    />
                                )}
                                <label
                                    className={cn(
                                        "flex items-center gap-2 text-[13px]",
                                        writableCollections.length
                                            ? "cursor-pointer text-fg"
                                            : "cursor-not-allowed text-subtle",
                                    )}
                                >
                                    <input
                                        type="radio"
                                        name="dest"
                                        checked={dest === "existing"}
                                        disabled={writableCollections.length === 0}
                                        onChange={() => setDest("existing")}
                                        className="accent-[rgb(var(--accent))]"
                                    />
                                    <FileJson size={14} className="text-subtle" /> Existing collection
                                </label>
                                {dest === "existing" && (
                                    <Select
                                        value={existingId ?? ""}
                                        onChange={(e) => setExistingId(e.target.value || null)}
                                        className="ml-6 h-9 w-[calc(100%-1.5rem)] text-[13px]"
                                    >
                                        {writableCollections.length === 0 && (
                                            <option value="">No writable collections</option>
                                        )}
                                        {writableCollections.map((c) => (
                                            <option key={c.id} value={c.id}>
                                                {c.name}
                                            </option>
                                        ))}
                                    </Select>
                                )}
                            </div>
                        </div>

                        {/* base url */}
                        <div className="space-y-1.5">
                            <Label>Base URL</Label>
                            <Input
                                value={useBaseVar ? "{{baseUrl}}" : baseUrl}
                                onChange={(e) => setBaseUrl(e.target.value)}
                                disabled={useBaseVar}
                                placeholder="https://api.example.com"
                                className="mono h-9 text-[13px] disabled:opacity-60"
                            />
                            {parsed?.ok && parsed.servers.filter(Boolean).length > 1 && !useBaseVar && (
                                <div className="flex flex-wrap gap-1">
                                    {parsed.servers.filter(Boolean).map((s) => (
                                        <button
                                            key={s}
                                            onClick={() => setBaseUrl(s)}
                                            className={cn(
                                                "mono rounded-md border px-1.5 py-0.5 text-[11px]",
                                                s === baseUrl
                                                    ? "border-accent/50 bg-accent/10 text-accent"
                                                    : "border-border text-subtle hover:text-fg",
                                            )}
                                        >
                                            {s}
                                        </button>
                                    ))}
                                </div>
                            )}
                            <label className="flex cursor-pointer items-center gap-1.5 text-[12px] text-muted">
                                <Checkbox checked={useBaseVar} onChange={(e) => setUseBaseVar(e.target.checked)} />
                                Use <span className="mono text-accent">{"{{baseUrl}}"}</span> variable instead
                            </label>
                            <p className="text-[11px] text-subtle">
                                Path params become <span className="mono text-amber-300">{"{{Inputs}}"}</span>; secured
                                endpoints get <span className="mono text-accent">{"{{access_token}}"}</span> /{" "}
                                <span className="mono text-accent">{"{{api_key}}"}</span> placeholders.
                            </p>
                        </div>
                    </div>
                </aside>

                {/* operations */}
                <main className="flex min-h-0 flex-1 flex-col" data-tour="import-ops">
                    {parsed?.ok ? (
                        <>
                            <div className="flex shrink-0 items-center gap-2 border-b border-border px-4 py-2">
                                <Input
                                    value={filter}
                                    onChange={(e) => setFilter(e.target.value)}
                                    placeholder="Filter operations…"
                                    className="h-8 max-w-xs text-[13px]"
                                />
                                <span className="text-[12px] text-subtle">
                                    {selectedCount} of {ops.length} selected
                                </span>
                                <div className="flex-1" />
                                <button
                                    onClick={selectAll}
                                    className="flex items-center gap-1 text-[12px] text-muted hover:text-fg"
                                >
                                    <CheckSquare size={13} /> All
                                </button>
                                <button
                                    onClick={selectNone}
                                    className="flex items-center gap-1 text-[12px] text-muted hover:text-fg"
                                >
                                    <Square size={13} /> None
                                </button>
                            </div>

                            <div className="min-h-0 flex-1 overflow-y-auto p-3">
                                {grouped.length === 0 ? (
                                    <p className="px-2 py-6 text-center text-[12px] text-subtle">
                                        No operations match “{filter}”.
                                    </p>
                                ) : (
                                    grouped.map(([tag, groupOps]) => {
                                        const allOn = groupOps.every((o) => selected.has(o.key));
                                        return (
                                            <div key={tag} className="mb-3">
                                                <button
                                                    onClick={() => toggleGroup(groupOps)}
                                                    className="mb-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-subtle hover:text-fg"
                                                >
                                                    {allOn ? (
                                                        <CheckSquare size={12} className="text-accent" />
                                                    ) : (
                                                        <Square size={12} />
                                                    )}
                                                    {tag}
                                                    <span className="text-subtle/70">{groupOps.length}</span>
                                                </button>
                                                <div className="space-y-1">
                                                    {groupOps.map((op) => {
                                                        const on = selected.has(op.key);
                                                        return (
                                                            <button
                                                                key={op.key}
                                                                onClick={() => toggle(op.key)}
                                                                className={cn(
                                                                    "flex w-full items-center gap-2.5 rounded-lg border px-2.5 py-1.5 text-left transition-colors",
                                                                    on
                                                                        ? "border-accent/40 bg-accent/10"
                                                                        : "border-transparent hover:bg-elevated",
                                                                )}
                                                            >
                                                                <Checkbox
                                                                    checked={on}
                                                                    readOnly
                                                                    tabIndex={-1}
                                                                    className="pointer-events-none"
                                                                />
                                                                <MethodBadge
                                                                    method={op.method}
                                                                    className="w-12 shrink-0"
                                                                />
                                                                <span className="mono shrink-0 truncate text-[12px] text-fg">
                                                                    {op.path}
                                                                </span>
                                                                {op.summary &&
                                                                    op.summary !== `${op.method} ${op.path}` && (
                                                                        <span className="truncate text-[12px] text-subtle">
                                                                            - {op.summary}
                                                                        </span>
                                                                    )}
                                                                {op.deprecated && (
                                                                    <span className="ml-auto shrink-0 rounded bg-amber-500/10 px-1.5 py-px text-[10px] font-medium uppercase text-amber-400">
                                                                        deprecated
                                                                    </span>
                                                                )}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </>
                    ) : (
                        <EmptyState
                            icon={<FileJson size={26} />}
                            title={parseError ? "Couldn't parse the spec" : "No spec loaded"}
                            hint={parseError ?? SAMPLE_HINT}
                        />
                    )}
                </main>
            </div>

            {/* footer */}
            <div
                className="flex h-14 shrink-0 items-center justify-between border-t border-border px-4"
                data-tour="import-footer"
            >
                <span className="text-[12px] text-subtle">
                    {importing
                        ? `Importing ${progress.done}/${progress.total}…`
                        : selectedCount > 0
                          ? `${selectedCount} request${selectedCount === 1 ? "" : "s"} -> ${dest === "new" ? newName || "new collection" : (writableCollections.find((c) => c.id === existingId)?.name ?? "collection")}`
                          : "Select operations to import"}
                </span>
                <div className="flex items-center gap-2">
                    <Button variant="ghost" onClick={close} disabled={importing}>
                        Cancel
                    </Button>
                    <Button
                        variant="primary"
                        onClick={() => void doImport()}
                        disabled={!canImport}
                        leftIcon={importing ? <Spinner className="h-4 w-4" /> : <Download size={15} />}
                    >
                        {importing
                            ? "Importing…"
                            : `Import ${selectedCount || ""} request${selectedCount === 1 ? "" : "s"}`.trim()}
                    </Button>
                </div>
            </div>
        </div>
    );
}

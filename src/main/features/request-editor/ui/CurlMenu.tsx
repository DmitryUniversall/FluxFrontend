import { AnimatePresence, motion } from "framer-motion";
import { ClipboardCopy, Download, MoreHorizontal } from "lucide-react";
import { useState } from "react";
import { Button, IconButton } from "@/main/common/ui/Button";
import { Textarea } from "@/main/common/ui/Field";
import { Modal } from "@/main/common/ui/Modal";
import { useEscClose } from "@/main/common/ui/useEscClose";
import { toast } from "@/main/common/ui/toast";
import { useEnvironments } from "@/main/features/environments/ui/useEnvironments";
import { parseCurl, toCurl } from "../domain/curl";
import { buildOutgoing } from "../domain/use-cases";
import { useRequestEditor } from "./useRequestEditor";

export function CurlMenu() {
    const { request, update } = useRequestEditor();
    const [open, setOpen] = useState(false);
    const [importOpen, setImportOpen] = useState(false);
    const [text, setText] = useState("");

    useEscClose(open, () => setOpen(false));

    if (!request) return null;

    const copy = () => {
        const outgoing = buildOutgoing(request, useEnvironments.getState().resolve);
        void navigator.clipboard?.writeText(toCurl(outgoing));
        toast.success("Copied as cURL");
        setOpen(false);
    };

    const doImport = () => {
        if (!text.trim()) return;
        try {
            const p = parseCurl(text);
            if (!p.url) return toast.error("Couldn't find a URL in that command");
            update({
                method: p.method,
                url: p.url,
                params: p.params,
                headers: p.headers,
                body: p.body,
                auth: p.auth ?? {
                    type: "none",
                    token: "",
                    username: "",
                    password: "",
                    key: "",
                    api_key_name: "",
                    add_to: "header",
                },
            });
            toast.success("Request imported from cURL");
            setImportOpen(false);
            setText("");
        } catch {
            toast.error("Could not parse that cURL command");
        }
    };

    return (
        <>
            <div className="relative">
                <IconButton
                    label="More actions"
                    onClick={() => setOpen((v) => !v)}
                    className="h-10 w-10 border border-border bg-surface hover:border-subtle"
                >
                    <MoreHorizontal size={17} />
                </IconButton>
                <AnimatePresence>
                    {open && (
                        <>
                            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
                            <motion.div
                                className="absolute right-0 z-50 mt-1.5 w-52 overflow-hidden rounded-xl border border-border bg-elevated p-1 shadow-2xl"
                                initial={{ opacity: 0, scale: 0.97, y: -4 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.97 }}
                                transition={{ duration: 0.12 }}
                            >
                                <button
                                    onClick={copy}
                                    className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-[13px] text-fg hover:bg-accent/15 hover:text-accent"
                                >
                                    <ClipboardCopy size={14} /> Copy as cURL
                                </button>
                                <button
                                    onClick={() => {
                                        setOpen(false);
                                        setImportOpen(true);
                                    }}
                                    className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-[13px] text-fg hover:bg-accent/15 hover:text-accent"
                                >
                                    <Download size={14} /> Import from cURL…
                                </button>
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>
            </div>

            <Modal
                open={importOpen}
                onClose={() => setImportOpen(false)}
                title="Import from cURL"
                width={560}
                footer={
                    <>
                        <Button variant="ghost" size="sm" onClick={() => setImportOpen(false)}>
                            Cancel
                        </Button>
                        <Button variant="primary" size="sm" onClick={doImport} disabled={!text.trim()}>
                            Import
                        </Button>
                    </>
                }
            >
                <p className="mb-3 text-[13px] text-muted">
                    Paste a cURL command - method, URL, query, headers, body and basic/bearer auth will fill this
                    request.
                </p>
                <Textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder={"curl https://api.example.com/users \\\n  -H 'Authorization: Bearer {{token}}'"}
                    className="mono h-44 text-[13px]"
                    autoFocus
                />
            </Modal>
        </>
    );
}

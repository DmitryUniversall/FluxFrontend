// Full-screen documentation: a small wiki with a grouped left nav and a content
// pane (mirrors the Settings screen layout). Content lives in domain/docs.ts.
import { BookOpen, X } from "lucide-react";
import { useMemo, useState } from "react";
import { IconButton } from "@/main/common/ui/Button";
import { ContentBlocks, type ContentBlock } from "@/main/common/ui/ContentBlocks";
import { cn } from "@/main/common/utils/cn";
import { useHasPermission } from "@/main/features/auth/ui/useAuth";
import { DOCS, type DocBlock, type DocPage } from "../domain/docs";
import { DocDemo } from "./DocsInteractive";
import { useHelp } from "./useHelp";

// Map the docs' compact DocBlock onto the shared content-block model.
function toContentBlock(b: DocBlock): ContentBlock {
    switch (b.t) {
        case "h":
            return { kind: "heading", text: b.text };
        case "p":
            return { kind: "paragraph", text: b.text };
        case "ul":
            return { kind: "list", items: b.items };
        case "steps":
            return { kind: "steps", items: b.items };
        case "code":
            return { kind: "code", text: b.text };
        case "note":
            return { kind: "note", text: b.text };
        case "demo":
            return { kind: "demo", demo: b.kind };
    }
}

export function DocsScreen() {
    const closeDocs = useHelp((s) => s.closeDocs);
    const isAdmin = useHasPermission("admin.access");
    const [pageId, setPageId] = useState(DOCS[0]?.pages[0]?.id ?? "");

    // Admin-only sections appear in the nav only for users with admin.access.
    const sections = useMemo(() => DOCS.filter((s) => !s.admin || isAdmin), [isAdmin]);

    const page = useMemo<DocPage | undefined>(() => {
        for (const s of sections) for (const p of s.pages) if (p.id === pageId) return p;
        return sections[0]?.pages[0];
    }, [pageId, sections]);

    return (
        <div className="flex min-h-0 flex-1 flex-col bg-bg">
            <div className="flex h-11 shrink-0 items-center gap-2 border-b border-border px-4">
                <BookOpen size={16} className="text-accent" />
                <span className="text-sm font-semibold">Documentation</span>
                <div className="flex-1" />
                <IconButton label="Close" onClick={closeDocs}>
                    <X size={16} />
                </IconButton>
            </div>

            <div className="flex min-h-0 flex-1">
                <aside className="w-64 shrink-0 overflow-y-auto border-r border-border p-3">
                    {sections.map((section) => (
                        <div key={section.id} className="mb-4">
                            <p className="px-2 pb-1 text-[10.5px] font-semibold uppercase tracking-wide text-subtle">
                                {section.title}
                            </p>
                            {section.pages.map((p) => (
                                <button
                                    key={p.id}
                                    onClick={() => setPageId(p.id)}
                                    className={cn(
                                        "flex w-full items-center rounded-lg px-2.5 py-1.5 text-left text-[13px] transition-colors",
                                        p.id === pageId
                                            ? "bg-accent/15 font-medium text-fg"
                                            : "text-muted hover:bg-elevated hover:text-fg",
                                    )}
                                >
                                    <span className="truncate">{p.title}</span>
                                </button>
                            ))}
                        </div>
                    ))}
                </aside>

                <main className="min-h-0 flex-1 overflow-y-auto">
                    {page && (
                        <article className="mx-auto max-w-3xl px-8 py-7">
                            <h1 className="mb-5 border-b border-border pb-3 text-xl font-semibold text-fg">
                                {page.title}
                            </h1>
                            <ContentBlocks
                                blocks={page.blocks.map(toContentBlock)}
                                renderDemo={(demo) => <DocDemo kind={demo} />}
                            />
                        </article>
                    )}
                </main>
            </div>
        </div>
    );
}

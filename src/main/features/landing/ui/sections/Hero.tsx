// Full-viewport hero: wordmark, slogan, CTAs. Dark, minimal, single accent.
import { ArrowRight, PlayCircle, Server } from "lucide-react";
import { Link } from "react-router-dom";

const PILLS = ["Self-hosted", "Flow scenarios", "Scoped variables", "OpenAPI import", "Workspaces"];

export function Hero() {
    return (
        <section className="relative flex min-h-[calc(100vh-3.5rem)] items-center overflow-hidden">
            {/* subtle accent glow */}
            <div
                aria-hidden
                className="pointer-events-none absolute inset-0"
                style={{
                    background:
                        "radial-gradient(60rem 40rem at 50% -10%, rgb(var(--accent) / 0.16), transparent 60%)",
                }}
            />
            <div className="relative mx-auto w-full max-w-4xl px-6 py-24 text-center">
                <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-surface/70 px-3 py-1 text-[12.5px] text-muted">
                    <Server size={13} className="text-accent" />
                    Self-hosted · your data, your server
                </div>

                <h1 className="text-5xl font-bold tracking-tight text-fg sm:text-7xl">Flux</h1>
                <p className="mx-auto mt-5 max-w-2xl text-balance text-xl font-medium text-fg sm:text-2xl">
                    A self-hosted workspace for HTTP APIs.
                </p>
                <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-muted">
                    Build, send and chain requests with scoped variables, visual scripting and runnable flows.
                    Accounts, collections and secrets stay on your own infrastructure.
                </p>

                <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
                    <Link
                        to="/register"
                        className="inline-flex h-11 items-center gap-2 rounded-lg bg-accent px-6 text-sm font-semibold text-white shadow-sm shadow-accent/20 transition-all hover:brightness-110"
                    >
                        Get started <ArrowRight size={16} />
                    </Link>
                    <a
                        href="#try"
                        className="inline-flex h-11 items-center gap-2 rounded-lg border border-border bg-surface px-6 text-sm font-semibold text-fg transition-colors hover:border-subtle"
                    >
                        <PlayCircle size={16} className="text-accent" /> Try the live demo
                    </a>
                </div>

                <div className="mt-12 flex flex-wrap items-center justify-center gap-2">
                    {PILLS.map((p) => (
                        <span
                            key={p}
                            className="rounded-full border border-border bg-surface/50 px-3 py-1 text-[12.5px] text-muted"
                        >
                            {p}
                        </span>
                    ))}
                </div>
            </div>
        </section>
    );
}

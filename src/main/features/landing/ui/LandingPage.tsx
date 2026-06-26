// Public landing page (web only, logged-out front door). Sells the product and
// embeds fully-working, isolated copies of the request panel and a Flow run.
import { Boxes, Braces, Compass, FileJson, Gauge, KeyRound, Server, Users, Zap } from "lucide-react";
import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useEnvironments } from "@/main/features/environments/ui/useEnvironments";
import { demoEnvironment } from "../data/demoData";
import { RequestDemo } from "./demos/RequestDemo";
import { FlowDemo } from "./demos/FlowDemo";
import { FeatureGrid, type FeatureCard } from "./sections/FeatureGrid";
import { FeatureSection } from "./sections/FeatureSection";
import { Hero } from "./sections/Hero";

const REPOS = {
    infra: "https://github.com/DmitryUniversall/FluxInfra",
    backend: "https://github.com/DmitryUniversall/FluxBackend",
    frontend: "https://github.com/DmitryUniversall/FluxFrontend",
};

const FEATURES: FeatureCard[] = [
    {
        icon: <Server size={20} />,
        title: "Self-hosted",
        description:
            "Your data, your server. Accounts, collections and secrets never leave your infrastructure — deploy the whole stack with one Docker Compose.",
    },
    {
        icon: <Boxes size={20} />,
        title: "Block-based scripting",
        description:
            "Pre-request and post-response logic from visual, nestable blocks (assert, save-to-env, conditions) — or plain JavaScript. One engine feeds the Tests panel.",
    },
    {
        icon: <KeyRound size={20} />,
        title: "Auth Store",
        description:
            "Reusable identities (Bearer / Basic / API key) defined once and resolved at send time, so rotating a credential is a single edit in one place.",
    },
    {
        icon: <Braces size={20} />,
        title: "Scoped variables",
        description:
            "Every {{name}} resolves through an ordered chain — dynamics, request params, flow, environment — colour-coded inline so a typo is obvious before you send.",
    },
    {
        icon: <Users size={20} />,
        title: "Workspaces & collaboration",
        description:
            "Shareable workspaces with owner / editor / viewer roles, invitations, and live sync of shared collections, environments and identities.",
    },
    {
        icon: <FileJson size={20} />,
        title: "OpenAPI / Swagger import",
        description:
            "Turn a 3.x or 2.0 document into ready-to-send requests: operations become requests, path params become inputs, and security maps onto Flux auth.",
    },
    {
        icon: <Compass size={20} />,
        title: "Guides & tours",
        description:
            "Interactive onboarding and feature tours spin up a real sandbox, so you learn Flux by doing rather than by reading docs.",
    },
    {
        icon: <Gauge size={20} />,
        title: "Admin panel",
        description:
            "A built-in dashboard: live metrics, instance settings, registration controls, roles & permissions, and release announcements.",
    },
];

export function LandingPage() {
    // Seed the (otherwise empty, logged-out) environments store with the demo env
    // so {{base_url}} highlights and autocompletes in the demos exactly like the
    // app. Restored on unmount; signing in reloads environments anyway.
    useEffect(() => {
        const prev = {
            environments: useEnvironments.getState().environments,
            activeId: useEnvironments.getState().activeId,
            loaded: useEnvironments.getState().loaded,
        };
        const env = demoEnvironment();
        useEnvironments.setState({ environments: [env], activeId: env.id, loaded: true });
        return () => useEnvironments.setState(prev);
    }, []);

    return (
        <div className="min-h-screen bg-bg text-fg">
            {/* nav */}
            <header className="sticky top-0 z-40 border-b border-border/70 bg-bg/80 backdrop-blur">
                <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
                    <div className="flex items-center gap-2">
                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-accent/15 text-accent">
                            <Zap size={16} />
                        </span>
                        <span className="text-[15px] font-bold tracking-tight">Flux</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Link
                            to="/login"
                            className="rounded-lg px-3 py-1.5 text-[13px] font-medium text-muted transition-colors hover:text-fg"
                        >
                            Sign in
                        </Link>
                        <Link
                            to="/register"
                            className="rounded-lg bg-accent px-3.5 py-1.5 text-[13px] font-semibold text-white transition-all hover:brightness-110"
                        >
                            Get started
                        </Link>
                    </div>
                </div>
            </header>

            <main>
                <Hero />

                <FeatureSection
                    id="try"
                    eyebrow="Request panel"
                    title="Compose, send and inspect — right here"
                    description={
                        <>
                            This is the real request editor, shrunk down. Switch endpoints with the buttons, edit the
                            JSON body as a form or raw, set auth, and watch <span className="text-accent">{"{{base_url}}"}</span>{" "}
                            resolve as you type. The <span className="text-fg">Get user by id</span> request even declares a
                            typed parameter, so Send asks for it first. No sign-in required.
                        </>
                    }
                    footnote="Requests run against a built-in practice sandbox through a public, rate-limited proxy."
                >
                    <RequestDemo />
                </FeatureSection>

                <FeatureSection
                    eyebrow="Flow"
                    title="Chain requests into a runnable scenario"
                    description={
                        <>
                            A Flow turns a sequence of requests into a scenario: capture values, branch, loop, poll and
                            prompt — all against an isolated per-run scope. Hit <span className="text-fg">Run</span> to
                            watch a real flow log in, capture the token, reuse it as a Bearer credential on the next call,
                            and assert the result.
                        </>
                    }
                >
                    <FlowDemo />
                </FeatureSection>

                <FeatureSection
                    eyebrow="Everything else"
                    title="Built for real API work"
                    description="Beyond sending requests, Flux ships the systems a team actually needs to stay organised and self-reliant."
                >
                    <FeatureGrid items={FEATURES} />
                </FeatureSection>
            </main>

            {/* footer */}
            <footer className="border-t border-border">
                <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-10 sm:flex-row">
                    <div className="flex items-center gap-2 text-[13px] text-subtle">
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-accent/15 text-accent">
                            <Zap size={13} />
                        </span>
                        Flux — your data, your server.
                    </div>
                    <div className="flex items-center gap-4 text-[13px] text-muted">
                        <a href={REPOS.infra} target="_blank" rel="noreferrer" className="hover:text-fg">
                            Infra
                        </a>
                        <a href={REPOS.backend} target="_blank" rel="noreferrer" className="hover:text-fg">
                            Backend
                        </a>
                        <a href={REPOS.frontend} target="_blank" rel="noreferrer" className="hover:text-fg">
                            Frontend
                        </a>
                        <Link to="/login" className="hover:text-fg">
                            Sign in
                        </Link>
                    </div>
                </div>
            </footer>
        </div>
    );
}

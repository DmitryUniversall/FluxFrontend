// Compact feature cards for the headline systems that aren't interactive demos.
import type { ReactNode } from "react";
import { Reveal } from "./Reveal";

export interface FeatureCard {
    icon: ReactNode;
    title: string;
    description: string;
}

export function FeatureGrid({ items }: { items: FeatureCard[] }) {
    return (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((f, i) => (
                <Reveal key={f.title} delay={(i % 3) * 0.05}>
                    <div className="h-full rounded-2xl border border-border bg-surface/60 p-5 transition-colors hover:border-subtle">
                        <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
                            {f.icon}
                        </div>
                        <h3 className="text-[15px] font-semibold text-fg">{f.title}</h3>
                        <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted">{f.description}</p>
                    </div>
                </Reveal>
            ))}
        </div>
    );
}

// A detailed feature section: eyebrow + title + description, with optional
// full-width content below (used to embed the interactive demos).
import type { ReactNode } from "react";
import { Reveal } from "./Reveal";

export function FeatureSection({
    id,
    eyebrow,
    title,
    description,
    footnote,
    children,
}: {
    id?: string;
    eyebrow: string;
    title: string;
    description: ReactNode;
    footnote?: ReactNode;
    children?: ReactNode;
}) {
    return (
        <section id={id} className="mx-auto w-full max-w-5xl scroll-mt-20 px-6 py-20">
            <Reveal>
                <p className="mb-3 text-[12.5px] font-semibold uppercase tracking-[0.2em] text-accent">{eyebrow}</p>
                <h2 className="max-w-3xl text-balance text-3xl font-bold tracking-tight text-fg sm:text-4xl">
                    {title}
                </h2>
                <div className="mt-4 max-w-2xl text-[15px] leading-relaxed text-muted">{description}</div>
            </Reveal>
            {children && (
                <Reveal delay={0.1} className="mt-10">
                    {children}
                </Reveal>
            )}
            {footnote && <p className="mt-4 text-[12.5px] text-subtle">{footnote}</p>}
        </section>
    );
}

// The onboarding prompts: the first one offered right after registration ("take
// the tour?"), then a chain offered one after another as each follow-up tour
// finishes - import -> collaboration -> auth store. Driven by useHelp.offer;
// rendered once at the shell level.
import { KeyRound, Rocket, Sparkles, Users, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/main/common/ui/Button";
import { Modal } from "@/main/common/ui/Modal";
import { useHelp } from "./useHelp";

export function OnboardingOffer() {
    const offer = useHelp((s) => s.offer);
    const busy = useHelp((s) => s.busy);
    const dismiss = useHelp((s) => s.dismissOffer);
    const startOnboarding = useHelp((s) => s.startOnboarding);
    const startImportTour = useHelp((s) => s.startImportTour);
    const startCollaborationTour = useHelp((s) => s.startCollaborationTour);
    const startAuthStoreTour = useHelp((s) => s.startAuthStoreTour);

    const configs: Record<
        Exclude<typeof offer, null>,
        {
            title: string;
            body: ReactNode;
            cta: string;
            icon: LucideIcon;
            decline: string;
            disabled?: boolean;
            onStart: () => void;
        }
    > = {
        onboarding: {
            title: "Welcome to Flux 🎉",
            icon: Rocket,
            cta: busy ? "Setting up…" : "Start the tour",
            decline: "Maybe later",
            disabled: busy,
            onStart: () => void startOnboarding(),
            body: (
                <>
                    Want a hands-on tour of the essentials? We'll create a sandbox{" "}
                    <b className="text-fg">Onboarding&nbsp;Guide</b> workspace with sample requests and a flow, then
                    walk through sending requests, scripting, environments, auth and flows together. It takes about five
                    minutes, and you can stop any time.
                </>
            ),
        },
        import: {
            title: "Nice work! 🎉",
            icon: Sparkles,
            cta: "Show me",
            decline: "No thanks",
            onStart: startImportTour,
            body: "Want a quick look at importing an existing API from an OpenAPI or Swagger document? It takes about a minute.",
        },
        collaboration: {
            title: "On to teamwork 🤝",
            icon: Users,
            cta: "Show me",
            decline: "No thanks",
            onStart: startCollaborationTour,
            body: "Next up: collaborating with a team in a shared workspace - inviting members, assigning roles, and what they can see.",
        },
        authStore: {
            title: "One more: the Auth store 🔐",
            icon: KeyRound,
            cta: "Show me",
            decline: "No thanks",
            disabled: busy,
            onStart: () => void startAuthStoreTour(),
            body: "Last one: reusable identities. Store a credential once, mark it as the default, and use it on any request - we'll set one up together.",
        },
    };

    const c = offer ? configs[offer] : null;

    return (
        <Modal
            open={offer !== null}
            onClose={dismiss}
            title={c?.title ?? ""}
            footer={
                c && (
                    <>
                        <Button variant="ghost" onClick={dismiss}>
                            {c.decline}
                        </Button>
                        <Button
                            variant="primary"
                            leftIcon={<c.icon size={15} />}
                            disabled={c.disabled}
                            onClick={c.onStart}
                        >
                            {c.cta}
                        </Button>
                    </>
                )
            }
        >
            {c && <p className="text-[13px] leading-relaxed text-muted">{c.body}</p>}
        </Modal>
    );
}

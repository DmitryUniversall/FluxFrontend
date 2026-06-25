// The "do you want to take this tour?" prompt shown when a per-screen "?" button
// is clicked. Mounted globally so it works over any screen (including the
// full-screen Auth store / Import overlays).
import { Sparkles } from "lucide-react";
import { Button } from "@/main/common/ui/Button";
import { Modal } from "@/main/common/ui/Modal";
import { useHelp } from "./useHelp";

export function TourConfirm() {
    const pending = useHelp((s) => s.pendingTour);
    const confirm = useHelp((s) => s.confirmPendingTour);
    const cancel = useHelp((s) => s.cancelPendingTour);

    return (
        <Modal
            open={!!pending}
            onClose={cancel}
            title="Start this tutorial?"
            width={420}
            footer={
                <>
                    <Button variant="ghost" onClick={cancel}>
                        Not now
                    </Button>
                    <Button variant="primary" leftIcon={<Sparkles size={15} />} onClick={confirm}>
                        Start tutorial
                    </Button>
                </>
            }
        >
            <p className="text-[13px] leading-relaxed text-muted">
                Take the <b className="text-fg">{pending?.title}</b> walkthrough now? We will guide you step by step
                right here, and you can stop any time.
            </p>
        </Modal>
    );
}

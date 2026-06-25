// Wires the invitation notification buttons to the invitations API. This is the
// payoff of the action-registry indirection: notifications render "Accept" /
// "Decline" without depending on invitations, while this module - owned by the
// invitations feature - supplies the behaviour. Called once at app startup.
import { toast } from "@/main/common/ui/toast";
import { registerNotificationAction } from "@/main/features/notifications/domain/action-registry";
import { useWorkspaces } from "@/main/features/workspaces/ui/useWorkspaces";
import { invitationsRepository } from "../data/invitations-repository";

let registered = false;

export function registerInvitationActions(): void {
    if (registered) return;
    registered = true;

    registerNotificationAction("workspace_invite", "accept", async (n) => {
        await invitationsRepository.accept(String(n.data.invitation_id));
        // The newly joined workspace must appear in the switcher.
        await useWorkspaces.getState().load();
        toast.success("You joined the workspace");
    });

    registerNotificationAction("workspace_invite", "decline", async (n) => {
        await invitationsRepository.decline(String(n.data.invitation_id));
        toast.info("Invitation declined");
    });
}

// Notification display settings (browser-local): what surfaces on this device.
import { Switch } from "@/main/common/ui/Switch";
import { useUiPrefs } from "@/main/common/ui/useUiPrefs";
import { SettingRow, SettingsGroup, SettingsPage } from "../parts";

export function NotificationsSection() {
    const { collaboratorToasts, unreadBadge, set } = useUiPrefs();
    return (
        <SettingsPage title="Notifications" description="What the app surfaces while you work. Stored in your browser.">
            <SettingsGroup>
                <SettingRow
                    title="Unread badge"
                    description="Show the unread count badge on the notifications bell."
                    control={
                        <Switch checked={unreadBadge} onChange={(v) => set("unreadBadge", v)} label="Unread badge" />
                    }
                />
                <SettingRow
                    title="Collaborator update toasts"
                    description="Pop a toast when a teammate's change to the request you have open is pulled in."
                    control={
                        <Switch
                            checked={collaboratorToasts}
                            onChange={(v) => set("collaboratorToasts", v)}
                            label="Collaborator update toasts"
                        />
                    }
                />
            </SettingsGroup>
        </SettingsPage>
    );
}

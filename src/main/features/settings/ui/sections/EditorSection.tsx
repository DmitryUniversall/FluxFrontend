// Editor settings (browser-local): request-sending behaviour. Stored per-device.
import { Switch } from "@/main/common/ui/Switch";
import { useUiPrefs } from "@/main/common/ui/useUiPrefs";
import { SettingRow, SettingsGroup, SettingsPage } from "../parts";

export function EditorSection() {
    const { runFormByDefault, set } = useUiPrefs();
    return (
        <SettingsPage title="Editor" description="How the request editor behaves on this device.">
            <SettingsGroup title="Sending">
                <SettingRow
                    title="Always show the run form before sending"
                    description="Open the parameter form on every Send, even when all parameters have defaults. A request can still force this on its own in the Inputs tab."
                    control={
                        <Switch
                            checked={runFormByDefault}
                            onChange={(v) => set("runFormByDefault", v)}
                            label="Always show the run form before sending"
                        />
                    }
                />
            </SettingsGroup>
        </SettingsPage>
    );
}

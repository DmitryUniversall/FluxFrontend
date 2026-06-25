// Appearance settings (browser-local): how responses render. Stored per-device.
import { Select } from "@/main/common/ui/Field";
import { Switch } from "@/main/common/ui/Switch";
import { useUiPrefs, type ResponseView } from "@/main/common/ui/useUiPrefs";
import { SettingRow, SettingsGroup, SettingsPage } from "../parts";

export function AppearanceSection() {
    const { responseView, wrapResponse, set } = useUiPrefs();
    return (
        <SettingsPage
            title="Appearance"
            description="How the workspace looks on this device. Saved in your browser, not synced."
        >
            <SettingsGroup title="Responses">
                <SettingRow
                    title="Default body view"
                    description="Which view a response opens in. You can still switch per response."
                    control={
                        <Select
                            value={responseView}
                            onChange={(e) => set("responseView", e.target.value as ResponseView)}
                            className="h-8 w-32 text-[13px]"
                        >
                            <option value="tree">Tree</option>
                            <option value="raw">Raw</option>
                        </Select>
                    }
                />
                <SettingRow
                    title="Wrap long lines"
                    description="Wrap long lines in the raw body view instead of scrolling sideways."
                    control={
                        <Switch
                            checked={wrapResponse}
                            onChange={(v) => set("wrapResponse", v)}
                            label="Wrap long lines"
                        />
                    }
                />
            </SettingsGroup>
        </SettingsPage>
    );
}

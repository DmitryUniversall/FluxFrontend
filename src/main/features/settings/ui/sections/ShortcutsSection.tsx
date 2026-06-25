// Keyboard shortcuts reference (read-only). Mirrors the hotkeys wired in the
// request editor and flow editor; the modifier label follows the OS.
import { SettingsGroup, SettingsPage } from "../parts";

const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);
const MOD = isMac ? "⌘" : "Ctrl";

const SHORTCUTS: { keys: string[]; action: string }[] = [
    { keys: [MOD, "Enter"], action: "Send the request (Run the flow)" },
    { keys: [MOD, "S"], action: "Save the open request or flow" },
    { keys: ["Enter"], action: "Send - while editing the URL field" },
    { keys: ["Esc"], action: "Close the open dialog" },
];

function Keys({ keys }: { keys: string[] }) {
    return (
        <span className="flex items-center gap-1">
            {keys.map((k, i) => (
                <kbd
                    key={i}
                    className="mono inline-flex min-w-[1.5rem] items-center justify-center rounded-md border border-border bg-bg px-1.5 py-0.5 text-[12px] text-fg shadow-sm"
                >
                    {k}
                </kbd>
            ))}
        </span>
    );
}

export function ShortcutsSection() {
    return (
        <SettingsPage title="Keyboard shortcuts" description="Speed up the common actions.">
            <SettingsGroup>
                {SHORTCUTS.map((s, i) => (
                    <div
                        key={i}
                        className="flex items-center justify-between border-b border-border px-4 py-3 last:border-0"
                    >
                        <span className="text-[13px] text-fg">{s.action}</span>
                        <Keys keys={s.keys} />
                    </div>
                ))}
            </SettingsGroup>
        </SettingsPage>
    );
}

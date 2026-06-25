// Account settings (server-stored): change username and password. Read-only
// account facts (id, joined) round it out.
import { useState } from "react";
import { ApiError } from "@/core/http/http-client";
import { Button } from "@/main/common/ui/Button";
import { Input } from "@/main/common/ui/Field";
import { toast } from "@/main/common/ui/toast";
import { authRepository } from "@/main/features/auth/data/auth-repository";
import { useAuth } from "@/main/features/auth/ui/useAuth";
import { SettingField, SettingsGroup, SettingsPage } from "../parts";

export function AccountSection() {
    const { user, updateUsername } = useAuth();
    const [username, setUsername] = useState(user?.username ?? "");
    const [savingName, setSavingName] = useState(false);

    const [current, setCurrent] = useState("");
    const [next, setNext] = useState("");
    const [confirm, setConfirm] = useState("");
    const [savingPw, setSavingPw] = useState(false);

    const nameChanged = username.trim() !== "" && username.trim() !== user?.username;

    const saveName = async () => {
        setSavingName(true);
        try {
            await updateUsername(username.trim());
            toast.success("Username updated");
        } catch (e) {
            toast.error(e instanceof ApiError ? e.message : "Couldn't update username");
            setUsername(user?.username ?? "");
        } finally {
            setSavingName(false);
        }
    };

    const savePassword = async () => {
        if (next !== confirm) return toast.error("New passwords don't match");
        setSavingPw(true);
        try {
            await authRepository.changePassword(current, next);
            toast.success("Password changed");
            setCurrent("");
            setNext("");
            setConfirm("");
        } catch (e) {
            toast.error(e instanceof ApiError ? e.message : "Couldn't change password");
        } finally {
            setSavingPw(false);
        }
    };

    return (
        <SettingsPage title="Account" description="Your sign-in details. These are stored on the server.">
            <SettingsGroup title="Username">
                <SettingField label="Username" hint="3-32 characters. Others use this to invite you to workspaces.">
                    <div className="flex gap-2">
                        <Input
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="mono max-w-xs"
                        />
                        <Button variant="primary" size="sm" onClick={saveName} disabled={!nameChanged || savingName}>
                            {savingName ? "Saving…" : "Save"}
                        </Button>
                    </div>
                </SettingField>
            </SettingsGroup>

            <SettingsGroup title="Password">
                <SettingField label="Current password">
                    <Input
                        type="password"
                        value={current}
                        onChange={(e) => setCurrent(e.target.value)}
                        className="max-w-xs"
                        autoComplete="current-password"
                    />
                </SettingField>
                <SettingField label="New password" hint="At least 6 characters.">
                    <Input
                        type="password"
                        value={next}
                        onChange={(e) => setNext(e.target.value)}
                        className="max-w-xs"
                        autoComplete="new-password"
                    />
                </SettingField>
                <SettingField label="Confirm new password">
                    <div className="flex gap-2">
                        <Input
                            type="password"
                            value={confirm}
                            onChange={(e) => setConfirm(e.target.value)}
                            className="max-w-xs"
                            autoComplete="new-password"
                        />
                        <Button
                            variant="primary"
                            size="sm"
                            onClick={savePassword}
                            disabled={savingPw || !current || next.length < 6 || !confirm}
                        >
                            {savingPw ? "Updating…" : "Update password"}
                        </Button>
                    </div>
                </SettingField>
            </SettingsGroup>

            <SettingsGroup title="About">
                <div className="px-4 py-3 text-[12px] text-subtle">
                    <div className="flex justify-between py-0.5">
                        <span>User ID</span>
                        <span className="mono text-muted">{user?.id}</span>
                    </div>
                    <div className="flex justify-between py-0.5">
                        <span>Joined</span>
                        <span className="text-muted">
                            {user?.created_at ? new Date(user.created_at).toLocaleDateString() : "-"}
                        </span>
                    </div>
                </div>
            </SettingsGroup>
        </SettingsPage>
    );
}

// Shared auth editor: type selector + the fields each scheme needs. Used by the
// request Auth tab and the run dialog (and anywhere an `Auth` is edited).
// `allowIdentity` exposes "Stored identity"; `allowParameter` exposes
// "Ask on run", which defers auth to call time.
import { HighlightedInput } from "@/main/common/ui/HighlightedInput";
import { Input, Label, Select } from "@/main/common/ui/Field";
import { IdentitySelect } from "@/main/features/identities/ui/IdentitySelect";
import type { Auth, AuthType } from "../domain/models";

const chrome = {
    wrapperClassName:
        "h-9 w-full rounded-lg border border-border bg-surface transition-colors hover:border-subtle focus-within:border-accent",
    textClassName: "px-3 mono text-[13px]",
};

export function AuthFields({
    auth,
    onChange,
    allowIdentity = false,
    allowParameter = false,
    typeAnchor,
    tokenAnchor,
}: {
    auth: Auth;
    onChange: (patch: Partial<Auth>) => void;
    allowIdentity?: boolean;
    allowParameter?: boolean;
    // Optional data-tour ids so the onboarding can point at these exact fields.
    typeAnchor?: string;
    tokenAnchor?: string;
}) {
    return (
        <div className="space-y-4">
            <div {...(typeAnchor ? { "data-tour": typeAnchor } : {})}>
                <Label>Auth type</Label>
                <Select
                    value={auth.type}
                    onChange={(e) => onChange({ type: e.target.value as AuthType })}
                    className="w-52"
                >
                    <option value="none">No auth</option>
                    <option value="bearer">Bearer token</option>
                    <option value="basic">Basic auth</option>
                    <option value="apikey">API key</option>
                    {allowIdentity && <option value="identity">Stored identity</option>}
                    {allowParameter && <option value="parameter">Ask on run (parameter)</option>}
                </Select>
            </div>

            {auth.type === "identity" && (
                <div>
                    <Label>Identity</Label>
                    <IdentitySelect
                        value={auth.identity_id ?? ""}
                        onChange={(id) => onChange({ identity_id: id })}
                        className="w-52"
                    />
                    <p className="mt-1.5 text-[12px] text-subtle">
                        Resolved from the workspace Auth store at send time.
                    </p>
                </div>
            )}

            {auth.type === "parameter" && (
                <p className="rounded-lg border border-dashed border-border bg-elevated/40 px-3 py-2 text-[12px] text-subtle">
                    Auth isn't stored on the request. You'll be prompted for it on every Send, and any flow that calls
                    this request must override the auth (per-Call or via Set-auth).
                </p>
            )}

            {auth.type === "bearer" && (
                <div {...(tokenAnchor ? { "data-tour": tokenAnchor } : {})}>
                    <Label>Token</Label>
                    <HighlightedInput
                        value={auth.token}
                        onChange={(v) => onChange({ token: v })}
                        placeholder="{{access_token}}"
                        {...chrome}
                    />
                </div>
            )}

            {auth.type === "basic" && (
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <Label>Username</Label>
                        <Input
                            value={auth.username}
                            onChange={(e) => onChange({ username: e.target.value })}
                            className="mono"
                        />
                    </div>
                    <div>
                        <Label>Password</Label>
                        <Input
                            type="password"
                            value={auth.password}
                            onChange={(e) => onChange({ password: e.target.value })}
                            className="mono"
                        />
                    </div>
                </div>
            )}

            {auth.type === "apikey" && (
                <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <Label>Key name</Label>
                            <Input
                                value={auth.api_key_name}
                                onChange={(e) => onChange({ api_key_name: e.target.value })}
                                placeholder="X-API-Key"
                                className="mono"
                            />
                        </div>
                        <div>
                            <Label>Value</Label>
                            <HighlightedInput
                                value={auth.key}
                                onChange={(v) => onChange({ key: v })}
                                placeholder="{{api_key}}"
                                {...chrome}
                            />
                        </div>
                    </div>
                    <div>
                        <Label>Add to</Label>
                        <Select
                            value={auth.add_to}
                            onChange={(e) => onChange({ add_to: e.target.value as "header" | "query" })}
                            className="w-40"
                        >
                            <option value="header">Header</option>
                            <option value="query">Query param</option>
                        </Select>
                    </div>
                </div>
            )}
        </div>
    );
}

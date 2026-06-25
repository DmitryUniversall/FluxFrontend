// Dropdown for picking a stored identity. "" = the workspace default. Used by
// the request Auth tab and the flow Set-auth / per-Call auth editors.
import { Select } from "@/main/common/ui/Field";
import { useIdentities } from "./useIdentities";

export function IdentitySelect({
    value,
    onChange,
    className,
}: {
    value: string;
    onChange: (id: string) => void;
    className?: string;
}) {
    const identities = useIdentities((s) => s.identities);
    const def = identities.find((i) => i.is_default);
    return (
        <Select value={value} onChange={(e) => onChange(e.target.value)} className={className}>
            <option value="">Workspace default{def ? ` · ${def.name}` : ""}</option>
            {identities.map((i) => (
                <option key={i.id} value={i.id}>
                    {i.name}
                </option>
            ))}
        </Select>
    );
}

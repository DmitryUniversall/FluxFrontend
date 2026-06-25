import { ANCHORS } from "@/main/features/guide/domain/anchors";
import type { HttpRequest } from "../../domain/models";
import { AuthFields } from "../AuthFields";

interface Props {
    request: HttpRequest;
    update: (patch: Partial<HttpRequest>) => void;
}

export function AuthTab({ request, update }: Props) {
    const auth = request.auth;
    return (
        <div className="max-w-xl p-4">
            <AuthFields
                auth={auth}
                onChange={(patch) => update({ auth: { ...auth, ...patch } })}
                allowIdentity
                allowParameter
                typeAnchor={ANCHORS.authType}
                tokenAnchor={ANCHORS.authToken}
            />
        </div>
    );
}

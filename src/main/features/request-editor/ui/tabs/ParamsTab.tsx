import { KeyValueEditor } from "../KeyValueEditor";
import type { HttpRequest } from "../../domain/models";

interface Props {
    request: HttpRequest;
    update: (patch: Partial<HttpRequest>) => void;
}

export function ParamsTab({ request, update }: Props) {
    return (
        <div className="p-4">
            <KeyValueEditor rows={request.params} onChange={(params) => update({ params })} keyPlaceholder="param" />
        </div>
    );
}

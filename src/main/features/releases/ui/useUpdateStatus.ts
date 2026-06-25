// Desktop update status, straight from the server verdict on /meta. The backend
// decides (web always "ok"), so the client just maps the verdict; no semver here.
import { isTauri } from "@/main/common/platform";
import { useInstanceMeta } from "@/main/features/admin/ui/useInstanceMeta";

export type UpdateStatus = "none" | "optional" | "required";

export function useUpdateStatus(): UpdateStatus {
    const status = useInstanceMeta((s) => s.meta?.client?.status);
    if (!isTauri()) return "none";
    if (status === "update_required") return "required";
    if (status === "update_recommended") return "optional";
    return "none";
}

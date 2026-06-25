// Shown to non-admin users while the instance is in maintenance mode. Admins keep
// full access (so they can turn it back off); everyone else sees this.
import { Wrench } from "lucide-react";
import { Button } from "@/main/common/ui/Button";
import { useInstanceMeta } from "@/main/features/admin/ui/useInstanceMeta";
import { useAuth } from "@/main/features/auth/ui/useAuth";

export function MaintenanceScreen() {
    const message = useInstanceMeta((s) => s.meta?.maintenance_message);
    const logout = useAuth((s) => s.logout);
    return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-bg p-6 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-300">
                <Wrench size={26} />
            </div>
            <h1 className="text-xl font-semibold text-fg">Under maintenance</h1>
            <p className="max-w-md text-sm text-muted">
                {message || "Flux is undergoing maintenance. Please check back soon."}
            </p>
            <Button variant="subtle" onClick={logout}>
                Sign out
            </Button>
        </div>
    );
}

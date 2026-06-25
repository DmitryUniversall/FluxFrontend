// Users: list/search accounts and reassign their instance role. Role changes are
// guarded server-side (anti-escalation, last-owner) - failures surface as a toast.
import { Crown, Search, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { ApiError } from "@/core/http/http-client";
import { Input, Select } from "@/main/common/ui/Field";
import { EmptyState } from "@/main/common/ui/feedback";
import { toast } from "@/main/common/ui/toast";
import { useAdminScreen } from "../useAdminScreen";

const OWNER_ID = "owner";

export function UsersSection() {
    const { users, roles, loadUsers, setUserRole } = useAdminScreen();
    const [query, setQuery] = useState("");
    // The owner role can never be assigned, so keep it out of the dropdown.
    const assignableRoles = roles.filter((role) => role.id !== OWNER_ID);

    useEffect(() => {
        void loadUsers();
    }, [loadUsers]);

    const changeRole = async (id: string, roleId: string) => {
        try {
            await setUserRole(id, roleId);
            toast.success("Role updated");
        } catch (e) {
            toast.error(e instanceof ApiError ? e.message : "Couldn't change role");
        }
    };

    return (
        <div className="space-y-4">
            <form
                className="flex items-center gap-2"
                onSubmit={(e) => {
                    e.preventDefault();
                    void loadUsers(query.trim() || undefined);
                }}
            >
                <div className="relative flex-1">
                    <Search
                        size={14}
                        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-subtle"
                    />
                    <Input
                        className="pl-9"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search users by name…"
                    />
                </div>
            </form>

            {users.length === 0 ? (
                <EmptyState icon={<Users size={22} />} title="No users" hint="No accounts match your search." />
            ) : (
                <div className="overflow-hidden rounded-xl border border-border">
                    <table className="w-full text-[13px]">
                        <thead className="bg-elevated text-subtle">
                            <tr>
                                <th className="px-3 py-2 text-left font-medium">User</th>
                                <th className="px-3 py-2 text-left font-medium">Joined</th>
                                <th className="px-3 py-2 text-right font-medium">Role</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map((user) => {
                                const isOwner = user.role?.id === OWNER_ID;
                                return (
                                    <tr key={user.id} className="border-t border-border">
                                        <td className="px-3 py-2">
                                            <div className="flex items-center gap-2.5">
                                                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-elevated text-[12px] font-semibold">
                                                    {user.username[0]?.toUpperCase()}
                                                </div>
                                                <span className="truncate text-fg">{user.username}</span>
                                            </div>
                                        </td>
                                        <td className="px-3 py-2 text-subtle">
                                            {new Date(user.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-3 py-2">
                                            <div className="flex items-center justify-end gap-1.5">
                                                {isOwner ? (
                                                    // Owner is singular and can't be reassigned.
                                                    <span className="flex items-center gap-1.5 pr-1 text-[12.5px] font-medium text-amber-400">
                                                        <Crown size={13} /> Owner
                                                    </span>
                                                ) : (
                                                    <Select
                                                        className="h-8 w-44 text-[12.5px]"
                                                        value={user.role?.id ?? ""}
                                                        onChange={(e) => void changeRole(user.id, e.target.value)}
                                                    >
                                                        {assignableRoles.map((role) => (
                                                            <option key={role.id} value={role.id}>
                                                                {role.name}
                                                            </option>
                                                        ))}
                                                    </Select>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

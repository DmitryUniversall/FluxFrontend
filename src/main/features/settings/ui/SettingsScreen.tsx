// Full-screen Settings: a GitHub-style left nav (grouped) + a content pane.
// Consolidates the settings that have no natural home in the request workspace -
// account, appearance, editor, shortcuts, notifications, and the active
// workspace's general/members/invitations management.
import {
    Bell,
    Info,
    Keyboard,
    Palette,
    Send,
    Settings as SettingsIcon,
    SlidersHorizontal,
    SquarePen,
    User,
    Users,
    X,
    type LucideIcon,
} from "lucide-react";
import type { ComponentType } from "react";
import { IconButton } from "@/main/common/ui/Button";
import { cn } from "@/main/common/utils/cn";
import { useWorkspaces } from "@/main/features/workspaces/ui/useWorkspaces";
import { AboutSection } from "./sections/AboutSection";
import { AccountSection } from "./sections/AccountSection";
import { AppearanceSection } from "./sections/AppearanceSection";
import { EditorSection } from "./sections/EditorSection";
import { InvitationsSection } from "./sections/InvitationsSection";
import { MembersSection } from "./sections/MembersSection";
import { NotificationsSection } from "./sections/NotificationsSection";
import { ShortcutsSection } from "./sections/ShortcutsSection";
import { WorkspaceGeneralSection } from "./sections/WorkspaceGeneralSection";
import { useSettingsScreen, type SettingsSection } from "./useSettingsScreen";

interface NavItem {
    id: SettingsSection;
    label: string;
    icon: LucideIcon;
}

const SECTIONS: Record<SettingsSection, ComponentType> = {
    account: AccountSection,
    appearance: AppearanceSection,
    editor: EditorSection,
    shortcuts: ShortcutsSection,
    notifications: NotificationsSection,
    about: AboutSection,
    workspace: WorkspaceGeneralSection,
    members: MembersSection,
    invitations: InvitationsSection,
};

const USER_NAV: NavItem[] = [
    { id: "account", label: "Account", icon: User },
    { id: "appearance", label: "Appearance", icon: Palette },
    { id: "editor", label: "Editor", icon: SquarePen },
    { id: "shortcuts", label: "Keyboard shortcuts", icon: Keyboard },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "about", label: "About", icon: Info },
];

const WORKSPACE_NAV: NavItem[] = [
    { id: "workspace", label: "General", icon: SlidersHorizontal },
    { id: "members", label: "Members", icon: Users },
    { id: "invitations", label: "Invitations", icon: Send },
];

export function SettingsScreen() {
    const { section, setSection, close } = useSettingsScreen();
    const workspaceName = useWorkspaces((s) => s.active()?.name);
    const Section = SECTIONS[section];

    return (
        <div className="flex min-h-0 flex-1 flex-col bg-bg">
            <div className="flex h-11 shrink-0 items-center gap-2 border-b border-border px-4">
                <SettingsIcon size={16} className="text-accent" />
                <span className="text-sm font-semibold">Settings</span>
                <div className="flex-1" />
                <IconButton label="Close settings" onClick={close}>
                    <X size={16} />
                </IconButton>
            </div>

            <div className="flex min-h-0 flex-1">
                <aside className="w-60 shrink-0 overflow-y-auto border-r border-border p-3">
                    <NavGroup title="User" items={USER_NAV} active={section} onSelect={setSection} />
                    <NavGroup
                        title={workspaceName ? `Workspace · ${workspaceName}` : "Workspace"}
                        items={WORKSPACE_NAV}
                        active={section}
                        onSelect={setSection}
                    />
                </aside>

                <main className="min-h-0 flex-1 overflow-y-auto">
                    <Section />
                </main>
            </div>
        </div>
    );
}

function NavGroup({
    title,
    items,
    active,
    onSelect,
}: {
    title: string;
    items: NavItem[];
    active: SettingsSection;
    onSelect: (id: SettingsSection) => void;
}) {
    return (
        <div className="mb-4">
            <p className="truncate px-2 pb-1 text-[10.5px] font-semibold uppercase tracking-wide text-subtle">
                {title}
            </p>
            {items.map(({ id, label, icon: Icon }) => (
                <button
                    key={id}
                    onClick={() => onSelect(id)}
                    className={cn(
                        "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-[13px] transition-colors",
                        id === active
                            ? "bg-accent/15 font-medium text-fg"
                            : "text-muted hover:bg-elevated hover:text-fg",
                    )}
                >
                    <Icon size={15} className={cn("shrink-0", id === active ? "text-accent" : "text-subtle")} />
                    <span className="truncate">{label}</span>
                </button>
            ))}
        </div>
    );
}

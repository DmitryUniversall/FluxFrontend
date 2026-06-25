// Small helpers shared by the tours: read editor/flow state for gates, and make
// sure the panel a step points at is actually visible.
import { useLayout } from "@/main/common/ui/useLayout";
import { useCollections } from "@/main/features/collections/ui/useCollections";
import { useRequestEditor } from "@/main/features/request-editor/ui/useRequestEditor";

export const editorReq = () => useRequestEditor.getState().request;
export const hasResponse = () => !!useRequestEditor.getState().response;
export const postBlockCount = () => editorReq()?.scripts.post.blocks.length ?? 0;
export const totalBlockCount = () => {
    const s = editorReq()?.scripts;
    return (s?.pre.blocks.length ?? 0) + (s?.post.blocks.length ?? 0);
};

export const ensureResponseOpen = () => {
    if (useLayout.getState().responseCollapsed) useLayout.getState().toggleResponse();
};
export const ensureVarsOpen = () => {
    if (useLayout.getState().varsCollapsed) useLayout.getState().toggleVars();
};
export const ensureSidebarOpen = () => {
    if (useLayout.getState().sidebarCollapsed) useLayout.getState().toggleSidebar();
};
export const selectNode = (id: string) => useCollections.getState().select(id);

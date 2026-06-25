// Pure tree move for drag-and-drop over nested lists of `{ id, children? }`
// nodes (used by the block editor and the flow step editor). Supports
// reordering within a level and moving a node into/out of a container, using
// the container + index that dnd-kit reports. Guards against dropping a
// container into its own subtree.
export type ChildrenOf<T> = (t: T) => T[] | undefined;
export type WithChildren<T> = (t: T, children: T[]) => T;

export const ROOT = "root";

function findNode<T extends { id: string }>(items: T[], id: string, ch: ChildrenOf<T>): T | null {
    for (const it of items) {
        if (it.id === id) return it;
        const c = ch(it);
        if (c) {
            const f = findNode(c, id, ch);
            if (f) return f;
        }
    }
    return null;
}

function removeById<T extends { id: string }>(items: T[], id: string, ch: ChildrenOf<T>, w: WithChildren<T>): T[] {
    const out: T[] = [];
    for (const it of items) {
        if (it.id === id) continue;
        const c = ch(it);
        out.push(c ? w(it, removeById(c, id, ch, w)) : it);
    }
    return out;
}

function getList<T extends { id: string }>(items: T[], containerId: string, ch: ChildrenOf<T>): T[] | null {
    if (containerId === ROOT) return items;
    const node = findNode(items, containerId, ch);
    return node ? (ch(node) ?? []) : null;
}

function setList<T extends { id: string }>(
    items: T[],
    containerId: string,
    list: T[],
    ch: ChildrenOf<T>,
    w: WithChildren<T>,
): T[] {
    if (containerId === ROOT) return list;
    return items.map((it) => {
        if (it.id === containerId) return w(it, list);
        const c = ch(it);
        return c ? w(it, setList(c, containerId, list, ch, w)) : it;
    });
}

function isDescendant<T extends { id: string }>(
    items: T[],
    ancestorId: string,
    id: string,
    ch: ChildrenOf<T>,
): boolean {
    const anc = findNode(items, ancestorId, ch);
    const c = anc && ch(anc);
    return c ? !!findNode(c, id, ch) : false;
}

export function moveItem<T extends { id: string }>(
    root: T[],
    ch: ChildrenOf<T>,
    w: WithChildren<T>,
    activeId: string,
    activeContainer: string,
    overContainer: string,
    overIndex: number,
): T[] | null {
    if (activeId === overContainer) return null; // into itself
    if (isDescendant(root, activeId, overContainer, ch)) return null; // into own subtree
    const node = findNode(root, activeId, ch);
    if (!node) return null;

    if (activeContainer === overContainer) {
        const list = getList(root, activeContainer, ch);
        if (!list) return null;
        const from = list.findIndex((i) => i.id === activeId);
        if (from === -1) return null;
        const to = Math.max(0, Math.min(overIndex, list.length - 1));
        const next = list.slice();
        next.splice(from, 1);
        next.splice(to, 0, node);
        return setList(root, activeContainer, next, ch, w);
    }

    const without = removeById(root, activeId, ch, w);
    const dest = getList(without, overContainer, ch);
    if (!dest) return null;
    const idx = Math.max(0, Math.min(overIndex, dest.length));
    const next = dest.slice();
    next.splice(idx, 0, node);
    return setList(without, overContainer, next, ch, w);
}

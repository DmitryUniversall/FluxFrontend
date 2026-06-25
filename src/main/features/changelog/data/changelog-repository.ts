import { api } from "@/main/common/api/api-client";
import { endpoints } from "@/main/common/api/endpoints";
import type { ContentBlock } from "@/main/common/ui/ContentBlocks";
import type { Release, UpstreamChangelog } from "../domain/models";

export interface ReleaseCreate {
    version: string;
    title: string;
    body: ContentBlock[];
    is_published: boolean;
}

export interface ReleaseUpdate {
    version?: string;
    title?: string;
    body?: ContentBlock[];
}

export const changelogRepository = {
    // Public channels.
    list: () => api.request<Release[]>(endpoints.changelog),
    latest: () => api.request<Release | null>(endpoints.changelogLatest),
    upstream: () => api.request<UpstreamChangelog>(endpoints.changelogUpstream),

    // Admin (local channel) - drafts + write operations.
    listAll: () => api.request<Release[]>(endpoints.adminChangelog),
    create: (data: ReleaseCreate) => api.request<Release>(endpoints.adminChangelog, { method: "POST", body: data }),
    update: (id: string, data: ReleaseUpdate) =>
        api.request<Release>(endpoints.adminChangelogItem(id), { method: "PUT", body: data }),
    remove: (id: string) => api.request<void>(endpoints.adminChangelogItem(id), { method: "DELETE" }),
    publish: (id: string, announceBanner?: string | null) =>
        api.request<Release>(endpoints.adminChangelogPublish(id), {
            method: "POST",
            body: { announce_banner: announceBanner ?? null },
        }),
    unpublish: (id: string) => api.request<Release>(endpoints.adminChangelogUnpublish(id), { method: "POST" }),
    reorder: (ids: string[]) =>
        api.request<Release[]>(endpoints.adminChangelogReorder, { method: "POST", body: { ids } }),
};

export type ChangelogRepository = typeof changelogRepository;

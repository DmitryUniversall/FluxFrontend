import { api } from "@/main/common/api/api-client";
import { endpoints } from "@/main/common/api/endpoints";
import type { DownloadsConfig } from "../domain/models";

export const releasesRepository = {
    // Public: the operator-published download links + version thresholds.
    downloads: () => api.request<DownloadsConfig>(endpoints.downloads),
};

export type ReleasesRepository = typeof releasesRepository;

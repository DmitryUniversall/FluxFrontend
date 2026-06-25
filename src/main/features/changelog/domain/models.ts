// Changelog models. Release bodies reuse the shared content-block model, so the
// same renderer powers the docs and the changelog.
import type { ContentBlock } from "@/main/common/ui/ContentBlocks";

export interface Release {
    id: string;
    version: string;
    title: string;
    body: ContentBlock[];
    is_published: boolean;
    published_at: string | null;
    sort_order: number;
    channel: string | null;
    created_at: string;
    updated_at: string;
}

export interface UpstreamChangelog {
    releases: Release[];
    // False when this instance is the official source or upstream is disabled.
    available: boolean;
    // True when the live fetch failed and we're serving cache (or nothing).
    stale: boolean;
}

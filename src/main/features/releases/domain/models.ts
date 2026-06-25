// Downloads config mirrors the backend DownloadsConfig: per-OS desktop builds,
// GitHub links and the version thresholds the desktop update check keys off.

export type AssetOs = "windows" | "macos" | "linux";

export interface DownloadAsset {
    id: string;
    os: AssetOs;
    label: string;
    url: string;
    kind: string;
}

export interface DownloadsConfig {
    latest_app_version: string;
    min_app_version: string;
    github_url: string;
    github_releases_url: string;
    assets: DownloadAsset[];
}

export const EMPTY_DOWNLOADS: DownloadsConfig = {
    latest_app_version: "",
    min_app_version: "",
    github_url: "",
    github_releases_url: "",
    assets: [],
};

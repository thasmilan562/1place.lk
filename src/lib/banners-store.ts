import fs from "fs";
import path from "path";
import { OfferBanner } from "./types";
import { fallbackOfferBanners } from "./data";

const BANNERS_FILE_PATH = path.join(process.cwd(), "src", "lib", "local-banners.json");

export function getLocalOfferBanners(): OfferBanner[] {
  try {
    if (!fs.existsSync(BANNERS_FILE_PATH)) {
      fs.writeFileSync(BANNERS_FILE_PATH, JSON.stringify(fallbackOfferBanners, null, 2), "utf8");
      return fallbackOfferBanners;
    }
    const raw = fs.readFileSync(BANNERS_FILE_PATH, "utf8");
    if (!raw.trim()) {
      fs.writeFileSync(BANNERS_FILE_PATH, JSON.stringify(fallbackOfferBanners, null, 2), "utf8");
      return fallbackOfferBanners;
    }
    const parsed = JSON.parse(raw) as OfferBanner[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : fallbackOfferBanners;
  } catch (e) {
    console.error("Error reading local-banners.json:", e);
    return fallbackOfferBanners;
  }
}

export function saveLocalOfferBanner(banner: Partial<OfferBanner>): OfferBanner | null {
  try {
    const list = getLocalOfferBanners();
    const bannerId = banner.id || `banner-${Date.now()}`;
    const existingIndex = list.findIndex((b) => b.id === bannerId);

    const record: OfferBanner = {
      ...(existingIndex >= 0 ? list[existingIndex] : (fallbackOfferBanners[0] || {})),
      ...banner,
      id: bannerId,
      status: banner.status || "active",
      placement: banner.placement || "homepage_hero",
    } as OfferBanner;

    if (existingIndex >= 0) {
      list[existingIndex] = record;
    } else {
      list.unshift(record);
    }

    fs.writeFileSync(BANNERS_FILE_PATH, JSON.stringify(list, null, 2), "utf8");
    return record;
  } catch (e) {
    console.error("Error saving local offer banner:", e);
    return null;
  }
}

export function deleteLocalOfferBanner(id: string): boolean {
  try {
    const list = getLocalOfferBanners();
    const cleanId = (id || "").trim();
    const filtered = list.filter((b) => b.id !== cleanId);
    fs.writeFileSync(BANNERS_FILE_PATH, JSON.stringify(filtered, null, 2), "utf8");
    return true;
  } catch (e) {
    console.error("Error deleting local offer banner:", e);
    return false;
  }
}

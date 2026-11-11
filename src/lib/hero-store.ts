import fs from "fs";
import path from "path";
import { HeroSlide } from "./types";
import { DEFAULT_HERO_SLIDES } from "./data";

const HERO_FILE_PATH = path.join(process.cwd(), "src", "lib", "local-hero-slides.json");

declare global {
  // eslint-disable-next-line no-var
  var __ONEPLACE_HERO_SLIDES__: HeroSlide[] | undefined;
  // eslint-disable-next-line no-var
  var __ONEPLACE_DELETED_HERO_SLIDE_IDS__: Set<string> | undefined;
}

function getDeletedIds(): Set<string> {
  if (!globalThis.__ONEPLACE_DELETED_HERO_SLIDE_IDS__) {
    globalThis.__ONEPLACE_DELETED_HERO_SLIDE_IDS__ = new Set<string>();
  }
  return globalThis.__ONEPLACE_DELETED_HERO_SLIDE_IDS__;
}

export function getLocalHeroSlides(): HeroSlide[] {
  const deleted = getDeletedIds();
  try {
    if (fs.existsSync(HERO_FILE_PATH)) {
      const raw = fs.readFileSync(HERO_FILE_PATH, "utf8");
      if (raw.trim()) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const diskSlides = (parsed as HeroSlide[]).filter((s) => s?.id && !deleted.has(s.id));
          if (globalThis.__ONEPLACE_HERO_SLIDES__ && globalThis.__ONEPLACE_HERO_SLIDES__.length > 0) {
            return mergeHeroSlides(diskSlides, globalThis.__ONEPLACE_HERO_SLIDES__);
          }
          globalThis.__ONEPLACE_HERO_SLIDES__ = diskSlides;
          return diskSlides;
        }
      }
    }
  } catch (e) {
    console.warn("Warning reading local-hero-slides.json:", e);
  }

  if (globalThis.__ONEPLACE_HERO_SLIDES__ && globalThis.__ONEPLACE_HERO_SLIDES__.length > 0) {
    return globalThis.__ONEPLACE_HERO_SLIDES__.filter((s) => s?.id && !deleted.has(s.id));
  }

  return DEFAULT_HERO_SLIDES.filter((s) => s?.id && !deleted.has(s.id));
}

export function mergeHeroSlides(baseList: HeroSlide[], incomingList: HeroSlide[]): HeroSlide[] {
  const deleted = getDeletedIds();
  const map = new Map<string, HeroSlide>();

  for (const item of baseList) {
    if (!item?.id || deleted.has(item.id)) continue;
    map.set(item.id, { ...item });
  }

  for (const item of incomingList) {
    if (!item?.id || deleted.has(item.id)) continue;
    const existing = map.get(item.id);
    if (!existing) {
      map.set(item.id, { ...item });
    } else {
      const existingTime = existing.updated_at ? new Date(existing.updated_at).getTime() : 0;
      const incomingTime = item.updated_at ? new Date(item.updated_at).getTime() : 0;
      if (incomingTime >= existingTime) {
        map.set(item.id, { ...existing, ...item });
      } else {
        map.set(item.id, { ...item, ...existing });
      }
    }
  }

  const merged = Array.from(map.values()).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  globalThis.__ONEPLACE_HERO_SLIDES__ = merged;
  return merged;
}

export function saveLocalHeroSlide(slide: Partial<HeroSlide>): HeroSlide {
  const deleted = getDeletedIds();
  const slideId = slide.id || `hero-${Date.now()}`;
  deleted.delete(slideId);

  const list = [...getLocalHeroSlides()];
  const existingIndex = list.findIndex((s) => s.id === slideId);
  const existingSlide = existingIndex >= 0 ? list[existingIndex] : undefined;

  const fallbackImage = "https://images.unsplash.com/photo-1592750475338-74b7b21085ab?q=80&w=2200&auto=format&fit=crop";
  const resolvedDesktop = slide.desktop_image_url || slide.image_url || existingSlide?.desktop_image_url || existingSlide?.image_url || fallbackImage;
  const resolvedMobile = slide.mobile_image_url || resolvedDesktop;

  const record: HeroSlide = {
    ...(existingSlide || DEFAULT_HERO_SLIDES[0] || {}),
    ...slide,
    id: slideId,
    image_url: slide.image_url || resolvedDesktop,
    desktop_image_url: resolvedDesktop,
    mobile_image_url: resolvedMobile,
    active: slide.active !== undefined ? slide.active !== false : (existingSlide?.active ?? true),
    sort_order: typeof slide.sort_order === "number" ? slide.sort_order : (existingSlide?.sort_order ?? 1),
    updated_at: slide.updated_at || new Date().toISOString(),
  } as HeroSlide;

  if (existingIndex >= 0) {
    list[existingIndex] = record;
  } else {
    list.unshift(record);
  }

  globalThis.__ONEPLACE_HERO_SLIDES__ = list;

  try {
    fs.writeFileSync(HERO_FILE_PATH, JSON.stringify(list, null, 2), "utf8");
  } catch (e) {
    // On read-only serverless filesystems (e.g. Vercel), in-memory + Firestore store holds the update
    console.warn("Local file write skipped (read-only fs), preserved in memory:", (e as Error)?.message || e);
  }

  return record;
}

export function deleteLocalHeroSlide(id: string): boolean {
  const cleanId = (id || "").trim();
  if (!cleanId) return false;

  const deleted = getDeletedIds();
  deleted.add(cleanId);

  const list = getLocalHeroSlides().filter((s) => s.id !== cleanId);
  globalThis.__ONEPLACE_HERO_SLIDES__ = list;

  try {
    fs.writeFileSync(HERO_FILE_PATH, JSON.stringify(list, null, 2), "utf8");
  } catch (e) {
    console.warn("Local file delete write skipped (read-only fs), preserved in memory:", (e as Error)?.message || e);
  }
  return true;
}

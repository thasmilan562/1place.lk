import fs from "fs";
import path from "path";
import { HeroSlide } from "./types";
import { DEFAULT_HERO_SLIDES } from "./data";

const HERO_FILE_PATH = path.join(process.cwd(), "src", "lib", "local-hero-slides.json");

export function getLocalHeroSlides(): HeroSlide[] {
  try {
    if (!fs.existsSync(HERO_FILE_PATH)) {
      fs.writeFileSync(HERO_FILE_PATH, JSON.stringify(DEFAULT_HERO_SLIDES, null, 2), "utf8");
      return DEFAULT_HERO_SLIDES;
    }
    const raw = fs.readFileSync(HERO_FILE_PATH, "utf8");
    if (!raw.trim()) {
      fs.writeFileSync(HERO_FILE_PATH, JSON.stringify(DEFAULT_HERO_SLIDES, null, 2), "utf8");
      return DEFAULT_HERO_SLIDES;
    }
    const parsed = JSON.parse(raw) as HeroSlide[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_HERO_SLIDES;
  } catch (e) {
    console.error("Error reading local-hero-slides.json:", e);
    return DEFAULT_HERO_SLIDES;
  }
}

export function saveLocalHeroSlide(slide: Partial<HeroSlide>): HeroSlide | null {
  try {
    const list = getLocalHeroSlides();
    const slideId = slide.id || `hero-${Date.now()}`;
    const existingIndex = list.findIndex((s) => s.id === slideId);

    const fallbackImage = "https://images.unsplash.com/photo-1592750475338-74b7b21085ab?q=80&w=2200&auto=format&fit=crop";
    const record: HeroSlide = {
      ...(existingIndex >= 0 ? list[existingIndex] : (DEFAULT_HERO_SLIDES[0] || {})),
      ...slide,
      id: slideId,
      image_url: slide.image_url || slide.desktop_image_url || fallbackImage,
      desktop_image_url: slide.desktop_image_url || slide.image_url || fallbackImage,
      mobile_image_url: slide.mobile_image_url || slide.desktop_image_url || slide.image_url || fallbackImage,
      active: slide.active !== false,
      sort_order: typeof slide.sort_order === "number" ? slide.sort_order : 1,
    } as HeroSlide;

    if (existingIndex >= 0) {
      list[existingIndex] = record;
    } else {
      list.unshift(record);
    }

    fs.writeFileSync(HERO_FILE_PATH, JSON.stringify(list, null, 2), "utf8");
    return record;
  } catch (e) {
    console.error("Error saving local hero slide:", e);
    return null;
  }
}

export function deleteLocalHeroSlide(id: string): boolean {
  try {
    const list = getLocalHeroSlides();
    const cleanId = (id || "").trim();
    const filtered = list.filter((s) => s.id !== cleanId);
    fs.writeFileSync(HERO_FILE_PATH, JSON.stringify(filtered, null, 2), "utf8");
    return true;
  } catch (e) {
    console.error("Error deleting local hero slide:", e);
    return false;
  }
}

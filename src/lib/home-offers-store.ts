import fs from "fs";
import path from "path";
import { HOME_OFFER_DEFAULTS, HomeOfferSettings } from "./home-offers";

const OFFERS_FILE_PATH = path.join(process.cwd(), "src", "lib", "local-home-offers.json");

export function getLocalHomeOffers(): HomeOfferSettings {
  try {
    if (!fs.existsSync(OFFERS_FILE_PATH)) {
      fs.writeFileSync(OFFERS_FILE_PATH, JSON.stringify(HOME_OFFER_DEFAULTS, null, 2), "utf8");
      return HOME_OFFER_DEFAULTS;
    }
    const raw = fs.readFileSync(OFFERS_FILE_PATH, "utf8");
    if (!raw.trim()) {
      fs.writeFileSync(OFFERS_FILE_PATH, JSON.stringify(HOME_OFFER_DEFAULTS, null, 2), "utf8");
      return HOME_OFFER_DEFAULTS;
    }
    const parsed = JSON.parse(raw);
    return { ...HOME_OFFER_DEFAULTS, ...parsed };
  } catch (e) {
    console.error("Error reading local-home-offers.json:", e);
    return HOME_OFFER_DEFAULTS;
  }
}

export function saveLocalHomeOffers(settings: Partial<HomeOfferSettings>): HomeOfferSettings {
  try {
    const current = getLocalHomeOffers();
    const updated: HomeOfferSettings = {
      ...current,
      ...settings,
    };
    fs.writeFileSync(OFFERS_FILE_PATH, JSON.stringify(updated, null, 2), "utf8");
    return updated;
  } catch (e) {
    console.error("Error saving local-home-offers.json:", e);
    return { ...HOME_OFFER_DEFAULTS, ...settings };
  }
}


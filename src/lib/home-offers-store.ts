import fs from "fs";
import path from "path";
import { HOME_OFFER_DEFAULTS, HomeOfferSettings } from "./home-offers";

const OFFERS_FILE_PATH = path.join(process.cwd(), "src", "lib", "local-home-offers.json");

declare global {
  // eslint-disable-next-line no-var
  var __ONEPLACE_HOME_OFFERS__: HomeOfferSettings | undefined;
}

export function getLocalHomeOffers(): HomeOfferSettings {
  try {
    if (fs.existsSync(OFFERS_FILE_PATH)) {
      const raw = fs.readFileSync(OFFERS_FILE_PATH, "utf8");
      if (raw.trim()) {
        const parsed = JSON.parse(raw);
        const diskSettings: HomeOfferSettings = { ...HOME_OFFER_DEFAULTS, ...parsed };
        if (globalThis.__ONEPLACE_HOME_OFFERS__) {
          const diskTime = diskSettings.updatedAt ? new Date(diskSettings.updatedAt).getTime() : 0;
          const memTime = globalThis.__ONEPLACE_HOME_OFFERS__.updatedAt
            ? new Date(globalThis.__ONEPLACE_HOME_OFFERS__.updatedAt).getTime()
            : 0;
          if (memTime >= diskTime) {
            return { ...diskSettings, ...globalThis.__ONEPLACE_HOME_OFFERS__ };
          }
        }
        globalThis.__ONEPLACE_HOME_OFFERS__ = diskSettings;
        return diskSettings;
      }
    }
  } catch (e) {
    console.warn("Warning reading local-home-offers.json:", e);
  }

  if (globalThis.__ONEPLACE_HOME_OFFERS__) {
    return globalThis.__ONEPLACE_HOME_OFFERS__;
  }

  return HOME_OFFER_DEFAULTS;
}

export function saveLocalHomeOffers(settings: Partial<HomeOfferSettings>): HomeOfferSettings {
  const current = getLocalHomeOffers();
  const updated: HomeOfferSettings = {
    ...current,
    ...settings,
    updatedAt: settings.updatedAt || new Date().toISOString(),
  };
  globalThis.__ONEPLACE_HOME_OFFERS__ = updated;
  try {
    fs.writeFileSync(OFFERS_FILE_PATH, JSON.stringify(updated, null, 2), "utf8");
  } catch (e) {
    console.warn("Local home-offers write skipped (read-only fs), preserved in memory:", (e as Error)?.message || e);
  }
  return updated;
}


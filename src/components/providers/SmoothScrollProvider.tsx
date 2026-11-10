"use client";

import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { getMotionSettings } from "@/lib/firestore-client";
import { DEFAULT_MOTION_SETTINGS } from "@/lib/data";
import { MotionSettings } from "@/lib/types";

// Register ScrollTrigger once on client
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

interface SmoothScrollContextType {
  lenis: Lenis | null;
  motionSettings: MotionSettings;
  isReducedMotion: boolean;
}

const SmoothScrollContext = createContext<SmoothScrollContextType>({
  lenis: null,
  motionSettings: DEFAULT_MOTION_SETTINGS,
  isReducedMotion: false,
});

export const useSmoothScroll = () => useContext(SmoothScrollContext);

export default function SmoothScrollProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [lenis, setLenis] = useState<Lenis | null>(null);
  const [motionSettings, setMotionSettings] = useState<MotionSettings>(DEFAULT_MOTION_SETTINGS);
  const [isReducedMotion, setIsReducedMotion] = useState(false);
  const lenisRef = useRef<Lenis | null>(null);

  // 1. Fetch cached motion settings
  useEffect(() => {
    getMotionSettings().then((settings) => {
      if (settings) setMotionSettings(settings);
    }).catch(() => {
      setMotionSettings(DEFAULT_MOTION_SETTINGS);
    });
  }, []);

  // 2. Check prefers-reduced-motion
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setIsReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setIsReducedMotion(e.matches);
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  const isPopStateRef = useRef(false);

  // 3. Persistent Scroll Position Tracking & Popstate detection
  useEffect(() => {
    if (typeof window === "undefined") return;

    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }

    const saveCurrentScroll = () => {
      const currentUrl = window.location.pathname + window.location.search;
      const y = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
      try {
        sessionStorage.setItem("scrollPos:" + currentUrl, y.toString());
      } catch {}
    };

    const handlePopState = () => {
      isPopStateRef.current = true;
    };

    const handleLinkClick = (e: MouseEvent) => {
      const link = (e.target as HTMLElement)?.closest("a");
      if (link && link.href) {
        saveCurrentScroll();
      }
    };

    let scrollTimeout: ReturnType<typeof setTimeout> | null = null;
    const handleScroll = () => {
      if (scrollTimeout) clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(saveCurrentScroll, 100);
    };

    window.addEventListener("popstate", handlePopState);
    window.addEventListener("scroll", handleScroll, { passive: true });
    document.addEventListener("click", handleLinkClick, { capture: true });

    return () => {
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("scroll", handleScroll);
      document.removeEventListener("click", handleLinkClick, { capture: true });
      if (scrollTimeout) clearTimeout(scrollTimeout);
    };
  }, []);

  // 4. Initialize single Lenis instance at application root
  useEffect(() => {
    // Disable in admin dashboard, login page, or if reduced motion is enabled
    const isAdminRoute = pathname?.startsWith("/admin") || pathname === "/login";
    if (isAdminRoute || isReducedMotion || motionSettings.enableSmoothScroll === false) {
      if (lenisRef.current) {
        lenisRef.current.destroy();
        lenisRef.current = null;
        setLenis(null);
      }
      return;
    }

    const instance = new Lenis({
      duration: 1.3,
      smoothWheel: true,
      wheelMultiplier: 0.8,
      touchMultiplier: 1,
      infinite: false,
      syncTouch: false,
      easing: (t) => 1 - Math.pow(1 - t, 4),
      prevent: (node) => {
        return (
          node.hasAttribute("data-lenis-prevent") ||
          Boolean(
            node.closest(
              "[data-lenis-prevent], [role='dialog'], [data-prevent-scroll], .lenis-prevent, [data-radix-popper-content-wrapper], [data-radix-select-content], [data-radix-dropdown-menu-content]"
            )
          )
        );
      },
    });

    lenisRef.current = instance;
    setLenis(instance);

    // Synchronize Lenis with GSAP ScrollTrigger
    instance.on("scroll", () => {
      ScrollTrigger.update();
    });

    const updateTicker = (time: number) => {
      instance.raf(time * 1000);
    };

    gsap.ticker.add(updateTicker);

    return () => {
      gsap.ticker.remove(updateTicker);
      instance.destroy();
      lenisRef.current = null;
      setLenis(null);
    };
  }, [pathname, isReducedMotion, motionSettings.enableSmoothScroll]);

  // 5. Smooth Anchor link navigation handling with navbar height offset
  useEffect(() => {
    const handleAnchorClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement)?.closest("a");
      if (!target) return;

      const href = target.getAttribute("href");
      if (!href || href.startsWith("http") || href.startsWith("mailto:") || href.startsWith("tel:")) return;

      // Handle internal in-page anchor links (e.g., #featured-products or /#reviews)
      let hash = "";
      if (href.startsWith("#")) {
        hash = href;
      } else if (href.startsWith("/#") && pathname === "/") {
        hash = href.replace("/", "");
      }

      if (hash && hash !== "#") {
        const targetElement = document.querySelector(hash);
        if (targetElement) {
          e.preventDefault();
          const navHeight =
            parseInt(
              getComputedStyle(document.documentElement).getPropertyValue("--navbar-height") || "74",
              10
            ) || 74;
          const targetOffset = -(navHeight + 16);

          if (lenisRef.current) {
            lenisRef.current.scrollTo(targetElement as HTMLElement, {
              offset: targetOffset,
              duration: 1.3,
              easing: (t) => 1 - Math.pow(1 - t, 4),
            });
          } else {
            const elementRect = targetElement.getBoundingClientRect();
            const absoluteElementTop = elementRect.top + window.pageYOffset;
            window.scrollTo({
              top: absoluteElementTop + targetOffset,
              behavior: isReducedMotion ? "auto" : "smooth",
            });
          }
          window.history.pushState(null, "", hash);
        }
      }
    };

    document.addEventListener("click", handleAnchorClick);
    return () => document.removeEventListener("click", handleAnchorClick);
  }, [pathname, isReducedMotion]);

  // 6. Route navigation handling (Scroll Restoration on Back, Scroll to Top on New Navigation)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const currentUrl = window.location.pathname + window.location.search;

    if (isPopStateRef.current) {
      // BACK/FORWARD NAVIGATION: Restore saved scroll position
      isPopStateRef.current = false;
      let savedY = 0;
      try {
        const yStr = sessionStorage.getItem("scrollPos:" + currentUrl);
        if (yStr) savedY = parseInt(yStr, 10);
      } catch {}

      if (savedY > 0) {
        const restoreScroll = () => {
          if (lenisRef.current) {
            lenisRef.current.scrollTo(savedY, { immediate: true });
          } else {
            window.scrollTo({ top: savedY, behavior: "instant" });
          }
        };

        restoreScroll();
        const t1 = setTimeout(restoreScroll, 40);
        const t2 = setTimeout(restoreScroll, 120);
        const t3 = setTimeout(restoreScroll, 260);
        const t4 = setTimeout(restoreScroll, 480);

        return () => {
          clearTimeout(t1);
          clearTimeout(t2);
          clearTimeout(t3);
          clearTimeout(t4);
        };
      }
    } else {
      // NEW FORWARD NAVIGATION: Scroll to top
      if (lenisRef.current) {
        lenisRef.current.scrollTo(0, { immediate: true });
      } else {
        window.scrollTo(0, 0);
      }
    }
  }, [pathname]);

  return (
    <SmoothScrollContext.Provider value={{ lenis, motionSettings, isReducedMotion }}>
      {children}
    </SmoothScrollContext.Provider>
  );
}

"use client";

import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { SITE_LAUNCH_AT } from "@/lib/launch-config";

type TimeParts = { days: number; hours: number; minutes: number; seconds: number };

function getTimeParts(milliseconds: number): TimeParts {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
}

function timeLabel(value: number | null) {
  return value === null ? "--" : String(value).padStart(2, "0");
}

export default function LaunchCountdown() {
  const [remaining, setRemaining] = useState<number | null>(null);
  const [isLaunching, setIsLaunching] = useState(false);

  useEffect(() => {
    let didLaunch = false;
    let redirectTimer: number | undefined;
    const update = () => {
      const next = SITE_LAUNCH_AT - Date.now();
      setRemaining(Math.max(0, next));
      if (next <= 0 && !didLaunch) {
        didLaunch = true;
        setIsLaunching(true);
        redirectTimer = window.setTimeout(() => window.location.replace("/"), 5200);
      }
    };

    update();
    const timer = window.setInterval(update, 1000);
    return () => {
      window.clearInterval(timer);
      if (redirectTimer) window.clearTimeout(redirectTimer);
    };
  }, []);

  const parts = remaining === null ? null : getTimeParts(remaining);

  return (
    <main className={`launch-screen${isLaunching ? " launch-screen--revealing" : ""}`}>
      <div className="launch-screen__top">
        <a className="launch-screen__brand" href="/" aria-label="OnePlace">
          <span>ONE</span><b>PLACE</b>
          <small>EVERYTHING YOU NEED. IN ONE PLACE.</small>
        </a>
        <span className="launch-screen__top-note"><i /> TONIGHT · 11:00 PM</span>
      </div>

      <section className="launch-screen__content" aria-labelledby="launch-title">
        <p className="launch-screen__eyebrow"><span /> ONEPLACE OPENS TONIGHT</p>
        <h1 id="launch-title">A little more<br className="launch-screen__break" /> time.</h1>
        <div className="launch-screen__time" aria-label="Launch time, 11 PM Sri Lanka time">
          <span>11</span><i>:</i><span>00</span><small>PM</small>
        </div>

        <div className="launch-countdown" role="timer" aria-label="Countdown to launch">
          {([
            ["Days", parts?.days ?? null],
            ["Hours", parts?.hours ?? null],
            ["Minutes", parts?.minutes ?? null],
            ["Seconds", parts?.seconds ?? null],
          ] as const).map(([label, value]) => (
            <div className="launch-countdown__unit" key={label}>
              <span className="launch-countdown__number" key={`${label}-${timeLabel(value)}`}>{timeLabel(value)}</span>
              <span className="launch-countdown__label">{label}</span>
            </div>
          ))}
        </div>

        <p className="launch-screen__date">11 November 2026 <span>·</span> Sri Lanka</p>
      </section>

      {isLaunching && (
        <section className="launch-reveal" role="status" aria-live="assertive" aria-label="OnePlace has launched">
          <div className="launch-reveal__glow" />
          <div className="launch-reveal__burst launch-reveal__burst--one" />
          <div className="launch-reveal__burst launch-reveal__burst--two" />
          <div className="launch-reveal__burst launch-reveal__burst--three" />
          <div className="launch-reveal__confetti" aria-hidden="true">
            {Array.from({ length: 54 }, (_, index) => (
              <i key={index} style={{
                left: `${(index * 37) % 100}%`,
                animationDelay: `${(index % 12) * 0.055}s`,
                backgroundColor: ["#68122f", "#d0a86b", "#fff", "#c7758d", "#e6d5b1"][index % 5],
                transform: `rotate(${(index * 43) % 360}deg)`,
              }} />
            ))}
          </div>
          <div className="launch-reveal__content">
            <span className="launch-reveal__sparkle" aria-hidden="true">✦</span>
            <p>THE WAIT IS OVER</p>
            <h2>We’re open.</h2>
            <span>Welcome to OnePlace. Find something you’ll love.</span>
            <a href="/" className="launch-reveal__button">Explore OnePlace <ArrowRight size={16} /></a>
          </div>
        </section>
      )}
    </main>
  );
}

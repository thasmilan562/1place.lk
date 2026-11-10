"use client";

import { FormEvent, useEffect, useState } from "react";
import { ArrowRight, Heart, KeyRound, LoaderCircle } from "lucide-react";
import { getDoc, runTransaction } from "firebase/firestore";
import { SITE_LAUNCH_AT } from "@/lib/launch-config";
import { launchLikesDb, launchLikesRef } from "@/lib/launch-likes";

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
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [likes, setLikes] = useState(0);
  const [hasLiked, setHasLiked] = useState(false);
  const [likePending, setLikePending] = useState(false);
  const [likeError, setLikeError] = useState("");

  useEffect(() => {
    const update = () => {
      const next = SITE_LAUNCH_AT - Date.now();
      setRemaining(Math.max(0, next));
      if (next <= 0) window.location.replace("/");
    };
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    setHasLiked(window.localStorage.getItem("oneplace_launch_liked") === "yes");
    getDoc(launchLikesRef)
      .then((snapshot) => setLikes(Number(snapshot.data()?.count ?? 0)))
      .catch(() => setLikeError("Likes are taking a short pause. Please try again soon."));
  }, []);

  const parts = remaining === null ? null : getTimeParts(remaining);

  const handleLike = async () => {
    if (hasLiked || likePending) return;
    setLikePending(true);
    setLikeError("");
    try {
      const updatedCount = await runTransaction(launchLikesDb, async (transaction) => {
        const snapshot = await transaction.get(launchLikesRef);
        const count = Number(snapshot.data()?.count ?? 0);
        transaction.set(launchLikesRef, { count: count + 1 });
        return count + 1;
      });
      window.localStorage.setItem("oneplace_launch_liked", "yes");
      setHasLiked(true);
      setLikes(updatedCount);
    } catch {
      setLikeError("We couldn’t send your love just now. Please try again in a little while.");
    } finally {
      setLikePending(false);
    }
  };

  const handlePasswordSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const response = await fetch("/api/launch-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not open preview.");
      window.location.replace("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not open preview. Try again.");
      setSubmitting(false);
    }
  };

  return (
    <main className="launch-screen">
      <div className="launch-screen__top">
        <a className="launch-screen__brand" href="/" aria-label="OnePlace">
          <span>ONE</span><b>PLACE</b>
          <small>EVERYTHING YOU NEED. IN ONE PLACE.</small>
        </a>
      </div>

      <section className="launch-screen__content" aria-labelledby="launch-title">
        <p className="launch-screen__eyebrow">A LITTLE UPDATE FROM ONEPLACE</p>
        <h1 id="launch-title">We’re sorry to<br />keep you waiting.</h1>
        <p className="launch-screen__copy">An unavoidable delay means we can’t open our doors today. We’re truly sorry, and we’re using this little extra time to make your first visit even better. We’ll be ready to welcome you tomorrow at 11:00 PM Sri Lanka time.</p>

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

        <div className="launch-screen__date">12 November 2026 <span>·</span> 11:00 PM <span>·</span> Sri Lanka</div>

        <div className="launch-love">
          <button className="launch-love__button" type="button" onClick={handleLike} disabled={hasLiked || likePending} aria-label={hasLiked ? `You and ${likes} others like this launch` : `Like this launch; ${likes} likes`}>
            {likePending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Heart className="h-4 w-4" fill={hasLiked ? "currentColor" : "none"} />}
            <span>{hasLiked ? "Thank you for the love" : "Send us a little love"}</span>
            <span className="launch-love__count" aria-live="polite">{likes.toLocaleString()}</span>
          </button>
          {likeError && <p className="launch-love__error" role="status">{likeError}</p>}
        </div>
      </section>

      <footer className="launch-screen__footer">
        {showPassword ? (
          <form className="launch-preview" onSubmit={handlePasswordSubmit}>
            <label htmlFor="launch-preview-password">Team preview</label>
            <div className="launch-preview__row">
              <input
                autoFocus
                id="launch-preview-password"
                type="password"
                inputMode="numeric"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter password"
                required
              />
              <button type="submit" disabled={submitting} aria-label="Open preview">
                {submitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
              </button>
            </div>
            {error && <p className="launch-preview__error" role="alert">{error}</p>}
          </form>
        ) : (
          <button className="launch-screen__access" type="button" onClick={() => setShowPassword(true)}>
            <KeyRound className="h-3.5 w-3.5" /> Team access
          </button>
        )}
        <span className="launch-screen__footer-note">© 2026 OnePlace. Colombo, Sri Lanka.</span>
      </footer>
    </main>
  );
}

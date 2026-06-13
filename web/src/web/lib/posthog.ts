import posthog from "posthog-js";

const POSTHOG_KEY =
  import.meta.env.VITE_POSTHOG_KEY ??
  "phc_odG2ZZqzqqMp3oLTaPxwBFmhUADPuMuHtJuNsS5HHG8n";
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST ?? "https://eu.i.posthog.com";
const POSTHOG_UI_HOST = "https://eu.posthog.com";

const SCROLL_DEPTHS = [25, 50, 60, 75, 90, 100] as const;
const TIME_MARKS_SECONDS = [10, 30, 60, 180, 300] as const;
const INACTIVE_AFTER_MS = 2 * 60 * 1000;
const PROBABLY_ENDED_AFTER_MS = 5 * 60 * 1000;

let initialized = false;
let landingEventsInstalled = false;

export function initPostHog() {
  if (typeof window === "undefined" || initialized || !POSTHOG_KEY) return;

  initialized = true;

  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    ui_host: POSTHOG_UI_HOST,
    defaults: "2026-01-30",
    autocapture: true,
    capture_pageview: true,
    capture_pageleave: true,
  });

  installLandingEvents();
}

export function captureLandingEvent(
  eventName: string,
  properties?: Record<string, unknown>,
) {
  if (!initialized) return;
  posthog.capture(eventName, properties);
}

function installLandingEvents() {
  if (landingEventsInstalled) return;
  landingEventsInstalled = true;

  const sentScrollDepths = new Set<number>();
  let maxScrollDepth = 0;
  const startedAt = Date.now();
  let lastActivityAt = Date.now();
  let sentInactive = false;
  let sentProbablyEnded = false;

  const getScrollDepth = () => {
    const documentElement = document.documentElement;
    const maxScrollable =
      documentElement.scrollHeight - documentElement.clientHeight;

    if (maxScrollable <= 0) return 0;

    return Math.min(
      100,
      Math.max(0, Math.round((window.scrollY / maxScrollable) * 100)),
    );
  };

  const trackScrollDepth = () => {
    const scrollDepth = getScrollDepth();
    maxScrollDepth = Math.max(maxScrollDepth, scrollDepth);

    for (const threshold of SCROLL_DEPTHS) {
      if (scrollDepth >= threshold && !sentScrollDepths.has(threshold)) {
        sentScrollDepths.add(threshold);
        captureLandingEvent("landing_scroll_depth", {
          threshold,
          scroll_depth: scrollDepth,
          pathname: window.location.pathname,
        });
      }
    }
  };

  const recordActivity = () => {
    const idleSeconds = Math.round((Date.now() - lastActivityAt) / 1000);
    lastActivityAt = Date.now();

    if (sentInactive || sentProbablyEnded) {
      captureLandingEvent("landing_active", {
        idle_seconds: idleSeconds,
        max_scroll_depth: maxScrollDepth,
        pathname: window.location.pathname,
      });
    }

    sentInactive = false;
    sentProbablyEnded = false;
  };

  const checkInactivity = () => {
    if (document.visibilityState !== "visible") return;

    const idleMs = Date.now() - lastActivityAt;
    const idleSeconds = Math.round(idleMs / 1000);

    if (idleMs >= INACTIVE_AFTER_MS && !sentInactive) {
      sentInactive = true;
      captureLandingEvent("landing_inactive", {
        idle_seconds: idleSeconds,
        max_scroll_depth: maxScrollDepth,
        pathname: window.location.pathname,
      });
    }

    if (idleMs >= PROBABLY_ENDED_AFTER_MS && !sentProbablyEnded) {
      sentProbablyEnded = true;
      captureLandingEvent("landing_probably_ended", {
        idle_seconds: idleSeconds,
        max_scroll_depth: maxScrollDepth,
        pathname: window.location.pathname,
      });
    }
  };

  for (const seconds of TIME_MARKS_SECONDS) {
    window.setTimeout(() => {
      if (document.visibilityState !== "visible") return;

      captureLandingEvent("landing_time_on_page", {
        seconds,
        max_scroll_depth: maxScrollDepth,
        pathname: window.location.pathname,
      });
    }, seconds * 1000);
  }

  window.addEventListener("scroll", () => {
    recordActivity();
    trackScrollDepth();
  }, { passive: true });
  window.addEventListener("click", recordActivity);
  window.addEventListener("keydown", recordActivity);
  window.addEventListener("pointerdown", recordActivity);
  window.addEventListener("touchstart", recordActivity, { passive: true });
  window.addEventListener("resize", trackScrollDepth);
  window.setTimeout(trackScrollDepth, 1000);
  window.setInterval(checkInactivity, 10 * 1000);

  window.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "hidden") return;

    captureLandingEvent("landing_session_snapshot", {
      seconds: Math.round((Date.now() - startedAt) / 1000),
      max_scroll_depth: maxScrollDepth,
      pathname: window.location.pathname,
    });
  });
}

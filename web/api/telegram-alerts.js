const DEFAULT_POSTHOG_HOST = "https://eu.posthog.com";
const DEFAULT_POSTHOG_INGEST_HOST = "https://eu.i.posthog.com";
const DEFAULT_PROJECT_ID = "200919";
const EVENT_LIMIT = 1_000_000;
const REPLAY_LIMIT = 5_000;
const ALERT_EVENT = "guardian_telegram_alert_sent";
const CHECK_EVENT = "guardian_telegram_alert_checked";

function env(name, fallback = "") {
  return String(process.env[name] || fallback).trim();
}

function config() {
  return {
    posthogHost: env("POSTHOG_HOST", DEFAULT_POSTHOG_HOST).replace(/\/$/, ""),
    posthogIngestHost: env("POSTHOG_INGEST_HOST", DEFAULT_POSTHOG_INGEST_HOST).replace(/\/$/, ""),
    posthogProjectId: env("POSTHOG_PROJECT_ID", DEFAULT_PROJECT_ID),
    posthogPersonalApiKey: env("POSTHOG_PERSONAL_API_KEY"),
    posthogProjectApiKey: env("POSTHOG_PROJECT_API_KEY", env("VITE_POSTHOG_KEY")),
    telegramBotToken: env("TELEGRAM_BOT_TOKEN"),
    telegramChatId: env("TELEGRAM_CHAT_ID"),
    cronSecret: env("CRON_SECRET"),
    newPersonLookbackMinutes: Number(env("NEW_PERSON_ALERT_LOOKBACK_MINUTES", "30")),
  };
}

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}

function isAuthorized(req, cfg) {
  if (!cfg.cronSecret) return false;

  const url = new URL(req.url || "/", "https://interstellartrading.website");
  const querySecret = url.searchParams.get("secret");
  const headerSecret = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");

  return querySecret === cfg.cronSecret || headerSecret === cfg.cronSecret;
}

async function posthogQuery(cfg, query) {
  if (!cfg.posthogPersonalApiKey) {
    throw new Error("POSTHOG_PERSONAL_API_KEY mancante.");
  }

  const response = await fetch(`${cfg.posthogHost}/api/projects/${cfg.posthogProjectId}/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cfg.posthogPersonalApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: {
        kind: "HogQLQuery",
        query,
      },
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`PostHog query ${response.status}: ${body.slice(0, 500)}`);
  }

  return response.json();
}

function rowsFromResult(result) {
  const columns = result.columns || [];
  return (result.results || []).map((row) =>
    Object.fromEntries(columns.map((column, index) => [column, row[index]])),
  );
}

async function captureAlertSent(cfg, alertKey, properties = {}) {
  if (!cfg.posthogProjectApiKey) {
    throw new Error("POSTHOG_PROJECT_API_KEY mancante.");
  }

  const response = await fetch(`${cfg.posthogIngestHost}/capture/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: cfg.posthogProjectApiKey,
      event: ALERT_EVENT,
      distinct_id: "guardiano-interstellar-cloud",
      properties: {
        alert_key: alertKey,
        source: "vercel-cronjob-org",
        ...properties,
      },
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`PostHog capture ${response.status}: ${body.slice(0, 500)}`);
  }
}

async function captureCheck(cfg) {
  if (!cfg.posthogProjectApiKey) {
    throw new Error("POSTHOG_PROJECT_API_KEY mancante.");
  }

  const response = await fetch(`${cfg.posthogIngestHost}/capture/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: cfg.posthogProjectApiKey,
      event: CHECK_EVENT,
      distinct_id: "guardiano-interstellar-cloud",
      properties: {
        source: "vercel-cronjob-org",
      },
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`PostHog check capture ${response.status}: ${body.slice(0, 500)}`);
  }
}

async function sendTelegram(cfg, text) {
  if (!cfg.telegramBotToken || !cfg.telegramChatId) {
    throw new Error("TELEGRAM_BOT_TOKEN o TELEGRAM_CHAT_ID mancante.");
  }

  const response = await fetch(`https://api.telegram.org/bot${cfg.telegramBotToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: cfg.telegramChatId,
      text,
      disable_web_page_preview: true,
    }),
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok || body.ok === false) {
    throw new Error(body.description || `Telegram ${response.status}`);
  }
}

function italyDateParts(date = new Date()) {
  return Object.fromEntries(
    new Intl.DateTimeFormat("en", {
      timeZone: "Europe/Rome",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .formatToParts(date)
      .map((part) => [part.type, part.value]),
  );
}

function todayKey() {
  const parts = italyDateParts();
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function monthKey() {
  const parts = italyDateParts();
  return `${parts.year}-${parts.month}`;
}

function number(value) {
  return Number(value || 0).toLocaleString("it-IT");
}

function alertMessageForUsage(metric, percent, used, limit) {
  const label = metric === "events" ? "eventi analytics" : "session replay";
  return `Uso mensile PostHog: ${label} al ${percent}% (${number(used)} / ${number(limit)}).`;
}

function numericMax(...values) {
  return Math.max(
    0,
    ...values
      .map((value) => Number(value || 0))
      .filter((value) => Number.isFinite(value)),
  );
}

function isItaly(value) {
  const country = String(value || "").trim().toLowerCase();
  return country === "italy" || country === "italia" || country === "it";
}

function groupSessions(events) {
  const groups = new Map();
  const chronological = [...events].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );

  for (const row of chronological) {
    const key = row.window_id || row.session_id || row.distinct_id || "sessione-sconosciuta";
    const timestamp = new Date(row.timestamp).getTime();

    if (!groups.has(key)) {
      groups.set(key, {
        key,
        start: row.timestamp,
        end: row.timestamp,
        startMs: timestamp,
        endMs: timestamp,
        pageviews: 0,
        maxScroll: 0,
        country: "",
      });
    }

    const session = groups.get(key);

    if (timestamp < session.startMs) {
      session.startMs = timestamp;
      session.start = row.timestamp;
    }

    if (timestamp > session.endMs) {
      session.endMs = timestamp;
      session.end = row.timestamp;
    }

    if (row.event === "$pageview") session.pageviews += 1;
    session.country = session.country || row.paese || "";
    session.maxScroll = numericMax(
      session.maxScroll,
      row.soglia_scroll,
      row.scroll,
      row.scroll_massimo,
    );
  }

  return [...groups.values()]
    .filter((session) => session.pageviews > 0 && isItaly(session.country))
    .sort((a, b) => a.startMs - b.startMs)
    .map((session, index) => ({
      ...session,
      personNumber: index + 1,
    }));
}

async function loadData(cfg) {
  const todayEventsQuery = `
    SELECT
      timestamp,
      event,
      distinct_id,
      properties['$session_id'] AS session_id,
      properties['$window_id'] AS window_id,
      properties['$geoip_country_name'] AS paese,
      properties['threshold'] AS soglia_scroll,
      properties['scroll_depth'] AS scroll,
      properties['max_scroll_depth'] AS scroll_massimo
    FROM events
    WHERE timestamp >= today()
      AND event != '${ALERT_EVENT}'
      AND event != '${CHECK_EVENT}'
    ORDER BY timestamp ASC
    LIMIT 5000
  `;

  const usageQuery = `
    SELECT
      count() AS eventi_mese,
      count(DISTINCT if(properties['$has_recording'] = true OR properties['$recording_status'] IN ('active', 'sampled', 'recording'), properties['$session_id'], null)) AS replay_mese
    FROM events
    WHERE timestamp >= toStartOfMonth(now())
  `;

  const sentAlertsQuery = `
    SELECT
      event,
      timestamp,
      properties['alert_key'] AS alert_key
    FROM events
    WHERE event IN ('${ALERT_EVENT}', '${CHECK_EVENT}')
      AND timestamp >= toStartOfMonth(now())
    LIMIT 10000
  `;

  const [todayEventsResult, usageResult, sentAlertsResult] = await Promise.all([
    posthogQuery(cfg, todayEventsQuery),
    posthogQuery(cfg, usageQuery),
    posthogQuery(cfg, sentAlertsQuery),
  ]);

  return {
    sessions: groupSessions(rowsFromResult(todayEventsResult)),
    usage: rowsFromResult(usageResult)[0] || {},
    technicalEvents: rowsFromResult(sentAlertsResult),
  };
}

function usageAlertsToSend(usage, sentAlertKeys) {
  const month = monthKey();
  const checks = [
    {
      metric: "events",
      used: Number(usage.eventi_mese || 0),
      limit: EVENT_LIMIT,
    },
    {
      metric: "replays",
      used: Number(usage.replay_mese || 0),
      limit: REPLAY_LIMIT,
    },
  ];

  return checks
    .map((check) => {
      const percent = Math.min(100, Math.round((check.used / check.limit) * 100));
      const threshold = percent >= 100 ? 100 : percent >= 80 ? 80 : 0;
      if (!threshold) return null;

      const alertKey = `usage:${month}:${check.metric}:${threshold}`;
      if (sentAlertKeys.has(alertKey)) return null;

      return {
        alertKey,
        message: alertMessageForUsage(check.metric, threshold, check.used, check.limit),
        properties: {
          alert_type: "usage",
          metric: check.metric,
          threshold,
          used: check.used,
          limit: check.limit,
          month,
        },
      };
    })
    .filter(Boolean);
}

function newPersonAlertsToSend(sessions, sentAlertKeys, lastCheckAt, lookbackMinutes) {
  const day = todayKey();
  const lookbackStartMs = Date.now() - Math.max(5, lookbackMinutes || 30) * 60 * 1000;
  const lastCheckMs = lastCheckAt ? new Date(lastCheckAt).getTime() : 0;
  const minStartMs = lastCheckMs ? Math.max(lookbackStartMs, lastCheckMs) : Infinity;

  return sessions
    .filter((session) => session.startMs >= minStartMs)
    .map((session) => {
      const alertKey = `person:${day}:${session.key}`;
      if (sentAlertKeys.has(alertKey)) return null;

      return {
        alertKey,
        message: `Nuova persona registrata: Persona ${session.personNumber}`,
        properties: {
          alert_type: "new_person",
          day,
          session_key: session.key,
          person_number: session.personNumber,
          max_scroll: session.maxScroll,
        },
      };
    })
    .filter(Boolean);
}

async function sendAlerts(cfg, alerts) {
  const sent = [];
  const failed = [];

  for (const alert of alerts) {
    try {
      await sendTelegram(cfg, alert.message);
      await captureAlertSent(cfg, alert.alertKey, alert.properties);
      sent.push(alert.alertKey);
    } catch (error) {
      failed.push({
        alertKey: alert.alertKey,
        error: error.message,
      });
    }
  }

  return { sent, failed };
}

export default async function handler(req, res) {
  const cfg = config();

  if (!isAuthorized(req, cfg)) {
    return json(res, 401, { ok: false, error: "Non autorizzato." });
  }

  if (req.method !== "GET" && req.method !== "POST") {
    return json(res, 405, { ok: false, error: "Metodo non supportato." });
  }

  try {
    const data = await loadData(cfg);
    const sentAlertKeys = new Set(
      data.technicalEvents.map((row) => row.alert_key).filter(Boolean),
    );
    const lastCheckAt = data.technicalEvents
      .filter((row) => row.event === CHECK_EVENT)
      .map((row) => row.timestamp)
      .sort()
      .at(-1);
    const alerts = [
      ...usageAlertsToSend(data.usage, sentAlertKeys),
      ...newPersonAlertsToSend(
        data.sessions,
        sentAlertKeys,
        lastCheckAt,
        cfg.newPersonLookbackMinutes,
      ),
    ];
    const result = await sendAlerts(cfg, alerts);
    if (!result.failed.length) {
      await captureCheck(cfg);
    }

    return json(res, result.failed.length ? 500 : 200, {
      ok: result.failed.length === 0,
      checked_at: new Date().toISOString(),
      last_check_at: lastCheckAt || null,
      alerts_found: alerts.length,
      alerts_sent: result.sent.length,
      sent: result.sent,
      failed: result.failed,
    });
  } catch (error) {
    return json(res, 500, {
      ok: false,
      error: error.message,
    });
  }
}

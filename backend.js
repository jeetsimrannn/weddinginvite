(function () {
  const cfg = window.SUPABASE_CONFIG || {};
  const hasRemoteConfig =
    typeof cfg.url === "string" &&
    typeof cfg.anonKey === "string" &&
    cfg.url.length > 0 &&
    cfg.anonKey.length > 0 &&
    !cfg.url.includes("YOUR_SUPABASE_URL") &&
    !cfg.anonKey.includes("YOUR_SUPABASE_ANON_KEY");

  const mode = hasRemoteConfig ? "cloud" : "local";

  const KEYS = {
    rsvps: "engagement_rsvps",
    updates: "engagement_updates",
  };

  function readLocal(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function writeLocal(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function normalizeName(name) {
    return String(name || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ");
  }

  function createId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID();
    }
    return `id-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  }

  function toQuery(params) {
    const qs = new URLSearchParams(params);
    return qs.toString();
  }

  async function remoteRequest(path, { method = "GET", params, body, prefer } = {}) {
    const url = `${cfg.url.replace(/\/$/, "")}${path}${params ? `?${toQuery(params)}` : ""}`;
    const headers = {
      apikey: cfg.anonKey,
      Authorization: `Bearer ${cfg.anonKey}`,
    };

    if (body !== undefined) {
      headers["Content-Type"] = "application/json";
    }
    if (prefer) {
      headers.Prefer = prefer;
    }

    const res = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Backend request failed (${res.status}): ${text}`);
    }

    if (res.status === 204) {
      return null;
    }

    const text = await res.text();
    return text ? JSON.parse(text) : null;
  }

  async function getRsvps() {
    if (!hasRemoteConfig) {
      const list = readLocal(KEYS.rsvps, []);
      return list.map((entry, idx) => ({
        ...entry,
        id: entry.id || `legacy-${idx}-${entry.createdAt || "unknown"}`,
      }));
    }

    const rows = await remoteRequest("/rest/v1/rsvps", {
      params: {
        select: "id,name,normalized_name,guest_count,attendance,created_at,updated_at",
        order: "updated_at.desc",
      },
    });

    return (rows || []).map((r) => ({
      id: r.id,
      name: r.name,
      normalizedName: r.normalized_name,
      guestCount: r.guest_count,
      attendance: r.attendance,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  }

  async function upsertRsvp(payload) {
    const entry = {
      id: payload.id || createId(),
      name: String(payload.name || "").trim(),
      normalizedName: normalizeName(payload.name),
      guestCount: Number(payload.guestCount) || 1,
      attendance: payload.attendance || "yes",
      createdAt: payload.createdAt || new Date().toISOString(),
    };

    if (!hasRemoteConfig) {
      const list = readLocal(KEYS.rsvps, []);
      const idx = list.findIndex((x) => normalizeName(x.name) === entry.normalizedName);
      if (idx >= 0) {
        list[idx] = {
          ...list[idx],
          id: list[idx].id || entry.id,
          name: entry.name,
          guestCount: entry.guestCount,
          attendance: entry.attendance,
          createdAt: entry.createdAt,
        };
      } else {
        list.push({
          id: entry.id,
          name: entry.name,
          guestCount: entry.guestCount,
          attendance: entry.attendance,
          createdAt: entry.createdAt,
        });
      }
      writeLocal(KEYS.rsvps, list);
      return;
    }

    await remoteRequest("/rest/v1/rsvps", {
      method: "POST",
      params: {
        on_conflict: "normalized_name",
      },
      prefer: "resolution=merge-duplicates,return=minimal",
      body: [
        {
          name: entry.name,
          normalized_name: entry.normalizedName,
          guest_count: entry.guestCount,
          attendance: entry.attendance,
          created_at: entry.createdAt,
        },
      ],
    });
  }

  async function deleteRsvp(id) {
    if (!hasRemoteConfig) {
      const next = readLocal(KEYS.rsvps, []).filter((x) => x.id !== id);
      writeLocal(KEYS.rsvps, next);
      return;
    }

    await remoteRequest("/rest/v1/rsvps", {
      method: "DELETE",
      params: {
        id: `eq.${id}`,
      },
    });
  }

  async function clearRsvps() {
    if (!hasRemoteConfig) {
      writeLocal(KEYS.rsvps, []);
      return;
    }

    await remoteRequest("/rest/v1/rsvps", {
      method: "DELETE",
      params: {
        id: "not.is.null",
      },
    });
  }

  async function getUpdates() {
    if (!hasRemoteConfig) {
      return readLocal(KEYS.updates, []);
    }

    const rows = await remoteRequest("/rest/v1/updates", {
      params: {
        select: "id,message,created_at",
        order: "created_at.desc",
      },
    });

    return (rows || []).map((r) => ({
      id: r.id,
      message: r.message,
      createdAt: r.created_at,
    }));
  }

  async function addUpdate(message) {
    const clean = String(message || "").trim();
    if (!clean) return;

    if (!hasRemoteConfig) {
      const list = readLocal(KEYS.updates, []);
      list.push({ id: createId(), message: clean, createdAt: new Date().toISOString() });
      writeLocal(KEYS.updates, list);
      return;
    }

    await remoteRequest("/rest/v1/updates", {
      method: "POST",
      prefer: "return=minimal",
      body: [
        {
          message: clean,
        },
      ],
    });
  }

  window.InviteStore = {
    mode,
    normalizeName,
    getRsvps,
    upsertRsvp,
    deleteRsvp,
    clearRsvps,
    getUpdates,
    addUpdate,
  };
})();

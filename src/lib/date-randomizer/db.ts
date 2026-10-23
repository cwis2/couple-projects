import type { DateIdea } from "./types";

const STORAGE_KEY = "couple_projects_date_ideas_v1";

/**
 * Checks if Supabase credentials are configured in environment
 */
function getSupabaseConfig(): { url: string; key: string } | null {
  const url =
    (typeof import.meta !== "undefined" && import.meta.env?.VITE_SUPABASE_URL) ||
    (typeof window !== "undefined" && (window as unknown as { __SUPABASE_URL__?: string }).__SUPABASE_URL__);
  const key =
    (typeof import.meta !== "undefined" && import.meta.env?.VITE_SUPABASE_ANON_KEY) ||
    (typeof window !== "undefined" && (window as unknown as { __SUPABASE_ANON_KEY__?: string }).__SUPABASE_ANON_KEY__);

  if (url && key) {
    return { url, key };
  }
  return null;
}

// ─── Local Storage helpers ───────────────────────────────────────────────────

function readLocal(): DateIdea[] {
  if (typeof window === "undefined" || !window.localStorage) return [];
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocal(items: DateIdea[]): void {
  if (typeof window !== "undefined" && window.localStorage) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }
}

// ─── Public CRUD ─────────────────────────────────────────────────────────────

export async function getAllDates(): Promise<DateIdea[]> {
  const sb = getSupabaseConfig();

  if (sb) {
    try {
      const res = await fetch(`${sb.url}/rest/v1/date_ideas?select=*&order=created_at.desc`, {
        headers: {
          apikey: sb.key,
          Authorization: `Bearer ${sb.key}`,
          "Content-Type": "application/json",
        },
      });
      if (res.ok) {
        const data: DateIdea[] = await res.json();
        writeLocal(data);
        return data;
      }
    } catch (err) {
      console.warn("Supabase fetch failed, falling back to local storage:", err);
    }
  }

  return readLocal();
}

export async function saveDate(
  data: Omit<DateIdea, "id" | "created_at"> & { id?: string },
): Promise<DateIdea> {
  const now = new Date().toISOString();
  const isExistingUuid = Boolean(
    data.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(data.id),
  );
  const id = isExistingUuid ? data.id! : globalThis.crypto.randomUUID();

  const full: DateIdea = {
    ...data,
    id,
    created_at: now,
  };

  const sb = getSupabaseConfig();
  if (sb) {
    try {
      const res = await fetch(`${sb.url}/rest/v1/date_ideas`, {
        method: "POST",
        headers: {
          apikey: sb.key,
          Authorization: `Bearer ${sb.key}`,
          "Content-Type": "application/json",
          Prefer: "resolution=merge-duplicates,return=representation",
        },
        body: JSON.stringify(full),
      });
      if (res.ok) {
        const saved = await res.json();
        if (saved?.[0]) {
          const item: DateIdea = saved[0];
          const local = readLocal().filter((d) => d.id !== item.id);
          writeLocal([item, ...local]);
          return item;
        }
      }
      const detail = await res.text().catch(() => "");
      throw new Error(`Supabase save failed (${res.status})${detail ? `: ${detail}` : ""}`);
    } catch (err) {
      console.warn("Supabase save failed, saving locally:", err);
    }
  }

  // Local fallback
  const existing = readLocal();
  const idx = existing.findIndex((d) => d.id === id);
  if (idx >= 0) {
    existing[idx] = full;
    writeLocal(existing);
  } else {
    writeLocal([full, ...existing]);
  }
  return full;
}

export async function updateDate(
  id: string,
  data: Partial<Omit<DateIdea, "id" | "created_at">>,
): Promise<DateIdea | null> {
  const sb = getSupabaseConfig();
  if (sb) {
    try {
      const res = await fetch(`${sb.url}/rest/v1/date_ideas?id=eq.${id}`, {
        method: "PATCH",
        headers: {
          apikey: sb.key,
          Authorization: `Bearer ${sb.key}`,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const saved = await res.json();
        if (saved?.[0]) {
          const item: DateIdea = saved[0];
          const local = readLocal().map((d) => (d.id === id ? item : d));
          writeLocal(local);
          return item;
        }
      }
    } catch (err) {
      console.warn("Supabase update failed, updating locally:", err);
    }
  }

  // Local fallback
  const existing = readLocal();
  const idx = existing.findIndex((d) => d.id === id);
  if (idx < 0) return null;
  const updated: DateIdea = { ...existing[idx], ...data };
  existing[idx] = updated;
  writeLocal(existing);
  return updated;
}

export async function deleteDate(id: string): Promise<boolean> {
  const sb = getSupabaseConfig();
  if (sb) {
    try {
      await fetch(`${sb.url}/rest/v1/date_ideas?id=eq.${id}`, {
        method: "DELETE",
        headers: {
          apikey: sb.key,
          Authorization: `Bearer ${sb.key}`,
        },
      });
    } catch (err) {
      console.warn("Supabase delete failed, removing locally:", err);
    }
  }

  const existing = readLocal();
  writeLocal(existing.filter((d) => d.id !== id));
  return true;
}

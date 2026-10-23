import type { Plan } from "./types";

const STORAGE_KEY = "couple_projects_plans_v1";

type PlanRow = {
  id: string;
  title: string;
  description: string | null;
  plan_date: string | null;
  categories: string[] | null;
  scale: string | null;
  duration: string | null;
  energy: string | null;
  planning_required: string | null;
  location: string | null;
  social_size: string | null;
  weather: string | null;
  importance: string[] | null;
  added_by: string | null;
  priority: string | null;
  status: string | null;
  best_for: string[] | null;
};

function getSupabaseConfig(): { url: string; key: string } | null {
  const url =
    (typeof import.meta !== "undefined" && import.meta.env?.["VITE_SUPABASE_URL"]) ||
    (typeof window !== "undefined" && (window as unknown as { __SUPABASE_URL__?: string }).__SUPABASE_URL__);
  const key =
    (typeof import.meta !== "undefined" && import.meta.env?.["VITE_SUPABASE_ANON_KEY"]) ||
    (typeof window !== "undefined" && (window as unknown as { __SUPABASE_ANON_KEY__?: string }).__SUPABASE_ANON_KEY__);
  return url && key ? { url, key } : null;
}

function readLocal(): Plan[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed as Plan[] : [];
  } catch {
    return [];
  }
}

function writeLocal(plans: Plan[]): void {
  if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, JSON.stringify(plans));
}

function fromRow(row: PlanRow): Plan {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? "",
    date: row.plan_date ?? "",
    categories: row.categories ?? [],
    scale: row.scale ?? "",
    duration: row.duration ?? "",
    energy: row.energy ?? "",
    planning: row.planning_required ?? "",
    location: row.location ?? "",
    socialSize: row.social_size ?? "",
    weather: row.weather ?? "",
    importance: row.importance ?? [],
    addedBy: row.added_by ?? "",
    priority: row.priority ?? "Normal",
    status: row.status ?? "Idea",
    bestFor: row.best_for ?? [],
  };
}

function toRow(plan: Plan): PlanRow {
  return {
    id: plan.id,
    title: plan.title,
    description: plan.description,
    plan_date: plan.date || null,
    categories: plan.categories,
    scale: plan.scale || null,
    duration: plan.duration || null,
    energy: plan.energy || null,
    planning_required: plan.planning || null,
    location: plan.location || null,
    social_size: plan.socialSize || null,
    weather: plan.weather || null,
    importance: plan.importance,
    added_by: plan.addedBy,
    priority: plan.priority || null,
    status: plan.status || null,
    best_for: plan.bestFor,
  };
}

function headers(key: string): Record<string, string> {
  return { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
}

export async function getAllPlans(): Promise<Plan[]> {
  const config = getSupabaseConfig();
  if (config) {
    try {
      const response = await fetch(`${config.url}/rest/v1/plans?select=*&order=created_at.desc`, { headers: headers(config.key) });
      if (!response.ok) throw new Error(`Supabase plans fetch failed (${response.status})`);
      const rows = await response.json() as PlanRow[];
      let plans = rows.map(fromRow);
      const remoteIds = new Set(plans.map((plan) => plan.id));
      const localOnly = readLocal().filter((plan) => !remoteIds.has(plan.id));
      if (localOnly.length) {
        try {
          const syncResponse = await fetch(`${config.url}/rest/v1/plans`, {
            method: "POST",
            headers: { ...headers(config.key), Prefer: "resolution=merge-duplicates,return=representation" },
            body: JSON.stringify(localOnly.map(toRow)),
          });
          if (!syncResponse.ok) throw new Error(`Supabase local plan sync failed (${syncResponse.status})`);
          const syncedRows = await syncResponse.json() as PlanRow[];
          plans = [...syncedRows.map(fromRow), ...plans];
        } catch (error) {
          console.warn("Could not sync locally saved plans to Supabase:", error);
          plans = [...localOnly, ...plans];
        }
      }
      writeLocal(plans);
      return plans;
    } catch (error) {
      console.warn("Supabase plans fetch failed, using local storage:", error);
    }
  }
  return readLocal();
}

export async function savePlan(plan: Plan): Promise<Plan> {
  const config = getSupabaseConfig();
  if (config) {
    try {
      const response = await fetch(`${config.url}/rest/v1/plans`, {
        method: "POST",
        headers: { ...headers(config.key), Prefer: "resolution=merge-duplicates,return=representation" },
        body: JSON.stringify(toRow(plan)),
      });
      if (!response.ok) throw new Error(`Supabase plan save failed (${response.status})`);
      const rows = await response.json() as PlanRow[];
      if (rows[0]) {
        const saved = fromRow(rows[0]);
        writeLocal([saved, ...readLocal().filter((item) => item.id !== saved.id)]);
        return saved;
      }
    } catch (error) {
      console.warn("Supabase plan save failed, using local storage:", error);
    }
  }
  const local = readLocal();
  const index = local.findIndex((item) => item.id === plan.id);
  if (index >= 0) local[index] = plan;
  else local.unshift(plan);
  writeLocal(local);
  return plan;
}

export async function deletePlan(id: string): Promise<void> {
  const config = getSupabaseConfig();
  if (config) {
    try {
      const response = await fetch(`${config.url}/rest/v1/plans?id=eq.${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: headers(config.key),
      });
      if (!response.ok) throw new Error(`Supabase plan delete failed (${response.status})`);
    } catch (error) {
      console.warn("Supabase plan delete failed, removing from local storage:", error);
    }
  }
  writeLocal(readLocal().filter((item) => item.id !== id));
}

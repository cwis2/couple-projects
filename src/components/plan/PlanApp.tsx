import { useEffect, useState } from "react";
import { ArrowLeft, CalendarDays, Check, ChevronRight, ClipboardList, Clock3, MapPin, Pencil, Plus, Trash2, Wrench, X } from "lucide-react";
import type { AppProps } from "../../apps";
import { deletePlan, getAllPlans, savePlan } from "../../lib/plans/db";
import type { Plan } from "../../lib/plans/types";
import "./plan.css";

type Key = Exclude<keyof Plan, "id" | "title" | "description" | "date">;
type MenuId = "add" | "manage";
type PlanFilters = { category: string[]; status: string; priority: string; duration: string; location: string; energy: string; addedBy: string };
const planFilterGroups: { key: keyof PlanFilters; label: string; options: string[]; multi?: boolean }[] = [
  { key: "category", label: "Type / category", multi: true, options: ["Date", "Trip", "Social", "At home", "Event", "Food", "Entertainment", "Outdoors", "Exploration", "Other"] },
  { key: "status", label: "Status", options: ["Idea", "Planned", "Scheduled", "Completed"] },
  { key: "priority", label: "Priority", options: ["Low", "Normal", "High", "Must-do"] },
  { key: "duration", label: "Duration", options: ["<1 hour", "1–2 hours", "2–4 hours", "4–8 hours", "12–16 hours", "Day", "2–3 days", "4–7 days", "1+ week"] },
  { key: "location", label: "Location", options: ["Cwis's location", "Monokork's location", "Somewhere in the US", "Somewhere in Europe", "Either location", "International"] },
  { key: "energy", label: "Energy", options: ["Very low", "Low", "Moderate", "High", "Exhausting"] },
  { key: "addedBy", label: "Who added it", options: ["cwis", "monokork"] },
];
const menuItems: { id: MenuId; label: string; Icon: typeof Plus }[] = [
  { id: "add", label: "Add plan", Icon: Plus },
  { id: "manage", label: "View / Edit Plans", Icon: Wrench },
];
const groups: { key: Key; label: string; options: string[]; multi?: boolean }[] = [
  { key: "categories", label: "Type / category", multi: true, options: ["Date", "Trip", "Social", "At home", "Event", "Food", "Entertainment", "Outdoors", "Exploration", "Other"] },
  { key: "scale", label: "Scale", options: ["Small · 1–3 hours", "Medium · 6–12 hours", "Large · 14–20 hours", "Trip · 1+ days"] },
  { key: "duration", label: "Duration", options: ["<1 hour", "1–2 hours", "2–4 hours", "4–8 hours", "12–16 hours", "Day", "2–3 days", "4–7 days", "1+ week"] },
  { key: "energy", label: "Energy", options: ["Very low", "Low", "Moderate", "High", "Exhausting"] },
  { key: "planning", label: "Planning required", options: ["Spontaneous", "Little planning", "Major planning"] },
  { key: "location", label: "Location", options: ["Cwis's location", "Monokork's location", "Somewhere in the US", "Somewhere in Europe", "Either location", "International"] },
  { key: "socialSize", label: "Social size", options: ["Just us", "Friends", "Family", "Group", "Large event", "Doesn't matter"] },
  { key: "weather", label: "Weather", options: ["Indoor", "Outdoor", "Either", "Weather dependent"] },
  { key: "importance", label: "Relationship / personal importance", multi: true, options: ["Romantic", "Just for fun", "Social", "Bucket list", "Important to one of us", "Memory-worthy"] },
  { key: "priority", label: "Priority", options: ["Low", "Normal", "High", "Must-do"] },
  { key: "status", label: "Status", options: ["Idea", "Planned", "Scheduled", "Completed"] },
  { key: "bestFor", label: "Best for", multi: true, options: ["Anniversary", "Birthday", "Rainy day", "Date night", "Weekend", "Vacation", "Other special occasion"] },
];
const blank = (addedBy: string): Omit<Plan, "id"> => ({ title: "", description: "", date: "", categories: [], scale: "", duration: "", energy: "", planning: "", location: "", socialSize: "", weather: "", importance: [], addedBy, priority: "Normal", status: "Idea", bestFor: [] });
export function PlanApp({ user, onExit }: AppProps) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [screen, setScreen] = useState<"home" | "list" | "form">("home");
  const [draft, setDraft] = useState<Omit<Plan, "id">>(blank(user?.id || "cwis"));
  const [editing, setEditing] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<PlanFilters>({ category: [], status: "", priority: "", duration: "", location: "", energy: "", addedBy: "" });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [highlighted, setHighlighted] = useState<MenuId | null>(null);
  useEffect(() => { void getAllPlans().then(setPlans); }, []);
  const persist = (next: Plan[]) => setPlans(next);
  const openNew = () => { setEditing(null); setDraft(blank(user?.id || "cwis")); setScreen("form"); };
  const openEdit = (plan: Plan) => { const { id, ...rest } = plan; setEditing(id); setDraft(rest); setScreen("form"); };
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.title.trim()) return;
    const plan: Plan = { ...draft, id: editing || crypto.randomUUID(), title: draft.title.trim() };
    const saved = await savePlan(plan);
    const next = editing ? plans.map((p) => p.id === editing ? saved : p) : [saved, ...plans];
    persist(next); setNotice(editing ? "Plan updated" : "Plan added"); setScreen("list");
  };
  const toggle = (key: Key, value: string, multi?: boolean) => setDraft((d) => {
    const current = d[key];
    if (multi && Array.isArray(current)) return { ...d, [key]: current.includes(value) ? current.filter((x) => x !== value) : [...current, value] };
    return { ...d, [key]: current === value ? "" : value };
  });
  const visible = plans.filter((p) => `${p.title} ${p.description} ${p.categories.join(" ")}`.toLowerCase().includes(query.toLowerCase())
    && (!filters.category.length || filters.category.some((category) => p.categories.includes(category))) && (!filters.status || p.status === filters.status)
    && (!filters.priority || p.priority === filters.priority) && (!filters.duration || p.duration === filters.duration)
    && (!filters.location || p.location === filters.location) && (!filters.energy || p.energy === filters.energy)
    && (!filters.addedBy || p.addedBy?.toLowerCase() === filters.addedBy));
  const remove = async (id: string) => { await deletePlan(id); persist(plans.filter((p) => p.id !== id)); setSelected(null); };
  const togglePlanFilter = (key: keyof PlanFilters, option: string, multi?: boolean) => setFilters((current) => {
    const value = current[key];
    if (multi && Array.isArray(value)) return { ...current, [key]: value.includes(option) ? value.filter((item) => item !== option) : [...value, option] };
    return { ...current, [key]: value === option ? "" : option };
  });
  const clearPlanFilter = (key: keyof PlanFilters) => setFilters((current) => ({ ...current, [key]: key === "category" ? [] : "" }));
  const clearAllPlanFilters = () => setFilters({ category: [], status: "", priority: "", duration: "", location: "", energy: "", addedBy: "" });
  const activeFilterCount = Object.values(filters).reduce((count, value) => count + (Array.isArray(value) ? value.length : value ? 1 : 0), 0);
  const back = () => {
    if (screen === "home") onExit?.();
    else if (screen === "form") setScreen(editing ? "list" : "home");
    else setScreen("home");
  };
  const actions: Record<MenuId, () => void> = { add: openNew, manage: () => setScreen("list") };
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (screen === "home" && (event.key === "ArrowLeft" || event.key === "ArrowRight")) {
        event.preventDefault();
        setHighlighted((item) => item === null ? (event.key === "ArrowLeft" ? "add" : "manage") : item === "add" ? "manage" : "add");
        return;
      }
      if (screen === "home" && event.key === "Enter") {
        event.preventDefault();
        if (highlighted) actions[highlighted]();
        return;
      }
      const target = event.target as HTMLElement | null;
      const typing = target?.matches("input, textarea, select, [contenteditable='true']");
      if (!typing && (event.key === "Escape" || event.key === "Backspace")) {
        event.preventDefault(); back();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [screen, editing, highlighted, onExit]);
  return <main className="wii-planner">
    <header className={`wp-top ${screen === "home" ? "wp-top-home" : ""}`} aria-hidden="true" />
    {screen !== "home" && <div className="wp-title"><span>{screen === "form" ? (editing ? "Edit plan" : "Add a plan") : "Your plans"}</span><span className="wp-count">{plans.length} {plans.length === 1 ? "plan" : "plans"}</span></div>}
    <section className={`wp-content ${screen === "home" ? "is-home" : ""}`}>
      {screen === "home" && <div className="wp-menu" role="group" aria-label="Planner menu">
        {menuItems.map(({ id, label, Icon }) => <div className="wp-tile-wrap" key={id} onMouseEnter={() => setHighlighted(id)} onMouseLeave={() => setHighlighted((current) => current === id ? null : current)}>
          <button className={`wp-menu-tile ${highlighted === id ? "highlighted" : ""}`} onFocus={() => setHighlighted(id)} onClick={actions[id]} aria-label={label}>
            <span className="wp-corner-brackets" aria-hidden="true"><i/><i/><i/><i/></span>
            <Icon className="wp-menu-icon" size={43} strokeWidth={1.5}/><span className="wp-tile-label">{label}</span>
          </button>
        </div>)}
      </div>}
      {screen === "form" && <form className="wp-form" onSubmit={save}>
        <button type="button" className="wp-form-back" onClick={back}><ArrowLeft size={17}/>{editing ? "Back to plans" : "Back to planner"}</button>
        <label className="wp-field"><span>Plan name <i>Required</i></span><input autoFocus maxLength={100} placeholder="A name you'll both remember" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} required /></label>
        <label className="wp-field"><span>A few details <i>Optional</i></span><textarea rows={3} placeholder="What sounds fun about it?" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })}/></label>
        <label className="wp-field"><span>Plan date <i>Optional</i></span><input type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })}/></label>
        {groups.map((g) => <fieldset className="wp-field wp-options" key={g.key}><legend>{g.label}{g.multi && <i>Choose any</i>}</legend><div className="wp-chips">{g.options.map((o) => { const active = Array.isArray(draft[g.key]) ? (draft[g.key] as string[]).includes(o) : draft[g.key] === o; return <button type="button" key={o} className={`wp-chip ${active ? "active" : ""}`} aria-pressed={active} onClick={() => toggle(g.key, o, g.multi)}>{active && <Check size={13}/>} {o}</button>; })}</div></fieldset>)}
        <div className="wp-form-actions"><button type="button" className="wp-secondary" onClick={() => setScreen(editing ? "list" : "home")}>Cancel</button><button className="wp-primary" type="submit">{editing ? "Save changes" : "Add plan"}<ChevronRight size={17}/></button></div>
      </form>}
      {screen === "list" && <><div className="wp-list-toolbar"><button className="wp-list-back" onClick={back}><ArrowLeft size={17}/> Back to planner</button><button className="wp-add-small" onClick={openNew}><Plus size={16}/> Add plan</button></div><div className="wp-list-head"><p>All the good things you might do together.</p><span>{visible.length} shown</span></div><input className="wp-search" placeholder="Find a plan…" value={query} onChange={(e) => setQuery(e.target.value)}/>
        <div className="wp-filter-panel"><button type="button" className={`wp-filter-toggle ${filtersOpen ? "open" : ""}`} onClick={() => setFiltersOpen(!filtersOpen)}><span className={`wp-filter-arrow ${filtersOpen ? "open" : ""}`}>▼</span>{filtersOpen ? "Hide Filters" : "Filter"}{activeFilterCount > 0 && <span className="wp-filter-count">{activeFilterCount}</span>}</button>
          {filtersOpen && <div className="wp-filter-groups">{planFilterGroups.map((filter) => { const value = filters[filter.key]; return <div className="wp-filter-category" key={filter.key}><span className="wp-filter-label">{filter.label}</span><div className="wp-filter-chips"><button type="button" className={`wp-filter-chip any ${Array.isArray(value) ? value.length === 0 : !value ? "active" : ""}`} onClick={() => clearPlanFilter(filter.key)}>Any</button>{filter.options.map((option) => { const isActive = Array.isArray(value) ? value.includes(option) : value === option; const label = filter.key === "addedBy" ? (option === "cwis" ? "Cwis" : "Monokork") : option; return <button type="button" key={option} className={`wp-filter-chip ${isActive ? "active" : ""}`} aria-pressed={isActive} onClick={() => togglePlanFilter(filter.key, option, filter.multi)}>{label}</button>; })}</div></div>})}{activeFilterCount > 0 && <button className="wp-filter-clear" onClick={clearAllPlanFilters}>Clear all filters</button>}</div>}
        </div>
        {visible.length === 0 ? <div className="wp-empty"><div className="wp-empty-icon"><ClipboardList size={29}/></div><b>{plans.length ? "No plans found" : "Your list starts here"}</b><p>{plans.length ? "Try changing your search or filters." : "Add the first idea you'd love to share."}</p>{!plans.length && <button className="wp-primary" onClick={openNew}><Plus size={17}/> Add your first plan</button>}</div> : <div className="wp-plan-list">{visible.map((p) => <article className={`wp-plan-card ${selected === p.id ? "expanded" : ""}`} key={p.id}><button className="wp-plan-main" onClick={() => setSelected(selected === p.id ? null : p.id)}><span className="wp-plan-symbol"><CalendarDays size={21}/></span><span className="wp-plan-copy"><b>{p.title}</b><small>{[p.categories.join(" · "), p.duration || p.scale?.split(" · ")[0], p.status].filter(Boolean).join("  ·  ") || "Idea to explore"}</small></span><ChevronRight className="wp-chevron" size={19}/></button>{selected === p.id && <div className="wp-plan-details">{p.description && <p>{p.description}</p>}<div className="wp-detail-grid">{p.date && <span><CalendarDays size={14}/>{new Date(`${p.date}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</span>}{p.location && <span><MapPin size={14}/>{p.location}</span>}{p.duration && <span><Clock3 size={14}/>{p.duration}</span>}{p.priority && p.priority !== "Normal" && <span className="wp-priority">{p.priority}</span>}{p.addedBy && <span>Added by {p.addedBy}</span>}</div>{[p.energy, p.planning, p.socialSize, p.weather, ...p.importance, ...p.bestFor].filter(Boolean).length > 0 && <div className="wp-tags">{[p.energy, p.planning, p.socialSize, p.weather, ...p.importance, ...p.bestFor].filter(Boolean).map((tag) => <span key={tag}>{tag}</span>)}</div>}<div className="wp-card-actions"><button onClick={() => openEdit(p)}><Pencil size={14}/> Edit</button><button className="delete" onClick={() => remove(p.id)}><Trash2 size={14}/> Delete</button></div></div>}</article>)}</div>}
      </>}
    </section>
    {screen === "home" ? <div className="wp-back-wrap"><button className="wp-back-pill" onClick={back}>Back</button></div> : <footer className="wp-footer">{notice && <span className="wp-notice"><Check size={13}/>{notice}</span>}<span>Simple plans, lovely days.</span><button onClick={back} aria-label="Back"><X size={16}/></button></footer>}
  </main>;
}

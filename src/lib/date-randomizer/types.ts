/** A saved date idea with optional filter tags */
export interface DateIdea {
  id: string;
  name: string;
  description: string;
  time_required: string | null;
  energy_level: string | null;
  focus_required: string | null;
  preparation_required: string | null;
  vibe: string[] | null;
  activity_type: string[] | null;
  who_added: string | null;
  created_at: string;
}

export interface FilterCategory {
  key: keyof DateIdea;
  label: string;
  options: string[];
  multiSelect: boolean;
}

export const FILTER_CATEGORIES: FilterCategory[] = [
  {
    key: "time_required",
    label: "Time Required",
    options: ["<30 min", "30-60 min", "1-2 hr", "2-4 hr", "4+ hr"],
    multiSelect: false,
  },
  {
    key: "energy_level",
    label: "Energy Level",
    options: ["Very Low", "Low", "Medium", "High", "Very High"],
    multiSelect: false,
  },
  {
    key: "focus_required",
    label: "Focus Required",
    options: ["None", "Low", "Medium", "High"],
    multiSelect: false,
  },
  {
    key: "preparation_required",
    label: "Preparation",
    options: ["None", "Minimal", "Moderate", "Significant"],
    multiSelect: false,
  },
  {
    key: "vibe",
    label: "Vibe",
    options: ["Casual", "Relaxing", "Competitive", "Cozy", "New Experience"],
    multiSelect: true,
  },
  {
    key: "activity_type",
    label: "Activity Type",
    options: ["Movie/TV", "Games", "Learning"],
    multiSelect: true,
  },
  {
    key: "who_added",
    label: "Who Added It",
    options: ["cwis", "monokork"],
    multiSelect: false,
  },
];

/** Active filters — null/empty means "Any" */
export type FilterState = {
  time_required: string | null;
  energy_level: string | null;
  focus_required: string | null;
  preparation_required: string | null;
  vibe: string[];
  activity_type: string[];
  who_added: string | null;
};

export function emptyFilters(): FilterState {
  return {
    time_required: null,
    energy_level: null,
    focus_required: null,
    preparation_required: null,
    vibe: [],
    activity_type: [],
    who_added: null,
  };
}

import type { Profile } from "../types";

const STORAGE_KEY = "random-chat.profile";

export const emptyProfile: Profile = {
  name: "",
  age: null,
  gender: "",
  interests: [],
};

export function loadProfile(): Profile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyProfile;
    const parsed = JSON.parse(raw) as Partial<Profile>;
    return {
      name: typeof parsed.name === "string" ? parsed.name : "",
      age: typeof parsed.age === "number" ? parsed.age : null,
      gender: typeof parsed.gender === "string" ? parsed.gender : "",
      interests: Array.isArray(parsed.interests)
        ? parsed.interests.filter((i): i is string => typeof i === "string")
        : [],
    };
  } catch {
    return emptyProfile;
  }
}

export function saveProfile(profile: Profile): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch {
    // Ignore storage failures (e.g. private mode); profile stays in memory.
  }
}

export function profileLabel(profile: Profile): string {
  return profile.name.trim() || "Anonymous";
}

import { useEffect, useState } from "react";
import type { Gender, Profile } from "../types";

interface ProfileModalProps {
  initial: Profile;
  onSave: (profile: Profile) => void;
  onClose: () => void;
}

const GENDERS: { value: Gender; label: string }[] = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
  { value: "prefer-not-to-say", label: "Prefer not to say" },
];

export function ProfileModal({ initial, onSave, onClose }: ProfileModalProps) {
  const [name, setName] = useState(initial.name);
  const [age, setAge] = useState(initial.age === null ? "" : String(initial.age));
  const [gender, setGender] = useState<Gender | "">(initial.gender);
  const [interestsText, setInterestsText] = useState(
    initial.interests.join(", "),
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAge = age.trim() === "" ? null : Number(age);
    const interests = interestsText
      .split(",")
      .map((i) => i.trim())
      .filter(Boolean)
      .slice(0, 10);
    onSave({
      name: name.trim(),
      age:
        parsedAge !== null && Number.isFinite(parsedAge) ? parsedAge : null,
      gender,
      interests,
    });
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label="Edit profile"
        onClick={(e) => e.stopPropagation()}
      >
        <h2>Your profile</h2>
        <p className="muted">
          Shared with people you match with. Stored only in your browser.
        </p>
        <form onSubmit={handleSubmit}>
          <label>
            Name
            <input
              type="text"
              value={name}
              maxLength={40}
              placeholder="What should people call you?"
              onChange={(e) => setName(e.target.value)}
            />
          </label>

          <label>
            Age
            <input
              type="number"
              min={13}
              max={120}
              value={age}
              placeholder="Optional"
              onChange={(e) => setAge(e.target.value)}
            />
          </label>

          <label>
            Gender
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value as Gender | "")}
            >
              <option value="">Prefer not to say</option>
              {GENDERS.map((g) => (
                <option key={g.value} value={g.value}>
                  {g.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            Interests
            <input
              type="text"
              value={interestsText}
              placeholder="music, gaming, travel (comma separated)"
              onChange={(e) => setInterestsText(e.target.value)}
            />
          </label>

          <div className="modal-actions">
            <button type="button" className="btn ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn primary">
              Save profile
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

import type { Profile } from "../types";

const GENDER_LABELS: Record<string, string> = {
  male: "Male",
  female: "Female",
  other: "Other",
  "prefer-not-to-say": "—",
};

export function PartnerCard({ partner }: { partner: Profile }) {
  const initial = (partner.name || "?").charAt(0).toUpperCase();
  const details: string[] = [];
  if (partner.age !== null) details.push(`${partner.age}`);
  if (partner.gender) details.push(GENDER_LABELS[partner.gender] ?? "");

  return (
    <div className="partner-card">
      <div className="avatar" aria-hidden>
        {initial}
      </div>
      <div className="partner-meta">
        <strong>{partner.name || "Anonymous"}</strong>
        {details.length > 0 && (
          <span className="muted">{details.join(" · ")}</span>
        )}
        {partner.interests.length > 0 && (
          <div className="tags">
            {partner.interests.map((interest) => (
              <span key={interest} className="tag">
                {interest}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

import type { Claim } from "../lib/types";

type Step = { label: string; icon: string; roles: string[] };

const STEPS: Step[] = [
  { label: "Farm",      icon: "🐄", roles: ["supplier", "farm", "grower"] },
  { label: "Facility",  icon: "🏭", roles: ["facility", "processor", "manufacturer"] },
  { label: "Lab",       icon: "🔬", roles: ["lab", "laboratory", "testing"] },
  { label: "Certified", icon: "🏆", roles: [] },
];

type Status = "done" | "warn" | "pending";

function stepStatus(claims: Claim[], roles: string[]): Status {
  if (roles.length === 0) {
    if (claims.some(c => c.status === "failed" || c.status === "revoked")) return "warn";
    if (claims.some(c => c.status === "warning")) return "warn";
    return claims.length > 0 ? "done" : "pending";
  }
  const m = claims.filter(c => roles.some(r => c.issuerRole.toLowerCase().includes(r)));
  if (m.length === 0) return "pending";
  if (m.some(c => c.status === "failed" || c.status === "revoked" || c.status === "warning")) return "warn";
  return "done";
}

function seqRange(claims: Claim[], roles: string[]): string {
  if (!roles.length) return "";
  const m = claims.filter(c => roles.some(r => c.issuerRole.toLowerCase().includes(r)));
  if (!m.length) return "";
  const s = m.map(c => c.hcsSequence).sort((a,b) => a - b);
  const prefix = m.every(c => c.evidenceStorage === "walrus") ? "Walrus" : "HCS";
  return s.length === 1 ? `${prefix} #${s[0]}` : `${prefix} #${s[0]}-${s[s.length-1]}`;
}

const STATUS_BADGE: Record<Status, string> = {
  done: "✓",
  warn: "⚠",
  pending: "",
};

export function SupplyChainJourney({ claims }: { claims: Claim[] }) {
  const statuses = STEPS.map(s => stepStatus(claims, s.roles));
  const doneCount = statuses.filter(s => s === "done").length;
  const fillPct = Math.min(100, Math.round((doneCount / STEPS.length) * 100));

  return (
    <div className="pp-journey">
      <div className="pp-journey-title">Supply Chain Journey</div>
      <div className="pp-journey-steps">
        <div className="pp-journey-line">
          <div className="pp-journey-line-fill" style={{ width: fillPct + "%" }} />
        </div>
        {STEPS.map((step, i) => {
          const status = statuses[i];
          const seq = seqRange(claims, step.roles);
          return (
            <div className="pp-journey-step" key={step.label}>
              <div className={"pp-journey-icon-wrap " + status}>
                <span className="pp-journey-icon-emoji">{step.icon}</span>
                {STATUS_BADGE[status] && (
                  <span className={"pp-journey-badge " + status}>{STATUS_BADGE[status]}</span>
                )}
              </div>
              <div className="pp-journey-step-name">{step.label}</div>
              {seq && <div className="pp-journey-step-sub">{seq}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

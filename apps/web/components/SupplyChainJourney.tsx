import type { Claim } from "../lib/types";

type Step = { label: string; emoji: string; roles: string[] };

const STEPS: Step[] = [
  { label: "Farm",      emoji: "F", roles: ["supplier", "farm", "grower"] },
  { label: "Facility",  emoji: "P", roles: ["facility", "processor", "manufacturer"] },
  { label: "Lab",       emoji: "L", roles: ["lab", "laboratory", "testing"] },
  { label: "Certified", emoji: "C", roles: [] },
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
  return s.length === 1 ? `HCS #${s[0]}` : `HCS #${s[0]}-${s[s.length-1]}`;
}

const STEP_ICONS: Record<string, string> = {
  F: "\u{1F33E}",  // farm emoji placeholder - use text
  P: "\u{1F3ED}",
  L: "\u{1F9EA}",
  C: "\u2705",
};

const EMOJI: Record<string, string> = {
  Farm: "Farm",
  Facility: "Fac.",
  Lab: "Lab",
  Certified: "Done",
};

export function SupplyChainJourney({ claims }: { claims: Claim[] }) {
  const statuses = STEPS.map(s => stepStatus(claims, s.roles));
  const doneCount = statuses.filter(s => s === "done").length;
  const fillPct = Math.round((doneCount / (STEPS.length - 1)) * 100);

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
              <div className={"pp-journey-icon " + status}>
                {status === "done" ? "✓" : status === "warn" ? "⚠" : "○"}
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

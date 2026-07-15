import type { Claim } from "../lib/types";

type Status = "done" | "warn" | "pending";

function stepStatus(claim: Claim): Status {
  if (claim.status === "verified") return "done";
  if (claim.status === "pending") return "pending";
  return "warn";
}

const STATUS_BADGE: Record<Status, string> = {
  done: "✓",
  warn: "⚠",
  pending: "",
};

export function SupplyChainJourney({ claims }: { claims: Claim[] }) {
  const steps = [...claims].sort((a, b) => a.hcsSequence - b.hcsSequence);
  const statuses = steps.map(stepStatus);
  const doneCount = statuses.filter(s => s === "done").length;
  const fillPct = steps.length > 0 ? Math.round((doneCount / steps.length) * 100) : 0;

  return (
    <section className="pp-journey" aria-label="Supply chain journey">
      <div className="pp-journey-head">
        <p className="pp-section-kicker">Ordered evidence record</p>
        <h2 className="pp-journey-title">Supply chain journey</h2>
      </div>
      <div className="pp-journey-steps">
        <div className="pp-journey-line">
          <div className="pp-journey-line-fill" style={{ width: fillPct + "%" }} />
        </div>
        {steps.map((step, i) => {
          const status = statuses[i];
          const sequenceLabel = `${step.evidenceStorage === "walrus" ? "Walrus" : "HCS"} #${step.hcsSequence}`;
          return (
            <div className="pp-journey-step" key={step.claimType} title={`${step.label} · ${step.issuerName}`}>
              <div className={"pp-journey-icon-wrap " + status}>
                <span className="pp-journey-icon-emoji">{step.issuerRole.slice(0, 2).toUpperCase()}</span>
                {STATUS_BADGE[status] && (
                  <span className={"pp-journey-badge " + status}>{STATUS_BADGE[status]}</span>
                )}
              </div>
              <div className="pp-journey-step-name">{step.issuerRole}</div>
              <div className="pp-journey-step-sub">{sequenceLabel}</div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

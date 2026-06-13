import { hederaTransactionLink, suiExplorerLink } from "../lib/explorer-links";
import type { Claim, HcsEvent } from "../lib/types";

function fmt(ts: string): string {
  try {
    return new Date(ts).toLocaleString("en-US", {
      month: "short", day: "numeric", year: "numeric",
      hour: "numeric", minute: "2-digit",
    });
  } catch { return ts; }
}

function shortHash(h: string) {
  if (!h || h.length < 16) return h;
  return h.slice(0, 10) + "..." + h.slice(-8);
}

type Props = { events: HcsEvent[]; claims?: Claim[] };

export function LifecycleTimeline({ events, claims = [] }: Props) {
  const warnTypes = new Set(
    claims.filter(c => c.status === "warning" || c.status === "failed").map(c => c.claimType)
  );
  // Map claimType -> suiObjectId for linking evidence hash to Sui
  const claimSuiMap = new Map(claims.map(c => [c.claimType, c.suiObjectId]));

  return (
    <div className="pp-section">
      <div className="pp-section-head">
        <span className="pp-section-title">Hedera HCS Audit Log</span>
        <span className="pp-section-meta">{events.length} events</span>
      </div>

      {events.map((ev, i) => {
        const isWarn = warnTypes.has(ev.claimType);
        const txHref = hederaTransactionLink(ev.transactionId);
        const suiId = claimSuiMap.get(ev.claimType);
        const suiHref = suiId ? suiExplorerLink(suiId) : null;
        const isLast = i === events.length - 1;
        return (
          <div className="pp-hcs-event" key={ev.claimType + "-" + ev.sequenceNumber}>
            <div className="pp-hcs-line">
              <div className={"pp-hcs-dot" + (isWarn ? " warn" : "")} />
              {!isLast && <div className="pp-hcs-vert" />}
            </div>
            <div className="pp-hcs-body">
              <div className={"pp-hcs-seq" + (isWarn ? " warn" : "")}>
                {"HCS #" + ev.sequenceNumber}
              </div>
              <div className="pp-hcs-claim">{ev.claimType.replace(/_/g, " ")}</div>
              <div className="pp-hcs-meta">{ev.issuerName + " - " + ev.issuerRole}</div>
              <div className="pp-hcs-time">{fmt(ev.consensusTimestamp || ev.createdAt)}</div>

              {/* Evidence hash — links to Sui object that anchors this claim */}
              <div className="pp-hcs-hash-row">
                <span className="pp-hcs-hash-label">Evidence hash:</span>
                {suiHref ? (
                  <a className="pp-hcs-hash" href={suiHref} target="_blank" rel="noreferrer" title={ev.evidenceHash}>
                    {shortHash(ev.evidenceHash)}
                  </a>
                ) : (
                  <span className="pp-hcs-hash-plain" title={ev.evidenceHash}>{shortHash(ev.evidenceHash)}</span>
                )}
              </div>

              {txHref ? (
                <a className="pp-hcs-tx inspector-only" href={txHref} target="_blank" rel="noreferrer">
                  {ev.transactionId}
                </a>
              ) : (
                <div className="pp-hcs-tx inspector-only">{ev.transactionId}</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

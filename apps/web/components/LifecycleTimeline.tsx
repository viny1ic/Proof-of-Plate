import { hederaTransactionLink } from "../lib/explorer-links";
import type { HcsEvent } from "../lib/types";

function TransactionId({ transactionId }: { transactionId: string }) {
  const href = hederaTransactionLink(transactionId);
  if (!href) return <span className="muted mono">{transactionId}</span>;
  return (
    <a className="muted mono explorer-link" href={href} target="_blank" rel="noreferrer">
      {transactionId}
    </a>
  );
}

export function LifecycleTimeline({ events }: { events: HcsEvent[] }) {
  return (
    <section className="panel">
      <h2>Hedera HCS intake timeline</h2>
      <p className="muted">Ordered claim submissions before finalization on Sui.</p>
      <div className="timeline">
        {events.map((event) => (
          <article className="timeline-item" key={`${event.claimType}-${event.sequenceNumber}`}>
            <div className="row">
              <strong>#{event.sequenceNumber} {event.claimType}</strong>
              <span className="muted">{event.consensusTimestamp || event.createdAt}</span>
            </div>
            <p>{event.issuerName} submitted a {event.issuerRole} claim.</p>
            <p className="mono">{event.evidenceHash}</p>
            <p>
              <TransactionId transactionId={event.transactionId} />
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}

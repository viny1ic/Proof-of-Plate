type Props = { claimCount: number; eventCount: number; certificationCount: number };

export function StatStrip({ claimCount, eventCount, certificationCount }: Props) {
  return (
    <div className="pp-stat-strip">
      <div className="pp-stat">
        <div className="pp-stat-val" style={{ color: "var(--sui)" }}>
          {claimCount}
        </div>
        <div className="pp-stat-lbl">Claims On-Chain</div>
      </div>
      <div className="pp-stat">
        <div className="pp-stat-val" style={{ color: "var(--hedera)" }}>
          {eventCount}
        </div>
        <div className="pp-stat-lbl">HCS Audit Events</div>
      </div>
      <div className="pp-stat">
        <div className="pp-stat-val" style={{ color: "var(--green)" }}>
          {certificationCount}
        </div>
        <div className="pp-stat-lbl">Third-party certificates</div>
      </div>
    </div>
  );
}

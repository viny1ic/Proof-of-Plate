"use client";
import { useState } from "react";

const ON_CHAIN = "0x6ed40ae8a118447f6dcf03f216ae2b610a9cd25dcfa4050ac20b658df3d6a3a4";
const TAMPERED = "0x9f3a11c4e2b7d085f649201a3e8c7b4f1d920563abfe8714c2309a6d7e1b4820";

export function TamperDetection() {
  const [ran, setRan] = useState(false);
  const [running, setRunning] = useState(false);

  async function runDetection() {
    setRunning(true);
    await new Promise(r => setTimeout(r, 1800));
    setRan(true);
    setRunning(false);
  }

  return (
    <div className="pp-tamper">
      <div className="pp-tamper-head">
        <span className="pp-tamper-title">Shield Tamper Detection</span>
        <span className="pp-tamper-tag">Key Enterprise Pitch</span>
      </div>
      <div className="pp-tamper-body">
        <div className="pp-tamper-file">
          <span className="pp-tamper-filename">lab-results.json</span>
          <span className="pp-tamper-badge pass">Hash Match</span>
        </div>
        <div className={"pp-tamper-file" + (ran ? " flagged" : "")}>
          <span className="pp-tamper-filename">tampered-lab-results.json</span>
          {ran
            ? <span className="pp-tamper-badge fail">Tampered</span>
            : <span className="pp-tamper-badge pass" style={{ opacity: 0.5 }}>Unchecked</span>
          }
        </div>

        <button
          className="pp-tamper-run-btn"
          onClick={runDetection}
          disabled={running || ran}
        >
          {running ? "Running detection..." : ran ? "Detection Complete" : "Run Tamper Detection"}
        </button>

        {ran && (
          <div className="pp-tamper-result">
            <div className="pp-tamper-alert">
              Tamper detected: tampered-lab-results.json does not match on-chain hash
            </div>
            <div className="pp-diff-row">
              <div className="pp-diff-cell orig">
                <div className="pp-diff-label">Original</div>
                {`{
  "lactos_residue": 0.02,
  "test_date": "2025-01-15",
  "result": "PASS"
}`}
              </div>
              <div className="pp-diff-cell tampered">
                <div className="pp-diff-label">Tampered</div>
                {`{
  "lactos_residue": 0.5,
  "test_date": "2025-01-15",
  "result": "PASS"
}`}
              </div>
            </div>
            <div className="pp-hash-compare inspector-only">
              <div className="pp-hash-row">
                <span className="pp-hash-key">On-Chain</span>
                <span className="pp-hash-val">{ON_CHAIN}</span>
              </div>
              <div className="pp-hash-row">
                <span className="pp-hash-key">Computed</span>
                <span className="pp-hash-val bad">{TAMPERED}</span>
              </div>
            </div>
            <p className="pp-tamper-explain">
              The SHA-256 hash of the tampered file does not match the hash stored
              on Hedera HCS at submission time. Any modification produces a completely
              different hash, making tampering instantly detectable.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

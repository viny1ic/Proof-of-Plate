"use client";
import { useState } from "react";

type Props = {
  originalFileName: string;
  tamperedFileName: string;
  originalDocument: unknown;
  tamperedDocument: unknown;
  expectedHash: string;
  actualHash: string;
};

export function TamperDetection({
  originalFileName,
  tamperedFileName,
  originalDocument,
  tamperedDocument,
  expectedHash,
  actualHash,
}: Props) {
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
          <span className="pp-tamper-filename">{originalFileName}</span>
          <span className="pp-tamper-badge pass">Hash Match</span>
        </div>
        <div className={"pp-tamper-file" + (ran ? " flagged" : "")}>
          <span className="pp-tamper-filename">{tamperedFileName}</span>
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
              Tamper detected: {tamperedFileName} does not match the recorded hash
            </div>
            <div className="pp-diff-row">
              <div className="pp-diff-cell orig">
                <div className="pp-diff-label">Original</div>
                {JSON.stringify(originalDocument, null, 2)}
              </div>
              <div className="pp-diff-cell tampered">
                <div className="pp-diff-label">Tampered</div>
                {JSON.stringify(tamperedDocument, null, 2)}
              </div>
            </div>
            <div className="pp-hash-compare inspector-only">
              <div className="pp-hash-row">
                <span className="pp-hash-key">On-Chain</span>
                <span className="pp-hash-val">{expectedHash}</span>
              </div>
              <div className="pp-hash-row">
                <span className="pp-hash-key">Computed</span>
                <span className="pp-hash-val bad">{actualHash}</span>
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

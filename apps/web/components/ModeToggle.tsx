"use client";
import { useState } from "react";

export function ModeToggle() {
  const [mode, setMode] = useState<"consumer" | "inspector">("consumer");

  function toggle(newMode: "consumer" | "inspector") {
    setMode(newMode);
    document.body.classList.toggle("inspector", newMode === "inspector");
  }

  return (
    <div className="pp-mode-toggle" role="group" aria-label="Passport detail level">
      <button
        className={"pp-mode-btn" + (mode === "consumer" ? " active" : "")}
        onClick={() => toggle("consumer")}
        aria-pressed={mode === "consumer"}
      >
        Consumer
      </button>
      <button
        className={"pp-mode-btn" + (mode === "inspector" ? " active" : "")}
        onClick={() => toggle("inspector")}
        aria-pressed={mode === "inspector"}
      >
        Inspector
      </button>
    </div>
  );
}

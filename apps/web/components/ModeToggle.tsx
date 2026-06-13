"use client";
import { useState } from "react";

export function ModeToggle() {
  const [mode, setMode] = useState<"consumer" | "inspector">("consumer");

  function toggle(newMode: "consumer" | "inspector") {
    setMode(newMode);
    document.body.classList.toggle("inspector", newMode === "inspector");
  }

  return (
    <div className="pp-mode-toggle">
      <button
        className={"pp-mode-btn" + (mode === "consumer" ? " active" : "")}
        onClick={() => toggle("consumer")}
      >
        Consumer
      </button>
      <button
        className={"pp-mode-btn" + (mode === "inspector" ? " active" : "")}
        onClick={() => toggle("inspector")}
      >
        Inspector
      </button>
    </div>
  );
}

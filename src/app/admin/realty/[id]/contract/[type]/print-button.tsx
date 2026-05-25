"use client";

/** Triggers the browser's print dialog so the contract draft can be saved as PDF. */
export function PrintButton() {
  return (
    <button className="add-county-btn" onClick={() => window.print()}>
      Print / Save as PDF
    </button>
  );
}

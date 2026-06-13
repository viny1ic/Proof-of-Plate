import Link from "next/link";
import type { NutritionFact, ProductBatch } from "../lib/types";

function NutritionTable({ facts, servingSize }: { facts: NutritionFact[]; servingSize: string }) {
  const calories = facts.find((fact) => fact.label.toLowerCase() === "calories")?.amount ?? "—";
  return (
    <div className="pp-nutrition">
      <div className="pp-nutrition-header">
        <div className="pp-nutrition-title">Nutrition Facts</div>
        <div className="pp-nutrition-serving">Per {servingSize}</div>
      </div>
      <div className="pp-nutrition-cal-row">
        <span className="pp-nutrition-cal-label">Calories</span>
        <span className="pp-nutrition-cal-val">{calories}</span>
      </div>
      <div className="pp-nutrition-dv-note">% Daily Value*</div>
      {facts.filter(f => f.label !== "Calories").map((f, i) => (
        <div
          key={i}
          className={
            "pp-nutrition-row" +
            (f.sub ? " sub" : "") +
            (f.divider ? " divider" : "") +
            (f.bold ? " bold" : "")
          }
        >
          <span className="pp-nutrition-row-label">
            {f.label}
            {" "}
            <span className="pp-nutrition-row-amount">{f.amount}</span>
          </span>
          {f.dailyValue && (
            <span className="pp-nutrition-row-dv">{f.dailyValue}</span>
          )}
        </div>
      ))}
      <div className="pp-nutrition-footnote">
        * % Daily Values based on a 2,000 calorie diet.
      </div>
    </div>
  );
}

export function ProductInfo({ batch }: { batch: ProductBatch }) {
  return (
    <div className="pp-info-panel">
      <div className="pp-info-head">
        <span className="pp-info-title">Product Details</span>
        <span className="pp-info-sub">HTS metadata · {batch.category}</span>
      </div>

      <div className="pp-facts-grid">
        <div className="pp-fact-item">
          <span className="pp-fact-label">Net Contents</span>
          <span className="pp-fact-val">{batch.netContents}</span>
        </div>
        <div className="pp-fact-item">
          <span className="pp-fact-label">Serving Size</span>
          <span className="pp-fact-val">{batch.servingSize}</span>
        </div>
        <div className="pp-fact-item">
          <span className="pp-fact-label">Servings</span>
          <span className="pp-fact-val">{batch.servingsPerContainer}</span>
        </div>
        <div className="pp-fact-item">
          <span className="pp-fact-label">Allergens</span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginTop: "3px" }}>
            {batch.allergens.map(a => (
              <span className="pp-allergen-tag" key={a}>{a}</span>
            ))}
          </div>
        </div>
      </div>

      <div className="pp-highlights">
        {batch.nutritionHighlights.map(h => (
          <span className="pp-highlight-pill" key={h}>{h}</span>
        ))}
      </div>

      <div className="pp-storage-row">{batch.storageInstructions}</div>

      {/* Nutrition Facts */}
      {batch.nutrition && batch.nutrition.length > 0 && (
        <div style={{ padding: "12px 16px", borderTop: "1px solid var(--border)" }}>
          <NutritionTable facts={batch.nutrition} servingSize={batch.servingSize} />
        </div>
      )}

      {/* Ingredients */}
      <div style={{ padding: "12px 16px", borderTop: "1px solid var(--border)" }}>
        <div className="pp-ingredients-title">Ingredients</div>
        <div className="pp-ingredients-list">
          {batch.ingredients.map(ing => (
            <Link
              className="pp-ingredient-card"
              href={"/p/" + batch.batchId + "/ingredients/" + ing.slug}
              key={ing.slug}
            >
              <div className="pp-ingredient-left">
                <div className="pp-ingredient-name">{ing.name}</div>
                <div className="pp-ingredient-role">{ing.role}</div>
                {ing.relatedClaimTypes.length > 0 && (
                  <div className="pp-ingredient-claims">
                    {ing.relatedClaimTypes.map(ct => (
                      <span key={ct} className="pp-ingredient-claim-tag">
                        {ct.replace(/_/g, " ")}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="pp-ingredient-arrow">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </div>
            </Link>
          ))}
        </div>
        <div className="pp-ingredients-note">
          Tap an ingredient to view sourcing details and linked claims.
        </div>
      </div>
    </div>
  );
}

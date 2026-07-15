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
      {facts.filter((fact) => fact.label !== "Calories").map((fact, index) => (
        <div
          key={`${fact.label}-${index}`}
          className={
            "pp-nutrition-row" +
            (fact.sub ? " sub" : "") +
            (fact.divider ? " divider" : "") +
            (fact.bold ? " bold" : "")
          }
        >
          <span className="pp-nutrition-row-label">
            {fact.label} <span className="pp-nutrition-row-amount">{fact.amount}</span>
          </span>
          {fact.dailyValue && <span className="pp-nutrition-row-dv">{fact.dailyValue}</span>}
        </div>
      ))}
      <div className="pp-nutrition-footnote">* % Daily Values based on a 2,000 calorie diet.</div>
    </div>
  );
}

export function ProductInfo({ batch }: { batch: ProductBatch }) {
  return (
    <section className="pp-info-panel" id="product-details">
      <div className="pp-info-head">
        <div>
          <p className="pp-section-kicker">What is in it</p>
          <h2>Product details</h2>
        </div>
        <span className="pp-info-sub inspector-only">From HTS metadata</span>
      </div>

      <div className="pp-facts-grid">
        <div className="pp-fact-item">
          <span className="pp-fact-label">Net contents</span>
          <span className="pp-fact-val">{batch.netContents}</span>
        </div>
        <div className="pp-fact-item">
          <span className="pp-fact-label">Serving size</span>
          <span className="pp-fact-val">{batch.servingSize}</span>
        </div>
        <div className="pp-fact-item">
          <span className="pp-fact-label">Servings</span>
          <span className="pp-fact-val">{batch.servingsPerContainer}</span>
        </div>
        <div className="pp-fact-item">
          <span className="pp-fact-label">Allergens</span>
          <div className="pp-allergens">
            {batch.allergens.map((allergen) => <span className="pp-allergen-tag" key={allergen}>{allergen}</span>)}
          </div>
        </div>
      </div>

      <div className="pp-highlights">
        {batch.nutritionHighlights.map((highlight) => (
          <span className="pp-highlight-pill" key={highlight}>{highlight}</span>
        ))}
      </div>
      <div className="pp-storage-row"><strong>Storage:</strong> {batch.storageInstructions}</div>

      {batch.nutrition && batch.nutrition.length > 0 && (
        <details className="pp-disclosure">
          <summary>
            <span>Nutrition facts</span>
            <small>View the complete label</small>
          </summary>
          <div className="pp-disclosure-body">
            <NutritionTable facts={batch.nutrition} servingSize={batch.servingSize} />
          </div>
        </details>
      )}

      <details className="pp-disclosure">
        <summary>
          <span>Ingredients</span>
          <small>{batch.ingredients.length} ingredient{batch.ingredients.length === 1 ? "" : "s"} · sourcing and linked claims</small>
        </summary>
        <div className="pp-disclosure-body">
          <div className="pp-ingredients-list">
            {batch.ingredients.map((ingredient) => (
              <Link
                className="pp-ingredient-card"
                href={`/p/${batch.batchId}/ingredients/${ingredient.slug}`}
                key={ingredient.slug}
              >
                <div className="pp-ingredient-left">
                  <div className="pp-ingredient-name">{ingredient.name}</div>
                  <div className="pp-ingredient-role">{ingredient.role}</div>
                  {ingredient.relatedClaimTypes.length > 0 && (
                    <div className="pp-ingredient-claims">
                      {ingredient.relatedClaimTypes.map((claimType) => (
                        <span key={claimType} className="pp-ingredient-claim-tag">
                          {claimType.replace(/_/g, " ")}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <span className="pp-ingredient-arrow" aria-hidden="true">→</span>
              </Link>
            ))}
          </div>
        </div>
      </details>
    </section>
  );
}

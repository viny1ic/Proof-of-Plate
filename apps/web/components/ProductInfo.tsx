import Link from "next/link";
import { ArrowRight, Milk } from "lucide-react";
import type { ProductBatch } from "../lib/types";

export function ProductInfo({ batch }: { batch: ProductBatch }) {
  return (
    <section className="panel">
      <div className="row">
        <div>
          <h2>Complete Product Info</h2>
          <p className="muted">{batch.description}</p>
        </div>
        <Milk size={24} aria-hidden="true" />
      </div>

      <div className="grid product-facts">
        <div>
          <span className="muted">Net contents</span>
          <strong>{batch.netContents}</strong>
        </div>
        <div>
          <span className="muted">Serving size</span>
          <strong>{batch.servingSize}</strong>
        </div>
        <div>
          <span className="muted">Servings</span>
          <strong>{batch.servingsPerContainer}</strong>
        </div>
        <div>
          <span className="muted">Allergens</span>
          <strong>{batch.allergens.join(", ")}</strong>
        </div>
      </div>

      <div className="info-block">
        <span className="muted">Nutrition highlights</span>
        <div className="pill-row">
          {batch.nutritionHighlights.map((highlight) => (
            <span className="pill" key={highlight}>
              {highlight}
            </span>
          ))}
        </div>
      </div>

      <div className="info-block">
        <span className="muted">Storage</span>
        <p>{batch.storageInstructions}</p>
      </div>

      <div className="info-block">
        <h3>Ingredients</h3>
        <div className="ingredient-grid">
          {batch.ingredients.map((ingredient) => (
            <Link
              className="ingredient-card"
              href={`/p/${batch.batchId}/ingredients/${ingredient.slug}`}
              key={ingredient.slug}
            >
              <span>
                <strong>{ingredient.name}</strong>
                <small>{ingredient.role}</small>
              </span>
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, ExternalLink } from "lucide-react";
import { getBatch, getClaims, getIngredient } from "../../../../../lib/data";
import type { Ingredient } from "../../../../../lib/types";

export default async function IngredientPage({
  params,
}: {
  params: Promise<{ batchId: string; slug: string }>;
}) {
  const { batchId, slug } = await params;

  let ingredient: Ingredient;
  try {
    getBatch(batchId);
    ingredient = getIngredient(batchId, slug);
  } catch {
    notFound();
  }

  const relatedClaims = getClaims(batchId).filter((claim) => ingredient.relatedClaimTypes.includes(claim.claimType));

  return (
    <main className="shell">
      <div className="detail-layout">
        <Link className="back-link" href={`/p/${batchId}`}>
          <ArrowLeft size={16} aria-hidden="true" />
          Back to product passport
        </Link>

        <section className="panel ingredient-hero">
          <p className="muted">Proof of Plate ingredient profile</p>
          <h1>{ingredient.name}</h1>
          <p>{ingredient.description}</p>
          <div className="grid product-facts">
            <div>
              <span className="muted">Role</span>
              <strong>{ingredient.role}</strong>
            </div>
            <div>
              <span className="muted">Source</span>
              <strong>{ingredient.source}</strong>
            </div>
            <div>
              <span className="muted">Batch</span>
              <strong className="mono">{batchId}</strong>
            </div>
          </div>
        </section>

        <section className="panel">
          <h2>Verification Context</h2>
          <p>{ingredient.verificationNote}</p>

          {relatedClaims.length > 0 ? (
            <div className="related-claims">
              {relatedClaims.map((claim) => (
                <article className="related-claim" key={claim.claimType}>
                  <CheckCircle2 size={16} aria-hidden="true" />
                  <span>
                    <strong>{claim.label}</strong>
                    <small>
                      {claim.status} by {claim.issuerName}
                    </small>
                  </span>
                  <Link href={`/p/${batchId}`} aria-label={`Open ${claim.label} claim`}>
                    <ExternalLink size={16} aria-hidden="true" />
                  </Link>
                </article>
              ))}
            </div>
          ) : (
            <p className="muted">
              This ingredient is part of the complete product formulation, but it is not currently represented by a
              separate on-chain label claim.
            </p>
          )}
        </section>
      </div>
    </main>
  );
}

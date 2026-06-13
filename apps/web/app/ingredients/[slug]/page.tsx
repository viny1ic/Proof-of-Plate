import { redirect } from "next/navigation";
import { getDeployment } from "../../../lib/data";

export default async function IngredientPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const deployment = getDeployment();
  redirect(`/p/${deployment.batch.batchId}/ingredients/${slug}`);
}

import { redirect } from "next/navigation";
import { getDeployment } from "../lib/data";

export default function Home() {
  const batchId = getDeployment().batch.batchId;
  redirect(`/p/${batchId}`);
}

import { getBatch, getClaims } from "./data";

export async function getSuiBatch(batchId: string) {
  return getBatch(batchId);
}

export async function getSuiClaims(batchId: string) {
  return getClaims(batchId);
}

import { NextResponse } from "next/server";
import { getHtsMetadataByToken } from "../../../../lib/data";
import { hederaTokenLink } from "../../../../lib/explorer-links";

export async function GET(_: Request, { params }: { params: Promise<{ tokenId: string }> }) {
  const { tokenId } = await params;
  const result = getHtsMetadataByToken(decodeURIComponent(tokenId));

  if (!result.hts) {
    return NextResponse.json({ error: result.errors.join(" ") || "Unknown HTS token." }, { status: 404 });
  }

  return NextResponse.json({
    ok: result.ok,
    errors: result.errors,
    tokenId: result.hts.tokenId,
    serialNumber: result.hts.serialNumber,
    nftId: result.hts.nftId,
    metadataHash: result.hts.metadataHash,
    metadataPayload: result.hts.metadataPayload,
    productMetadata: result.hts.productMetadata,
    hashscanUrl: hederaTokenLink(result.hts.tokenId),
  });
}

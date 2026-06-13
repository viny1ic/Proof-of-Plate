import { execFileSync } from "node:child_process";
import { NextResponse } from "next/server";

function isLocalhost(request: Request) {
  const hostname = new URL(request.url).hostname;
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

function isAuthorized(request: Request) {
  if (isLocalhost(request)) return true;
  if (process.env.NODE_ENV !== "production") return true;

  const token = process.env.DEMO_ADMIN_TOKEN;
  const supplied =
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    request.headers.get("x-demo-admin-token");
  return Boolean(token && supplied && supplied === token);
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "Demo admin token required" }, { status: 403 });
  }

  try {
    execFileSync("npm", ["run", "demo:add-claim"], {
      cwd: process.cwd().endsWith("apps/web") ? "../.." : ".",
      stdio: "pipe",
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ ok: false, error: (error as Error).message }, { status: 500 });
  }
}

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { NextResponse } from "next/server";

const execFileAsync = promisify(execFile);

function isAuthorized(request: Request) {
  // In non-production environments, allow without a token
  if (process.env.NODE_ENV !== "production") return true;

  // In production, require an explicit DEMO_ADMIN_TOKEN — never rely on the
  // request hostname, which can be spoofed behind a reverse proxy.
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
    await execFileAsync("npm", ["run", "demo:add-claim"], {
      cwd: process.cwd().endsWith("apps/web") ? "../.." : ".",
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ ok: false, error: (error as Error).message }, { status: 500 });
  }
}

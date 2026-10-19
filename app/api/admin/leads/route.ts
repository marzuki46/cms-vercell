import { NextResponse, type NextRequest } from "next/server";
import { requireAdminApi, jsonError } from "@/lib/api";
import { listLeads } from "@/lib/leads";
import type { LeadStatus } from "@/types/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const STATUSES: LeadStatus[] = ["new", "contacted", "closed"];

export async function GET(request: NextRequest) {
  const guard = await requireAdminApi();
  if (guard.response) return guard.response;

  const statusParam = request.nextUrl.searchParams.get("status");
  const status = STATUSES.includes(statusParam as LeadStatus)
    ? (statusParam as LeadStatus)
    : undefined;

  try {
    const leads = await listLeads(status);
    return NextResponse.json({ leads });
  } catch (err) {
    return jsonError((err as Error).message, 500);
  }
}

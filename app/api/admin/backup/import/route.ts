import { NextResponse, type NextRequest } from "next/server";
import { requireAdminApi, jsonError } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

interface ImportPayload {
  data: {
    settings?: any[];
    articles?: any[];
    authors?: any[];
    categories?: any[];
    redirects?: any[];
  };
  options?: {
    restoreSettings?: boolean;
    restoreArticles?: boolean;
    restoreAuthors?: boolean;
    restoreCategories?: boolean;
    restoreRedirects?: boolean;
  };
}

export async function POST(request: NextRequest) {
  const guard = await requireAdminApi();
  if (guard.response) return guard.response;

  let body: ImportPayload;
  try {
    body = await request.json();
  } catch {
    return jsonError("Format JSON tidak valid.", 400);
  }

  if (!body.data || typeof body.data !== "object") {
    return jsonError("Struktur file backup tidak valid. Objek 'data' tidak ditemukan.", 400);
  }

  const { data, options = {} } = body;
  const sb = createAdminClient();

  const results = {
    settingsRestored: 0,
    authorsRestored: 0,
    categoriesRestored: 0,
    articlesRestored: 0,
    redirectsRestored: 0,
    errors: [] as string[],
  };

  // 1. Restore Settings
  if (options.restoreSettings !== false && Array.isArray(data.settings) && data.settings.length > 0) {
    try {
      for (const row of data.settings) {
        const payload = { ...row };
        // Never overwrite existing live API key with placeholder or empty string from export
        if (
          !payload.ninerouter_key ||
          payload.ninerouter_key === "ENCRYPTED_OR_SET_MANUALLY"
        ) {
          delete payload.ninerouter_key;
        }

        const { error } = await sb
          .from("settings")
          .upsert(payload, { onConflict: "id" });
        if (error) results.errors.push(`Settings: ${error.message}`);
        else results.settingsRestored++;
      }
    } catch (err) {
      results.errors.push(`Settings fatal: ${(err as Error).message}`);
    }
  }

  // 2. Restore Authors
  if (options.restoreAuthors !== false && Array.isArray(data.authors) && data.authors.length > 0) {
    try {
      for (const row of data.authors) {
        const { error } = await sb
          .from("authors")
          .upsert(row, { onConflict: "slug" });
        if (error) results.errors.push(`Author (${row.slug}): ${error.message}`);
        else results.authorsRestored++;
      }
    } catch (err) {
      results.errors.push(`Authors fatal: ${(err as Error).message}`);
    }
  }

  // 3. Restore Categories
  if (options.restoreCategories !== false && Array.isArray(data.categories) && data.categories.length > 0) {
    try {
      for (const row of data.categories) {
        const { error } = await sb
          .from("categories")
          .upsert(row, { onConflict: "slug" });
        if (error) results.errors.push(`Category (${row.slug}): ${error.message}`);
        else results.categoriesRestored++;
      }
    } catch (err) {
      results.errors.push(`Categories fatal: ${(err as Error).message}`);
    }
  }

  // 4. Restore Articles
  if (options.restoreArticles !== false && Array.isArray(data.articles) && data.articles.length > 0) {
    try {
      for (const row of data.articles) {
        const payload = { ...row };
        // Upsert by slug
        let { error } = await sb
          .from("articles")
          .upsert(payload, { onConflict: "slug" });

        // If translation_of column missing in target db
        if (error && error.message.includes("translation_of")) {
          delete payload.translation_of;
          const retry = await sb.from("articles").upsert(payload, { onConflict: "slug" });
          error = retry.error;
        }

        // If language column missing in target db
        if (error && error.message.includes("column") && error.message.includes("language")) {
          delete payload.language;
          const retry = await sb.from("articles").upsert(payload, { onConflict: "slug" });
          error = retry.error;
        }

        if (error) {
          results.errors.push(`Article (${row.slug}): ${error.message}`);
        } else {
          results.articlesRestored++;
        }
      }
    } catch (err) {
      results.errors.push(`Articles fatal: ${(err as Error).message}`);
    }
  }

  // 5. Restore Redirects
  if (options.restoreRedirects !== false && Array.isArray(data.redirects) && data.redirects.length > 0) {
    try {
      for (const row of data.redirects) {
        const { error } = await sb
          .from("redirects")
          .upsert(row, { onConflict: "from_path" });
        if (error) results.errors.push(`Redirect (${row.from_path}): ${error.message}`);
        else results.redirectsRestored++;
      }
    } catch (err) {
      results.errors.push(`Redirects fatal: ${(err as Error).message}`);
    }
  }

  return NextResponse.json({
    success: results.errors.length === 0,
    results,
  });
}

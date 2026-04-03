import axios from "axios";
import * as cheerio from "cheerio";

const USER_AGENT =
  "ContentGuard/1.0 (+https://contentguard.io; piracy-detection; respect robots.txt)";

const SEARCH_NUM = 8;

export type SerpOrganicRow = { link: string; title: string; snippet: string };

/** Pause between SerpAPI / scrape calls to respect rate limits. */
export async function delayBetweenSearches(ms = 350): Promise<void> {
  await new Promise((r) => setTimeout(r, ms));
}

/**
 * SerpAPI organic results with title + snippet (Google or Bing).
 * Retries up to 3 times with backoff on network errors.
 */
export async function serpApiOrganicResults(
  query: string,
  engine: "google" | "bing",
): Promise<SerpOrganicRow[]> {
  const apiKey = process.env.SERPAPI_KEY;
  if (!apiKey) return [];
  let lastErr: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      if (attempt > 0) await new Promise((r) => setTimeout(r, 400 * attempt));
      const { data } = await axios.get("https://serpapi.com/search.json", {
        params: {
          engine,
          q: query,
          api_key: apiKey,
          num: SEARCH_NUM,
        },
        timeout: 25_000,
        headers: { "User-Agent": USER_AGENT },
      });
      if (data?.error) {
        console.warn("[webScanner] SerpAPI error:", data.error);
        return [];
      }
      const organic = (data?.organic_results ?? []) as {
        link?: string;
        title?: string;
        snippet?: string;
      }[];
      return organic
        .filter((o) => typeof o.link === "string" && o.link.startsWith("http"))
        .map((o) => ({
          link: o.link as string,
          title: String(o.title ?? "").slice(0, 500),
          snippet: String(o.snippet ?? "").slice(0, 500),
        }));
    } catch (e: unknown) {
      lastErr = e;
    }
  }
  console.warn("[webScanner] SerpAPI organic failed after retries:", lastErr);
  return [];
}

/** SerpAPI Google — link list only (piracy pipeline). */
async function serpApiGoogleSearch(query: string): Promise<string[]> {
  const rows = await serpApiOrganicResults(query, "google");
  return rows.map((r) => r.link);
}

/** Google Programmable Search (Custom Search JSON API). Requires GOOGLE_CSE_API_KEY + GOOGLE_CSE_CX. */
async function googleProgrammableSearch(query: string): Promise<string[]> {
  const key = process.env.GOOGLE_CSE_API_KEY;
  const cx = process.env.GOOGLE_CSE_CX;
  if (!key || !cx) return [];
  try {
    const { data } = await axios.get("https://www.googleapis.com/customsearch/v1", {
      params: { key, cx, q: query, num: SEARCH_NUM },
      timeout: 15_000,
      headers: { "User-Agent": USER_AGENT },
    });
    const items = (data?.items ?? []) as { link?: string }[];
    return items.map((i) => i.link).filter((u): u is string => typeof u === "string" && u.startsWith("http"));
  } catch (e: unknown) {
    const err = e as { response?: { data?: unknown }; message?: string };
    console.warn("[webScanner] Google CSE request failed:", err?.response?.data ?? err?.message ?? e);
    return [];
  }
}

/**
 * Resolves candidate URLs for the piracy pipeline.
 * 1) SerpAPI (`SERPAPI_KEY`) if set
 * 2) Else Google Custom Search (`GOOGLE_CSE_API_KEY` + `GOOGLE_CSE_CX`) if set
 */
export async function searchWeb(query: string): Promise<string[]> {
  if (process.env.SERPAPI_KEY) {
    const fromSerp = await serpApiGoogleSearch(query);
    if (fromSerp.length > 0) return fromSerp;
  }
  if (process.env.GOOGLE_CSE_API_KEY && process.env.GOOGLE_CSE_CX) {
    const fromCse = await googleProgrammableSearch(query);
    if (fromCse.length > 0) return fromCse;
  }
  if (!process.env.SERPAPI_KEY && (!process.env.GOOGLE_CSE_API_KEY || !process.env.GOOGLE_CSE_CX)) {
    console.warn(
      "[webScanner] Configure SERPAPI_KEY (SerpAPI) or GOOGLE_CSE_API_KEY + GOOGLE_CSE_CX. Internet search skipped.",
    );
  }
  return [];
}

/** @deprecated Use searchWeb — kept for call sites that still import this name. */
export async function googleCustomSearch(query: string): Promise<string[]> {
  return searchWeb(query);
}

export type ScrapedPage = {
  text: string;
  imageUrls: string[];
};

export async function scrapePage(url: string): Promise<ScrapedPage | null> {
  try {
    const { data: html, status } = await axios.get<string>(url, {
      timeout: 12_000,
      maxContentLength: 5_000_000,
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
      },
      validateStatus: (s) => s >= 200 && s < 400,
    });
    if (status >= 400) return null;

    const $ = cheerio.load(html);
    $("script, style, noscript, svg").remove();
    const text = $("body").text().replace(/\s+/g, " ").trim().slice(0, 80_000);

    const imageUrls: string[] = [];
    $('meta[property="og:image"]').each((_, el) => {
      const c = $(el).attr("content");
      if (c) imageUrls.push(new URL(c, url).href);
    });
    $("img[src]").each((_, el) => {
      const src = $(el).attr("src");
      if (src && imageUrls.length < 8) {
        try {
          imageUrls.push(new URL(src, url).href);
        } catch {
          /* ignore bad URL */
        }
      }
    });

    return { text, imageUrls: [...new Set(imageUrls)].slice(0, 8) };
  } catch (e: any) {
    console.warn("[webScanner] scrape failed:", url, e?.message ?? e);
    return null;
  }
}

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

export type ReverseImageHit = {
  link: string;
  title: string;
  snippet: string;
  exact: boolean;
};

/** Reverse image search is on when SerpAPI or Vision is configured, unless explicitly disabled. */
export function isReverseImageSearchEnabled(): boolean {
  if (process.env.DISABLE_REVERSE_IMAGE_SEARCH === "1") return false;
  return Boolean(
    process.env.SERPAPI_KEY ||
      process.env.GOOGLE_VISION_API_KEY ||
      process.env.GOOGLE_CLOUD_VISION_API_KEY,
  );
}

function visionApiKey(): string | undefined {
  return process.env.GOOGLE_VISION_API_KEY || process.env.GOOGLE_CLOUD_VISION_API_KEY;
}

function pushHit(out: ReverseImageHit[], seen: Set<string>, row: ReverseImageHit): void {
  if (!row.link.startsWith("http") || seen.has(row.link)) return;
  seen.add(row.link);
  out.push(row);
}

function collectSerpImageHits(data: Record<string, unknown>, seen: Set<string>, out: ReverseImageHit[]): void {
  const exactSet = new Set(
    (Array.isArray(data.exact_matches) ? data.exact_matches : [])
      .map((row) => (row && typeof row === "object" ? (row as { link?: string }).link : undefined))
      .filter((u): u is string => typeof u === "string"),
  );
  const buckets: unknown[] = [
    data.visual_matches,
    data.exact_matches,
    data.image_results,
    data.inline_images,
    data.organic_results,
  ].flatMap((b) => (Array.isArray(b) ? b : []));

  for (const raw of buckets) {
    if (!raw || typeof raw !== "object") continue;
    const o = raw as Record<string, unknown>;
    const link =
      typeof o.link === "string"
        ? o.link
        : typeof o.source === "string" && String(o.source).startsWith("http")
          ? String(o.source)
          : "";
    if (!link.startsWith("http")) continue;
    const title = String(o.title ?? o.source ?? "").slice(0, 500);
    const snippet = String(o.snippet ?? o.source ?? title).slice(0, 500);
    pushHit(out, seen, {
      link,
      title,
      snippet,
      exact: o.exact_matches === true || exactSet.has(link),
    });
  }
}

async function serpApiEngineSearch(
  params: Record<string, string | number>,
): Promise<Record<string, unknown> | null> {
  const apiKey = process.env.SERPAPI_KEY;
  if (!apiKey) return null;
  let lastErr: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      if (attempt > 0) await new Promise((r) => setTimeout(r, 400 * attempt));
      const { data } = await axios.get("https://serpapi.com/search.json", {
        params: { ...params, api_key: apiKey },
        timeout: 30_000,
        headers: { "User-Agent": USER_AGENT },
      });
      if (data?.error) {
        console.warn("[webScanner] SerpAPI reverse-image error:", data.error);
        return null;
      }
      return (data ?? null) as Record<string, unknown> | null;
    } catch (e: unknown) {
      lastErr = e;
    }
  }
  console.warn("[webScanner] SerpAPI reverse-image failed after retries:", lastErr);
  return null;
}

async function googleVisionWebDetection(args: {
  imageUrl?: string | null;
  imageBuffer?: Buffer | null;
}): Promise<ReverseImageHit[]> {
  const key = visionApiKey();
  if (!key) return [];
  const image: Record<string, unknown> = {};
  if (args.imageBuffer && args.imageBuffer.length > 0) {
    image.content = args.imageBuffer.toString("base64");
  } else if (args.imageUrl) {
    image.source = { imageUri: args.imageUrl };
  } else {
    return [];
  }

  try {
    const { data } = await axios.post(
      `https://vision.googleapis.com/v1/images:annotate?key=${encodeURIComponent(key)}`,
      {
        requests: [
          {
            image,
            features: [{ type: "WEB_DETECTION", maxResults: 12 }],
          },
        ],
      },
      { timeout: 25_000, headers: { "User-Agent": USER_AGENT } },
    );
    const web = data?.responses?.[0]?.webDetection as
      | {
          pagesWithMatchingImages?: { url?: string; pageTitle?: string }[];
          fullMatchingImages?: { url?: string }[];
          visuallySimilarImages?: { url?: string }[];
          webEntities?: { description?: string }[];
        }
      | undefined;
    if (!web) return [];
    const seen = new Set<string>();
    const out: ReverseImageHit[] = [];
    for (const p of web.pagesWithMatchingImages ?? []) {
      if (typeof p.url === "string") {
        pushHit(out, seen, {
          link: p.url,
          title: String(p.pageTitle ?? "Vision web match").slice(0, 500),
          snippet: "Google Vision pages-with-matching-images",
          exact: true,
        });
      }
    }
    for (const img of [...(web.fullMatchingImages ?? []), ...(web.visuallySimilarImages ?? [])]) {
      if (typeof img.url === "string") {
        pushHit(out, seen, {
          link: img.url,
          title: "Visually similar image",
          snippet: "Google Vision visually similar / full match",
          exact: Boolean(web.fullMatchingImages?.some((f) => f.url === img.url)),
        });
      }
    }
    return out;
  } catch (e: unknown) {
    const err = e as { response?: { data?: unknown }; message?: string };
    console.warn("[webScanner] Google Vision WEB_DETECTION failed:", err?.response?.data ?? err?.message ?? e);
    return [];
  }
}

/**
 * Reverse image search via SerpAPI Google Lens, Google Reverse Image, then optional Vision API.
 */
export async function reverseImageSearch(args: {
  imageUrl?: string | null;
  imageBuffer?: Buffer | null;
}): Promise<ReverseImageHit[]> {
  if (!isReverseImageSearchEnabled()) return [];

  const seen = new Set<string>();
  const out: ReverseImageHit[] = [];
  const imageUrl = args.imageUrl?.trim() || null;

  if (imageUrl && process.env.SERPAPI_KEY) {
    const lens = await serpApiEngineSearch({ engine: "google_lens", url: imageUrl, type: "visual_matches" });
    if (lens) collectSerpImageHits(lens, seen, out);
    await delayBetweenSearches();

    if (out.length < 4) {
      const reverse = await serpApiEngineSearch({ engine: "google_reverse_image", image_url: imageUrl });
      if (reverse) collectSerpImageHits(reverse, seen, out);
      await delayBetweenSearches();
    }

    if (out.length < 4) {
      const exact = await serpApiEngineSearch({ engine: "google_lens", url: imageUrl, type: "exact_matches" });
      if (exact) collectSerpImageHits(exact, seen, out);
    }
  }

  if (out.length < 4 && visionApiKey()) {
    const visionHits = await googleVisionWebDetection({
      imageUrl,
      imageBuffer: args.imageBuffer ?? null,
    });
    for (const h of visionHits) pushHit(out, seen, h);
  }

  return out.slice(0, 16);
}

export type ScrapedPage = {
  text: string;
  imageUrls: string[];
};

/** Prefer main article regions (Wikipedia, blogs, docs) over chrome. */
function extractVisibleArticleText($: cheerio.CheerioAPI): string {
  const selectors = [
    "#mw-content-text .mw-parser-output",
    "#mw-content-text",
    "article",
    "main",
    '[role="main"]',
    "#content article",
    "#content",
    "body",
  ];
  for (const sel of selectors) {
    const el = $(sel).first();
    const t = el.text().trim();
    if (el.length && t.length > 120) return t;
  }
  return $("body").text();
}

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
    $(
      "script, style, noscript, svg, iframe, template, " +
        "header, footer, nav, aside, " +
        '[role="navigation"], [role="banner"], [role="contentinfo"], ' +
        ".advertisement, .ad, #footer, #header, .sidebar, .nav",
    ).remove();

    const text = extractVisibleArticleText($).replace(/\s+/g, " ").trim().slice(0, 80_000);

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

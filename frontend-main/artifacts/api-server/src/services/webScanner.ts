import axios from "axios";
import * as cheerio from "cheerio";

const USER_AGENT =
  "ContentGuard/1.0 (+https://contentguard.io; piracy-detection; respect robots.txt)";

/** Google Programmable Search (Custom Search JSON API). Requires GOOGLE_CSE_API_KEY + GOOGLE_CSE_CX. */
export async function googleCustomSearch(query: string): Promise<string[]> {
  const key = process.env.GOOGLE_CSE_API_KEY;
  const cx = process.env.GOOGLE_CSE_CX;
  if (!key || !cx) {
    console.warn(
      "[webScanner] Google CSE not configured (GOOGLE_CSE_API_KEY / GOOGLE_CSE_CX). Internet scan skipped.",
    );
    return [];
  }
  try {
    const { data } = await axios.get("https://www.googleapis.com/customsearch/v1", {
      params: { key, cx, q: query, num: 8 },
      timeout: 15_000,
      headers: { "User-Agent": USER_AGENT },
    });
    const items = (data?.items ?? []) as { link?: string }[];
    return items.map((i) => i.link).filter((u): u is string => typeof u === "string" && u.startsWith("http"));
  } catch (e: any) {
    console.warn("[webScanner] Google CSE request failed:", e?.response?.data ?? e?.message ?? e);
    return [];
  }
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

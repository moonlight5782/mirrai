export type SitemapProduct = {
  externalId: string;
  sku: string;
  name: string;
  category: string;
  sourceUrl: string;
  imageUrls: string[];
  sourceUpdatedAt: string | null;
  widthCm: number | null;
  depthCm: number | null;
  heightCm: number | null;
};

const furnitureTerms = /(?:^|[\s,])(диван|кресл[оа]?|стул|стол(?:ик)?|тумб(?:а|очка)?|шкаф|комод|консол[ьи]|пуф(?:ик)?|банкетка|скамья|кровать|этажерк[аи]|полк[аи]|винотека|sofa|chair|table|cabinet|bench)(?:[\s,]|$)/iu;

function decodeXml(value: string) {
  return value.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim();
}

function tag(block: string, name: string) {
  const match = block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, "i"));
  return match ? decodeXml(match[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")) : "";
}

function safeHttpsUrl(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return "";
    url.protocol = "https:";
    url.hash = "";
    return url.toString();
  } catch { return ""; }
}

function categoryFor(name: string) {
  const value = name.toLowerCase();
  if (value.includes("диван") || value.includes("sofa")) return "Диваны";
  if (value.includes("кресл")) return "Кресла";
  if (/(?:^|\s)стул(?:\s|$)/u.test(value) || value.includes("chair")) return "Стулья";
  if (value.includes("тумб")) return "Тумбы";
  if (value.includes("шкаф") || value.includes("cabinet")) return "Шкафы";
  if (value.includes("пуф") || value.includes("банкет")) return "Пуфы и банкетки";
  if (value.includes("комод")) return "Комоды";
  if (value.includes("консол")) return "Консоли";
  if (value.includes("стол") || value.includes("table")) return "Столы";
  return "Мебель";
}

function dimensions(name: string) {
  const match = name.match(/(\d+(?:[.,]\d+)?)\s*[xх×]\s*(\d+(?:[.,]\d+)?)\s*[xх×]\s*(\d+(?:[.,]\d+)?)/i);
  const number = (value?: string) => value ? Number(value.replace(",", ".")) : null;
  return { widthCm: number(match?.[1]), depthCm: number(match?.[2]), heightCm: number(match?.[3]) };
}

function identifier(sourceUrl: string) {
  const path = new URL(sourceUrl).pathname.replace(/\/$/, "");
  const last = decodeURIComponent(path.split("/").pop() ?? "");
  const match = last.match(/(?:--?)([a-z]?\d{2,})$/i);
  if (match) return match[1].toUpperCase();
  let hash = 2166136261;
  for (const char of path) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return `WEB-${(hash >>> 0).toString(36).toUpperCase()}`;
}

export function parseFurnitureSitemap(xml: string): SitemapProduct[] {
  const result = new Map<string, SitemapProduct>();
  for (const match of xml.matchAll(/<url(?:\s[^>]*)?>([\s\S]*?)<\/url>/gi)) {
    const block = match[1];
    const sourceUrl = safeHttpsUrl(tag(block, "loc"));
    const imageBlocks = [...block.matchAll(/<image:image(?:\s[^>]*)?>([\s\S]*?)<\/image:image>/gi)].map(item => item[1]);
    const imageUrls = imageBlocks.map(item => safeHttpsUrl(tag(item, "image:loc"))).filter(Boolean);
    const name = tag(imageBlocks[0] ?? "", "image:title") || tag(imageBlocks[0] ?? "", "image:caption");
    if (!sourceUrl || !name || imageUrls.length === 0 || !furnitureTerms.test(name.toLowerCase())) continue;
    const externalId = identifier(sourceUrl);
    result.set(externalId, { externalId, sku: `HUGGE-${externalId}`, name: name.slice(0, 160), category: categoryFor(name), sourceUrl, imageUrls: [...new Set(imageUrls)].slice(0, 12), sourceUpdatedAt: tag(block, "lastmod") || null, ...dimensions(name) });
  }
  return [...result.values()];
}

export function validatedCatalogSource(websiteUrl: string | null, sourceUrl: string | null) {
  if (!websiteUrl || !sourceUrl) return null;
  try {
    const website = new URL(websiteUrl); const source = new URL(sourceUrl);
    if (website.protocol !== "https:" || source.protocol !== "https:" || website.hostname !== source.hostname) return null;
    if (/^(localhost|127\.|10\.|192\.168\.|169\.254\.|0\.)/i.test(source.hostname)) return null;
    return source;
  } catch { return null; }
}

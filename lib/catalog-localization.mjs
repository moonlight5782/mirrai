import { translate } from "./i18n.mjs";
import { catalogRows } from "./translations-catalog.mjs";

// Share links may already contain a translated label. Resolve its canonical key
// before translating again, so changing RO → EN in the viewer remains reliable.
const canonical = new Map(catalogRows.trim().split("\n").flatMap(row => {
  const [ru, ro, en] = row.split("|");
  return [[ru, ru], [ro, ru], [en, ru]];
}));
export function catalogText(locale, value) {
  if (typeof value !== "string") return value;
  return translate(locale, canonical.get(value) || value);
}
/** Presentation-only copy: identifiers, URLs, dimensions and colors are untouched. */
export function localizeCatalogItem(item, locale) {
  const label = value => catalogText(locale, value);
  return {
    ...item,
    name: label(item.name),
    material: label(item.material),
    price: label(item.price),
    variants: (item.variants || []).map(variant => ({
      ...variant,
      name: label(variant.name),
      colorName: label(variant.colorName),
      material: label(variant.material),
    })),
  };
}

/** Replace a catalogue colour without appending it twice when it already matches. */
export function productNameForVariant(name, colorName) {
  const translatedColor = /\b(gri|verde|alb|negru|grey|green|white|black)(?=,|$)/iu;
  if (translatedColor.test(name)) return name.replace(translatedColor, () => colorName.toLowerCase());
  const catalogueColor = /(серый|зел[её]ный|белый|ч[её]рный)\s+цвет/iu;
  return catalogueColor.test(name)
    ? name.replace(catalogueColor, () => `${colorName} цвет`)
    : `${name} — ${colorName}`;
}

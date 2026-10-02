/** Replace a catalogue colour without appending it twice when it already matches. */
export function productNameForVariant(name, colorName) {
  const catalogueColor = /(серый|зел[её]ный|белый|ч[её]рный)\s+цвет/iu;
  return catalogueColor.test(name)
    ? name.replace(catalogueColor, () => `${colorName} цвет`)
    : `${name} — ${colorName}`;
}

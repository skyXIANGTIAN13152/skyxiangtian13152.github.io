// Preserve the original floor triangles and material sides. The east bookcase
// asset contains a floor infill as well as tall furniture: only its three
// floor materials support walking, including the narrow material_4 seam.
export function isOriginalFloorSurface(path, hidden = false, materialPath = '') {
  if (hidden) return false;
  if (/\/dm65_main_(?:ground001|cellardoor001)\.gim$/.test(path)) return true;
  const material = (materialPath || '').replaceAll('\\', '/').toLowerCase();
  return path.endsWith('/dm65_main_hidden002a.gim')
    && /\/dm65_main_hidden002a\.mtg#material_[234]$/.test(material);
}

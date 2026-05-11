export function allSpotsFound(found, total) {
  if (found.length !== total) return false;
  const set = new Set(found);
  for (let i = 0; i < total; i += 1) {
    if (!set.has(i)) return false;
  }
  return true;
}

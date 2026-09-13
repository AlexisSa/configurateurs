/** Mode iframe Oxatis : ?embed=1 masque le chrome hub et active resize. */
export function isEmbedModeFromSearch(searchParams: URLSearchParams): boolean {
  const value = searchParams.get("embed");
  return value === "1" || value === "true";
}

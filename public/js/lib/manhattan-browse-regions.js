/**
 * Manhattan browse map: region keys match challenge `areaLabel` text (from create flow / geocoder).
 * Matching is substring-based on normalized labels — tune keywords as your hunt labels evolve.
 */

export const MANHATTAN_BROWSE_REGIONS = [
  {
    key: "inwood-heights",
    label: "Inwood & Washington Heights",
    keywords: [
      "inwood",
      "washington heights",
      "fort george",
      "hamilton heights",
      "hudson heights",
    ],
  },
  {
    key: "harlem-east",
    label: "East Harlem",
    keywords: [
      "east harlem",
      "spanish harlem",
      "central harlem",
      "marcus garvey",
    ],
  },
  {
    key: "harlem-west",
    label: "West Harlem & Morningside",
    keywords: ["west harlem", "morningside", "manhattanville", "sugar hill"],
  },
  {
    key: "upper-west",
    label: "Upper West Side",
    keywords: [
      "upper west",
      "uws",
      "lincoln square",
      "manhattan valley",
    ],
  },
  {
    key: "upper-east",
    label: "Upper East Side",
    keywords: [
      "upper east",
      "ues",
      "yorkville",
      "lenox hill",
      "carnegie hill",
    ],
  },
  {
    key: "midtown-west",
    label: "Midtown West",
    keywords: [
      "midtown west",
      "garment district",
      "hudson yards",
      "columbus circle",
    ],
  },
  {
    key: "midtown-east",
    label: "Midtown East",
    keywords: [
      "midtown east",
      "turtle bay",
      "murray hill",
      "kips bay",
      "sutton place",
    ],
  },
  {
    key: "hells-kitchen",
    label: "Hell's Kitchen",
    keywords: ["hell's kitchen", "hells kitchen", "clinton"],
  },
  {
    key: "murray-hill",
    label: "Murray Hill & Kips Bay",
    keywords: ["murray hill", "kips bay"],
  },
  {
    key: "times-square",
    label: "Times Square & Theater District",
    keywords: ["times square", "theater district", "broadway"],
  },
  {
    key: "chelsea",
    label: "Chelsea",
    keywords: ["chelsea", "flatiron district", "flower district"],
  },
  {
    key: "flatiron-gramercy",
    label: "Flatiron & Gramercy",
    keywords: [
      "flatiron",
      "gramercy",
      "union square",
      "nomad",
      "rose hill",
    ],
  },
  {
    key: "east-village",
    label: "East Village",
    keywords: ["east village", "alphabet city", "stuyvesant town"],
  },
  {
    key: "lower-east",
    label: "Lower East Side",
    keywords: ["lower east", "les", "orchard", "ludlow"],
  },
  {
    key: "soho-nolita",
    label: "SoHo & NoLita",
    keywords: ["soho", "nolita", "little italy", "chinatown border"],
  },
  {
    key: "tribeca-civic",
    label: "Tribeca & Civic Center",
    keywords: ["tribeca", "civic center", "city hall", "courthouse"],
  },
  {
    key: "financial-west",
    label: "Financial District (west)",
    keywords: ["financial district", "wall street", "fidi", "world trade", "wtc"],
  },
  {
    key: "financial-east",
    label: "Financial District (east) & Seaport",
    keywords: ["seaport", "south street seaport", "financial district east"],
  },
  {
    key: "battery-park-city",
    label: "Battery Park City",
    keywords: ["battery park city", "bpc", "the battery"],
  },
  {
    key: "chinatown-civic",
    label: "Chinatown & Two Bridges",
    keywords: ["chinatown", "two bridges", "lower east side chinatown"],
  },
  {
    key: "battery-tip",
    label: "Battery & South Ferry",
    keywords: ["battery park", "the battery", "south ferry", "whitehall"],
  },
];

const REGION_MAP = new Map(MANHATTAN_BROWSE_REGIONS.map((r) => [r.key, r]));

export function getBrowseRegionLabel(key) {
  if (!key) return "";
  return REGION_MAP.get(key)?.label || key;
}

function normalizeAreaLabel(raw) {
  return String(raw || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/,\s*manhattan.*$/i, "")
    .replace(/,\s*nyc.*$/i, "")
    .replace(/,\s*new york.*$/i, "")
    .trim();
}

/**
 * True if this challenge's area string plausibly belongs to the selected map region.
 */
export function challengeMatchesBrowseRegion(areaLabel, regionKey) {
  if (!regionKey) return true;
  const def = REGION_MAP.get(regionKey);
  if (!def) return true;
  const norm = normalizeAreaLabel(areaLabel);
  if (!norm) return false;
  return def.keywords.some((kw) => norm.includes(kw));
}

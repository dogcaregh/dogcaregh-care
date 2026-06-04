// Known Accra neighbourhoods with approximate centre coordinates.
// These cover the areas in the datalist so Nominatim is rarely needed.
export const AREA_COORDS: Record<string, [number, number]> = {
  "Abeka":               [5.5944, -0.2419],
  "Abelemkpe":           [5.5778, -0.2048],
  "Ablekuma":            [5.5561, -0.2642],
  "Abokobi":             [5.7003, -0.2040],
  "Accra New Town":      [5.5694, -0.2234],
  "Achimota":            [5.6108, -0.2239],
  "Adabraka":            [5.5528, -0.2192],
  "Adenta":              [5.7043, -0.1618],
  "Agbogba":             [5.6750, -0.1880],
  "Airport Residential": [5.6052, -0.1769],
  "Alajo":               [5.5778, -0.2205],
  "Amasaman":            [5.7208, -0.2533],
  "Ashaley Botwe":       [5.6636, -0.1387],
  "Ashongman":           [5.7003, -0.1967],
  "Asylum Down":         [5.5611, -0.2036],
  "Atomic Junction":     [5.6583, -0.1971],
  "Baatsonaa":           [5.6219, -0.1072],
  "Bortianor":           [5.5383, -0.3453],
  "Bubuashie":           [5.5720, -0.2420],
  "Cantonments":         [5.5766, -0.1769],
  "Chorkor":             [5.5297, -0.2639],
  "Dansoman":            [5.5500, -0.2497],
  "Darkuman":            [5.5750, -0.2561],
  "Dome":                [5.6522, -0.2330],
  "Dzorwulu":            [5.5929, -0.2005],
  "East Legon":          [5.6360, -0.1495],
  "East Legon Hills":    [5.6450, -0.1320],
  "Frafraha":            [5.6850, -0.1455],
  "Gbawe":               [5.5644, -0.3078],
  "Haatso":              [5.6458, -0.1965],
  "Kanda":               [5.5844, -0.1933],
  "Kaneshie":            [5.5617, -0.2285],
  "Kasoa":               [5.5333, -0.4167],
  "Kokomlemle":          [5.5750, -0.2078],
  "Korle Bu":            [5.5428, -0.2239],
  "Kotobabi":            [5.5814, -0.2048],
  "Kpone":               [5.6918,  0.0547],
  "Kwabenya":            [5.7166, -0.2108],
  "Kwashieman":          [5.5892, -0.2476],
  "La":                  [5.5556, -0.1636],
  "Labone":              [5.5717, -0.1715],
  "Labadi":              [5.5536, -0.1484],
  "Lakeside":            [5.6583, -0.1317],
  "Lapaz":               [5.6028, -0.2409],
  "Lashibi":             [5.6417,  0.0011],
  "Laterbiokoshie":      [5.5672, -0.2313],
  "Legon":               [5.6502, -0.1869],
  "Maamobi":             [5.5883, -0.2126],
  "Madina":              [5.6792, -0.1667],
  "Mamprobi":            [5.5447, -0.2333],
  "McCarthy Hill":       [5.5561, -0.2750],
  "Nanakrom":            [5.6961, -0.1548],
  "Nima":                [5.5775, -0.2126],
  "North Kaneshie":      [5.5666, -0.2440],
  "North Legon":         [5.6700, -0.1750],
  "Nungua":              [5.5939, -0.0856],
  "Odorkor":             [5.5728, -0.2656],
  "Ofankor":             [5.6383, -0.2703],
  "Osu":                 [5.5564, -0.1769],
  "Oyarifa":             [5.6921, -0.1548],
  "Oyibi":               [5.7500, -0.1183],
  "Pantang":             [5.7208, -0.1617],
  "Pokuase":             [5.7028, -0.2680],
  "Prampram":            [5.7083,  0.1167],
  "Ridge":               [5.5686, -0.2006],
  "Roman Ridge":         [5.5978, -0.1769],
  "Sakumono":            [5.6167, -0.0167],
  "Shiashie":            [5.6222, -0.1648],
  "Sowutuom":            [5.6022, -0.2542],
  "Spintex":             [5.6326, -0.1118],
  "Taifa":               [5.6297, -0.2362],
  "Tema":                [5.6698,  0.0166],
  "Tesano":              [5.6036, -0.2276],
  "Teshie":              [5.5840, -0.1136],
  "Trasacco Valley":     [5.6411, -0.1609],
  "Weija":               [5.5483, -0.3256],
  "West Legon":          [5.6183, -0.2010],
};

export const ACCRA_AREAS = Object.keys(AREA_COORDS);

export function lookupCoords(area: string): { lat: number; lng: number } | null {
  const key = Object.keys(AREA_COORDS).find(
    k => k.toLowerCase() === area.toLowerCase().trim()
  );
  if (!key) return null;
  const [lat, lng] = AREA_COORDS[key];
  return { lat, lng };
}

// Nominatim fallback for areas not in the lookup table.
export async function geocodeArea(area: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const q = encodeURIComponent(`${area.trim()}, Accra, Ghana`);
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`
    );
    const data = await res.json() as Array<{ lat: string; lon: string }>;
    if (!data[0]) return null;
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch {
    return null;
  }
}

// Lookup table first, Nominatim fallback.
export async function resolveCoords(area: string): Promise<{ lat: number; lng: number } | null> {
  if (!area.trim()) return null;
  return lookupCoords(area) ?? geocodeArea(area);
}

// Haversine distance in km.
export function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const toRad = (d: number) => d * (Math.PI / 180);
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Composite ranking score (higher = better).
 * With distance: 50% proximity, 35% rating, 15% review volume.
 * Without distance: 70% rating, 30% review volume.
 */
export function rankScore(distKm: number | null, rating: number, reviewCount: number): number {
  const ratingScore = (rating || 0) / 5;
  const reviewScore = Math.min(Math.log((reviewCount || 0) + 1) / Math.log(50), 1);
  if (distKm !== null) {
    const distScore = 1 / (1 + distKm / 5);
    return distScore * 0.5 + ratingScore * 0.35 + reviewScore * 0.15;
  }
  return ratingScore * 0.7 + reviewScore * 0.3;
}

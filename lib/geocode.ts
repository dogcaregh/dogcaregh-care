// Known Accra neighbourhoods with approximate centre coordinates.
// These cover the areas in the datalist so Nominatim is rarely needed.
const AREA_COORDS: Record<string, [number, number]> = {
  "Achimota":            [5.6108, -0.2239],
  "Adenta":              [5.7043, -0.1618],
  "Airport Residential": [5.6052, -0.1769],
  "Cantonments":         [5.5766, -0.1769],
  "Dansoman":            [5.5500, -0.2497],
  "Dome":                [5.6522, -0.2330],
  "Dzorwulu":            [5.5929, -0.2005],
  "East Legon":          [5.6360, -0.1495],
  "Haatso":              [5.6458, -0.1965],
  "Kasoa":               [5.5333, -0.4167],
  "Kotobabi":            [5.5814, -0.2048],
  "Labone":              [5.5717, -0.1715],
  "Lapaz":               [5.6028, -0.2409],
  "Legon":               [5.6502, -0.1869],
  "Madina":              [5.6792, -0.1667],
  "Nima":                [5.5775, -0.2126],
  "North Kaneshie":      [5.5666, -0.2440],
  "Osu":                 [5.5564, -0.1769],
  "Roman Ridge":         [5.5978, -0.1769],
  "Sakumono":            [5.6167, -0.0167],
  "Spintex":             [5.6326, -0.1118],
  "Tema":                [5.6698,  0.0166],
  "Tesano":              [5.6036, -0.2276],
  "Teshie":              [5.5840, -0.1136],
  "Trasacco Valley":     [5.6411, -0.1609],
};

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

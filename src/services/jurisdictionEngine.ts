// NexCivic Point-In-Polygon Geo Boundary Engine (Sprint 8.1)

export interface JurisdictionResult {
  state: string;
  district: string;
  ulb: string;
  ward: string;
  zone: string;
}

export type Point = [number, number]; // [lng, lat]
export type Polygon = Point[];

/**
 * Point-In-Polygon (PIP) Ray-Casting Algorithm
 * Tests if a point (lng, lat) lies inside a 2D spatial polygon
 */
export function isPointInPolygon(point: Point, polygon: Polygon): boolean {
  const [x, y] = point; // x = lng, y = lat
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0], yi = polygon[i][1];
    const xj = polygon[j][0], yj = polygon[j][1];

    const intersect = ((yi > y) !== (yj > y)) &&
      (x < (xj - xi) * (y - yi) / (yj - yi) + xi);

    if (intersect) inside = !inside;
  }

  return inside;
}

// Sample Municipal GeoJSON Boundary Polygons (Telangana & Andhra Pradesh Municipal Zones)
const HYDERABAD_ZONE: Polygon = [
  [78.35, 17.30], [78.60, 17.30], [78.60, 17.55], [78.35, 17.55], [78.35, 17.30]
];

const VIZAG_ZONE: Polygon = [
  [83.15, 17.60], [83.40, 17.60], [83.40, 17.85], [83.15, 17.85], [83.15, 17.60]
];

const VIZIANAGARAM_ZONE: Polygon = [
  [83.35, 18.05], [83.50, 18.05], [83.50, 18.20], [83.35, 18.20], [83.35, 18.05]
];

/**
 * Resolves jurisdiction (State, District, ULB, Ward, Zone) using Point-In-Polygon ray-casting
 */
export function determineJurisdiction(latitude: number, longitude: number): JurisdictionResult {
  const pt: Point = [longitude, latitude];

  if (isPointInPolygon(pt, HYDERABAD_ZONE)) {
    const wardNum = Math.floor(Math.abs(latitude * 100) % 25) + 1;
    return {
      state: "Telangana",
      district: "Hyderabad",
      ulb: "Greater Hyderabad Municipal Corporation (GHMC)",
      ward: `Ward ${wardNum}`,
      zone: "South-Central Zone"
    };
  }

  if (isPointInPolygon(pt, VIZAG_ZONE)) {
    const wardNum = Math.floor(Math.abs(latitude * 100) % 30) + 1;
    return {
      state: "Andhra Pradesh",
      district: "Visakhapatnam",
      ulb: "Greater Visakhapatnam Municipal Corporation (GVMC)",
      ward: `Ward ${wardNum}`,
      zone: "Coastal Zone"
    };
  }

  if (isPointInPolygon(pt, VIZIANAGARAM_ZONE)) {
    const wardNum = Math.floor(Math.abs(latitude * 100) % 15) + 1;
    return {
      state: "Andhra Pradesh",
      district: "Vizianagaram",
      ulb: "Vizianagaram Municipal Corporation (VMC)",
      ward: `Ward ${wardNum}`,
      zone: "North Zone"
    };
  }

  // Fallback for general coordinates in AP/Telangana region
  if (latitude >= 15.0 && latitude <= 19.5 && longitude >= 77.0 && longitude <= 84.5) {
    const isTelangana = latitude < 18.0 && longitude < 80.0;
    return {
      state: isTelangana ? "Telangana" : "Andhra Pradesh",
      district: isTelangana ? "Hyderabad" : "Visakhapatnam",
      ulb: isTelangana ? "GHMC" : "GVMC",
      ward: "Ward 12",
      zone: "Central Zone"
    };
  }

  return {
    state: "Telangana",
    district: "Hyderabad",
    ulb: "GHMC",
    ward: "Ward 01",
    zone: "Default Zone"
  };
}

// NexCivic Swappable Route Provider Architecture (Sprint 8.1)
import { Issue } from "../types";
import { getHaversineDistanceKm } from "./heatmapEngine";

export interface WaypointStop {
  stopOrder: number;
  issue: Partial<Issue>;
  distanceFromPreviousKm: number;
  estimatedTravelTimeMins: number;
  cumulativeDistanceKm: number;
}

export interface RouteOptimizationResult {
  orderedStops: WaypointStop[];
  totalDistanceKm: number;
  totalEstimatedTimeMins: number;
  providerName: string;
}

export interface IRouteProvider {
  name: string;
  optimizeRoute(
    startLocation: { latitude: number; longitude: number }, 
    waypoints: Partial<Issue>[]
  ): Promise<RouteOptimizationResult>;
}

/**
 * Nearest-Neighbor TSP Route Provider (Default Haversine Distance Matrix)
 */
export class NearestNeighbourRouteProvider implements IRouteProvider {
  public name = "Nearest-Neighbor Spatial TSP Engine";

  public async optimizeRoute(
    startLocation: { latitude: number; longitude: number }, 
    waypoints: Partial<Issue>[]
  ): Promise<RouteOptimizationResult> {
    const validWaypoints = waypoints.filter((w) => typeof w.latitude === "number" && typeof w.longitude === "number");
    if (validWaypoints.length === 0) {
      return {
        orderedStops: [],
        totalDistanceKm: 0,
        totalEstimatedTimeMins: 0,
        providerName: this.name
      };
    }

    const unvisited = [...validWaypoints];
    const orderedStops: WaypointStop[] = [];

    let currentLat = startLocation.latitude;
    let currentLng = startLocation.longitude;
    let cumulativeDistance = 0;
    let totalMinutes = 0;
    let stopOrder = 1;

    while (unvisited.length > 0) {
      let nearestIdx = 0;
      let minDistance = Infinity;

      for (let i = 0; i < unvisited.length; i++) {
        const wp = unvisited[i];
        const dist = getHaversineDistanceKm(currentLat, currentLng, wp.latitude!, wp.longitude!);
        if (dist < minDistance) {
          minDistance = dist;
          nearestIdx = i;
        }
      }

      const nextStop = unvisited.splice(nearestIdx, 1)[0];
      const distFromPrev = Math.round(minDistance * 10) / 10;
      const travelMins = Math.round(distFromPrev * 3); // ~20 km/h urban speed -> 3 mins/km

      cumulativeDistance += distFromPrev;
      totalMinutes += travelMins + 15; // 15 mins inspection per stop

      orderedStops.push({
        stopOrder: stopOrder++,
        issue: nextStop,
        distanceFromPreviousKm: distFromPrev,
        estimatedTravelTimeMins: travelMins,
        cumulativeDistanceKm: Math.round(cumulativeDistance * 10) / 10
      });

      currentLat = nextStop.latitude!;
      currentLng = nextStop.longitude!;
    }

    return {
      orderedStops,
      totalDistanceKm: Math.round(cumulativeDistance * 10) / 10,
      totalEstimatedTimeMins: totalMinutes,
      providerName: this.name
    };
  }
}

// Active Route Provider Instance (Swappable for Google Directions / Mapbox / OSRM)
export let currentRouteProvider: IRouteProvider = new NearestNeighbourRouteProvider();

export function setRouteProvider(provider: IRouteProvider): void {
  currentRouteProvider = provider;
  console.log(`[RouteOptimizer] Swapped active route provider to: ${provider.name}`);
}

export async function optimizeInspectionRoute(
  startLocation: { latitude: number; longitude: number }, 
  assignedIssues: Partial<Issue>[]
): Promise<RouteOptimizationResult> {
  return currentRouteProvider.optimizeRoute(startLocation, assignedIssues);
}

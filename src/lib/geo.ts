/** Place lookup (Nominatim, cached) and local birth time → UTC. */
import { find } from "geo-tz";

export type GeoPlace = {
  displayName: string;
  latitude: number;
  longitude: number;
  timezone: string;
};

type NominatimHit = {
  display_name: string;
  lat: string;
  lon: string;
};

const geoCache = new Map<string, GeoPlace>();

export async function geocodePlace(place: string): Promise<GeoPlace> {
  const key = place.trim().toLowerCase();
  const cached = geoCache.get(key);
  if (cached) return cached;

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", place);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");

  const res = await fetch(url, {
    headers: {
      "User-Agent": "DestinyAI/1.0 (natal chart predictions)",
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(8000),
  });

  if (!res.ok) {
    throw new Error("Could not look up the birth place. Try a city and country, for example: Pune, India.");
  }

  const hits = (await res.json()) as NominatimHit[];
  if (!hits.length) {
    throw new Error(`No location found for "${place}". Add the country or a nearby city.`);
  }

  const latitude = Number(hits[0].lat);
  const longitude = Number(hits[0].lon);
  const zones = find(latitude, longitude);
  const timezone = zones[0] ?? "UTC";

  const result = {
    displayName: hits[0].display_name,
    latitude,
    longitude,
    timezone,
  };
  geoCache.set(key, result);
  return result;
}

export function zonedCivilToUtc(
  date: string,
  time: string,
  timeZone: string,
): Date {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));

  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hourCycle: "h23",
  });

  const asRecord = (d: Date) => {
    const parts = dtf.formatToParts(d);
    const map: Record<string, string> = {};
    for (const p of parts) {
      if (p.type !== "literal") map[p.type] = p.value;
    }
    return map;
  };

  const parts = asRecord(utc);
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  const offset = asUtc - utc.getTime();
  return new Date(utc.getTime() - offset);
}

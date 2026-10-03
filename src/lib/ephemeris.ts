import {
  Body,
  Ecliptic,
  GeoVector,
  MakeTime,
  SiderealTime,
  type FlexibleDateTime,
} from "astronomy-engine";
import { PLANETS, type Planet } from "./constants";

export function julianDay(date: Date): number {
  return date.getTime() / 86400000 + 2440587.5;
}

/** Lahiri (Chitrapaksha) ayanamsa approximation. */
export function lahiriAyanamsa(date: Date): number {
  const t = (julianDay(date) - 2451545.0) / 36525;
  return (23 + 51 / 60 + 11.18 / 3600) + (1.396971278 * t) - (0.0003086 * t * t);
}

export function norm360(deg: number): number {
  const x = deg % 360;
  return x < 0 ? x + 360 : x;
}

function tropicalLongitude(body: Body, date: Date): number {
  const time = MakeTime(date as FlexibleDateTime);
  const vec = GeoVector(body, time, true);
  return norm360(Ecliptic(vec).elon);
}

function meanNorthNode(date: Date): number {
  const T = (julianDay(date) - 2451545.0) / 36525;
  const omega =
    125.0445479 -
    1934.1362891 * T +
    0.0020754 * T * T +
    T * T * T / 467441 -
    T * T * T * T / 60616000;
  return norm360(omega);
}

const BODY_MAP: Partial<Record<Planet, Body>> = {
  Sun: Body.Sun,
  Moon: Body.Moon,
  Mercury: Body.Mercury,
  Venus: Body.Venus,
  Mars: Body.Mars,
  Jupiter: Body.Jupiter,
  Saturn: Body.Saturn,
};

export function tropicalLongitudes(date: Date): Record<Planet, number> {
  const result = {} as Record<Planet, number>;
  for (const planet of PLANETS) {
    if (planet === "Rahu") {
      result.Rahu = meanNorthNode(date);
    } else if (planet === "Ketu") {
      result.Ketu = norm360(meanNorthNode(date) + 180);
    } else {
      result[planet] = tropicalLongitude(BODY_MAP[planet] as Body, date);
    }
  }
  return result;
}

export function siderealLongitudes(date: Date): Record<Planet, number> {
  const ayan = lahiriAyanamsa(date);
  const trop = tropicalLongitudes(date);
  const result = {} as Record<Planet, number>;
  for (const planet of PLANETS) {
    result[planet] = norm360(trop[planet] - ayan);
  }
  return result;
}

/** Tropical ascendant in degrees. */
export function tropicalAscendant(date: Date, latitude: number, longitude: number): number {
  const time = MakeTime(date as FlexibleDateTime);
  const gstHours = SiderealTime(time);
  const lstHours = gstHours + longitude / 15;
  const ramc = norm360(lstHours * 15) * (Math.PI / 180);
  const lat = latitude * (Math.PI / 180);
  const jd = julianDay(date);
  const T = (jd - 2451545.0) / 36525;
  const eps =
    ((23.4392911 - 0.0130042 * T - 1.64e-7 * T * T + 5.04e-7 * T * T * T) * Math.PI) /
    180;

  const y = Math.cos(ramc);
  const x = -(Math.sin(ramc) * Math.cos(eps) + Math.tan(lat) * Math.sin(eps));
  let asc = Math.atan2(y, x) * (180 / Math.PI);
  return norm360(asc);
}

export function siderealAscendant(date: Date, latitude: number, longitude: number): number {
  return norm360(tropicalAscendant(date, latitude, longitude) - lahiriAyanamsa(date));
}

import {
  DEBILITATION,
  EXALTATION,
  NAKSHATRA_SPAN,
  NAKSHATRAS,
  PADA_SPAN,
  PLANETS,
  SIGN_LORDS,
  SIGNS,
  type Planet,
  type Sign,
} from "./constants";
import { siderealAscendant, siderealLongitudes } from "./ephemeris";

export type PlanetPlacement = {
  planet: Planet;
  longitude: number;
  sign: Sign;
  signIndex: number;
  degreeInSign: number;
  house: number;
  nakshatra: string;
  pada: number;
  nakshatraLord: Planet;
  dignity: "exalted" | "debilitated" | "own" | "neutral";
};

export type NatalChart = {
  utcBirth: string;
  placeName: string;
  latitude: number;
  longitude: number;
  timezone: string;
  ayanamsaNote: string;
  lagna: Sign;
  lagnaDegree: number;
  moonSign: Sign;
  sunSign: Sign;
  birthNakshatra: string;
  birthPada: number;
  planets: PlanetPlacement[];
  timeAssumed: boolean;
};

function signFromLong(long: number): { sign: Sign; signIndex: number; degreeInSign: number } {
  const signIndex = Math.floor(long / 30) % 12;
  return {
    sign: SIGNS[signIndex],
    signIndex,
    degreeInSign: long - signIndex * 30,
  };
}

function nakshatraFromLong(long: number) {
  const idx = Math.floor(long / NAKSHATRA_SPAN) % 27;
  const pos = long % NAKSHATRA_SPAN;
  const pada = Math.floor(pos / PADA_SPAN) + 1;
  const n = NAKSHATRAS[idx];
  return { name: n.name, lord: n.lord as Planet, pada };
}

function dignity(planet: Planet, sign: Sign): PlanetPlacement["dignity"] {
  if (EXALTATION[planet] === sign) return "exalted";
  if (DEBILITATION[planet] === sign) return "debilitated";
  const own: Partial<Record<Planet, Sign[]>> = {
    Sun: ["Leo"],
    Moon: ["Cancer"],
    Mercury: ["Gemini", "Virgo"],
    Venus: ["Taurus", "Libra"],
    Mars: ["Aries", "Scorpio"],
    Jupiter: ["Sagittarius", "Pisces"],
    Saturn: ["Capricorn", "Aquarius"],
  };
  if (own[planet]?.includes(sign)) return "own";
  return "neutral";
}

export function houseOf(planetSignIndex: number, lagnaIndex: number): number {
  return ((planetSignIndex - lagnaIndex + 12) % 12) + 1;
}

export function buildNatalChart(input: {
  utcBirth: Date;
  placeName: string;
  latitude: number;
  longitude: number;
  timezone: string;
  timeAssumed: boolean;
}): NatalChart {
  const longs = siderealLongitudes(input.utcBirth);
  const asc = siderealAscendant(input.utcBirth, input.latitude, input.longitude);
  const lagna = signFromLong(asc);
  const planets: PlanetPlacement[] = PLANETS.map((planet) => {
    const longitude = longs[planet];
    const s = signFromLong(longitude);
    const n = nakshatraFromLong(longitude);
    return {
      planet,
      longitude,
      sign: s.sign,
      signIndex: s.signIndex,
      degreeInSign: s.degreeInSign,
      house: houseOf(s.signIndex, lagna.signIndex),
      nakshatra: n.name,
      pada: n.pada,
      nakshatraLord: n.lord,
      dignity: dignity(planet, s.sign),
    };
  });

  const moon = planets.find((p) => p.planet === "Moon")!;
  const sun = planets.find((p) => p.planet === "Sun")!;

  return {
    utcBirth: input.utcBirth.toISOString(),
    placeName: input.placeName,
    latitude: input.latitude,
    longitude: input.longitude,
    timezone: input.timezone,
    ayanamsaNote: "Sidereal (Lahiri) zodiac with whole-sign houses",
    lagna: lagna.sign,
    lagnaDegree: lagna.degreeInSign,
    moonSign: moon.sign,
    sunSign: sun.sign,
    birthNakshatra: moon.nakshatra,
    birthPada: moon.pada,
    planets,
    timeAssumed: input.timeAssumed,
  };
}

export function planetInHouse(chart: NatalChart, planet: Planet): PlanetPlacement {
  return chart.planets.find((p) => p.planet === planet)!;
}

export function lordOfHouse(chart: NatalChart, house: number): Planet {
  const idx = (SIGNS.indexOf(chart.lagna) + house - 1) % 12;
  return SIGN_LORDS[SIGNS[idx]];
}

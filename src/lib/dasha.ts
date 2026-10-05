/** Vimshottari mahadasha and antardasha timeline from the Moon's nakshatra. */
import { DASHA_ORDER, DASHA_YEARS, NAKSHATRA_SPAN, type Planet } from "./constants";

const MS_PER_YEAR = 365.2425 * 24 * 3600 * 1000;

export type DashaPeriod = {
  lord: Planet;
  start: Date;
  end: Date;
};

export type DashaTimeline = {
  mahadashas: DashaPeriod[];
  currentMaha: DashaPeriod;
  previousMaha: DashaPeriod | null;
  nextMaha: DashaPeriod | null;
  currentAntar: DashaPeriod;
  previousAntar: DashaPeriod | null;
  nextAntar: DashaPeriod | null;
};

function addYears(date: Date, years: number): Date {
  return new Date(date.getTime() + years * MS_PER_YEAR);
}

function remainingMoonDasha(moonSiderealLong: number): { lord: Planet; balanceYears: number } {
  const idx = Math.floor(moonSiderealLong / NAKSHATRA_SPAN) % 27;
  const pos = moonSiderealLong % NAKSHATRA_SPAN;
  const fractionLeft = 1 - pos / NAKSHATRA_SPAN;
  const lord = DASHA_ORDER[idx % 9];
  return { lord, balanceYears: DASHA_YEARS[lord] * fractionLeft };
}

export function buildMahadashas(birth: Date, moonSiderealLong: number): DashaPeriod[] {
  const { lord, balanceYears } = remainingMoonDasha(moonSiderealLong);
  const startIndex = DASHA_ORDER.indexOf(lord);
  const periods: DashaPeriod[] = [];
  let cursor = new Date(birth);

  periods.push({
    lord,
    start: new Date(cursor),
    end: addYears(cursor, balanceYears),
  });
  cursor = periods[0].end;

  for (let i = 1; i < 18; i++) {
    const nextLord = DASHA_ORDER[(startIndex + i) % 9];
    const end = addYears(cursor, DASHA_YEARS[nextLord]);
    periods.push({ lord: nextLord, start: new Date(cursor), end });
    cursor = end;
  }
  return periods;
}

export function antardashas(maha: DashaPeriod): DashaPeriod[] {
  const startIndex = DASHA_ORDER.indexOf(maha.lord);
  const totalYears = (maha.end.getTime() - maha.start.getTime()) / MS_PER_YEAR;
  const periods: DashaPeriod[] = [];
  let cursor = new Date(maha.start);

  for (let i = 0; i < 9; i++) {
    const lord = DASHA_ORDER[(startIndex + i) % 9];
    const span = (DASHA_YEARS[lord] / 120) * totalYears;
    const end = addYears(cursor, span);
    periods.push({ lord, start: new Date(cursor), end });
    cursor = end;
  }

  periods[periods.length - 1].end = new Date(maha.end);
  return periods;
}

export function dashaAt(birth: Date, moonSiderealLong: number, when: Date): DashaTimeline {
  const mahadashas = buildMahadashas(birth, moonSiderealLong);
  const idx = mahadashas.findIndex((p) => when >= p.start && when < p.end);
  const safeIdx = idx >= 0 ? idx : mahadashas.length - 1;
  const currentMaha = mahadashas[safeIdx];
  const antars = antardashas(currentMaha);
  const aIdx = antars.findIndex((p) => when >= p.start && when < p.end);
  const safeA = aIdx >= 0 ? aIdx : antars.length - 1;

  return {
    mahadashas,
    currentMaha,
    previousMaha: mahadashas[safeIdx - 1] ?? null,
    nextMaha: mahadashas[safeIdx + 1] ?? null,
    currentAntar: antars[safeA],
    previousAntar: antars[safeA - 1] ?? null,
    nextAntar: antars[safeA + 1] ?? null,
  };
}

export function fmtDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Compact chart facts, Ollama prompt, and Past/Present/Future section parser. */
import { HOUSE_THEMES, SIGNS, type Planet } from "./constants";
import { houseOf, lordOfHouse, planetInHouse, type NatalChart } from "./chart";
import { dashaAt, fmtDate } from "./dasha";
import { siderealLongitudes } from "./ephemeris";

function periodSpan(start: Date, end: Date): string {
  return `${fmtDate(start)} to ${fmtDate(end)}`;
}

function sadeSati(moonSignIndex: number, saturnSignIndex: number): "approaching" | "peak" | "leaving" | "none" {
  const rel = (saturnSignIndex - moonSignIndex + 12) % 12;
  if (rel === 11) return "approaching";
  if (rel === 0) return "peak";
  if (rel === 1) return "leaving";
  return "none";
}

export function transitLines(chart: NatalChart, now: Date): string[] {
  const longs = siderealLongitudes(now);
  const lagnaIndex = SIGNS.indexOf(chart.lagna);
  const moonIndex = SIGNS.indexOf(chart.moonSign);
  const lines: string[] = [];
  const interesting: Planet[] = ["Jupiter", "Saturn", "Rahu", "Mars"];
  for (const planet of interesting) {
    const signIndex = Math.floor(longs[planet] / 30) % 12;
    const house = houseOf(signIndex, lagnaIndex);
    lines.push(
      `Transit ${planet} is in ${SIGNS[signIndex]}, activating natal house ${house} (${HOUSE_THEMES[house]}).`,
    );
  }
  const satIdx = Math.floor(longs.Saturn / 30) % 12;
  const ss = sadeSati(moonIndex, satIdx);
  if (ss === "approaching") {
    lines.push("Sade Sati beginning: Saturn is in the sign before the natal Moon.");
  } else if (ss === "peak") {
    lines.push("Peak Sade Sati: Saturn is in the natal Moon sign.");
  } else if (ss === "leaving") {
    lines.push("Sade Sati closing: Saturn is in the sign after the natal Moon.");
  }
  return lines;
}

export type ChartContext = {
  person: string;
  facts: string;
  llmFacts: string;
  dasha: {
    currentMaha: string;
    currentAntar: string;
    previousMaha: string | null;
    nextMaha: string | null;
  };
  transits: string[];
};

export function buildChartContext(chart: NatalChart, name: string | undefined, now = new Date()): ChartContext {
  const person = (name ?? "").trim() || "the native";
  const moon = planetInHouse(chart, "Moon");
  const dasha = dashaAt(new Date(chart.utcBirth), moon.longitude, now);
  const transits = transitLines(chart, now);
  const planetBlock = chart.planets
    .map((p) => `${p.planet} ${p.sign} h${p.house} ${p.nakshatra}p${p.pada}`)
    .join(" | ");

  const houseLords = [1, 4, 7, 9, 10]
    .map((h) => {
      const lord = lordOfHouse(chart, h);
      const pos = planetInHouse(chart, lord);
      return `H${h}:${lord}@H${pos.house} ${pos.sign}`;
    })
    .join("; ");

  const dashaBlock = [
    `MD ${dasha.currentMaha.lord} ${periodSpan(dasha.currentMaha.start, dasha.currentMaha.end)}`,
    `AD ${dasha.currentAntar.lord} ${periodSpan(dasha.currentAntar.start, dasha.currentAntar.end)}`,
    dasha.previousMaha
      ? `Prev MD ${dasha.previousMaha.lord} ${periodSpan(dasha.previousMaha.start, dasha.previousMaha.end)}`
      : "First MD of life",
    dasha.nextAntar ? `Next AD ${dasha.nextAntar.lord} ${fmtDate(dasha.nextAntar.start)}` : "",
    dasha.nextMaha ? `Next MD ${dasha.nextMaha.lord} ${fmtDate(dasha.nextMaha.start)}-${fmtDate(dasha.nextMaha.end)}` : "",
  ]
    .filter(Boolean)
    .join(" | ");

  const transitShort = transits.join("; ");

  const llmFacts = [
    `${person} | ${chart.lagna} lagna | Sun ${chart.sunSign} | Moon ${chart.moonSign} ${chart.birthNakshatra} p${chart.birthPada}`,
    chart.timeAssumed ? "Time unknown (noon assumed)" : "",
    planetBlock,
    houseLords,
    dashaBlock,
    transitShort,
  ]
    .filter(Boolean)
    .join("\n");

  const facts = [
    `Name: ${person}`,
    `Place: ${chart.placeName}`,
    `Lagna: ${chart.lagna} ${chart.lagnaDegree.toFixed(2)}°`,
    `Sidereal Sun: ${chart.sunSign} | Moon: ${chart.moonSign} | Star: ${chart.birthNakshatra} pada ${chart.birthPada}`,
    `PLANETS: ${planetBlock}`,
    `HOUSE LORDS: ${houseLords}`,
    `DASHA: ${dashaBlock}`,
    `TRANSITS: ${transitShort}`,
  ].join("\n");

  return {
    person,
    facts,
    llmFacts,
    transits,
    dasha: {
      currentMaha: `${dasha.currentMaha.lord} (${periodSpan(dasha.currentMaha.start, dasha.currentMaha.end)})`,
      currentAntar: `${dasha.currentAntar.lord} (${periodSpan(dasha.currentAntar.start, dasha.currentAntar.end)})`,
      previousMaha: dasha.previousMaha
        ? `${dasha.previousMaha.lord} (${periodSpan(dasha.previousMaha.start, dasha.previousMaha.end)})`
        : null,
      nextMaha: dasha.nextMaha ? `${dasha.nextMaha.lord} from ${fmtDate(dasha.nextMaha.start)}` : null,
    },
  };
}

export const SYSTEM_PROMPT = `Vedic natal interpreter. Use ONLY the given facts. Copy dasha dates exactly. No medical/legal/financial promises. Max 350 words.
Output exactly:
--- PAST ---
One short paragraph (previous MD, Moon/star, H4/H9).
--- PRESENT ---
One short paragraph (current MD/AD, H10/H7, transits).
--- FUTURE ---
One short paragraph (remaining MD, next AD/MD, how to steer).
--- POINTS FOR IMPROVEMENT ---
5 numbered practical points tied to planets/houses.`;

export function userPrompt(facts: string): string {
  return `Write the reading from these facts:\n${facts}`;
}

export function parseLlmSections(text: string): {
  past: string;
  present: string;
  future: string;
  improvements: string[];
} {
  const grab = (label: string) => {
    const re = new RegExp(`---\\s*${label}\\s*---\\s*([\\s\\S]*?)(?=\\n---\\s*|$)`, "i");
    const m = text.match(re);
    return (m?.[1] ?? "").trim();
  };
  const past = grab("PAST");
  const present = grab("PRESENT");
  const future = grab("FUTURE");
  const improveRaw = grab("POINTS FOR IMPROVEMENT");
  const improvements = improveRaw
    .split(/\n+/)
    .map((line) => line.replace(/^\s*(?:\d+[.)]|[-*])\s*/, "").trim())
    .filter(Boolean);

  return {
    past: past || text.trim(),
    present,
    future,
    improvements,
  };
}

export function assembleFullText(header: string, llm: string): string {
  return `${header}\n\n${llm.trim()}\n\nThis reading is interpretive guidance from planetary positions and Ollama, not medical, legal, or financial advice.`;
}

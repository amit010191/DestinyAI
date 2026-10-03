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
    .map(
      (p) =>
        `${p.planet}: ${p.sign} ${p.degreeInSign.toFixed(2)}°, house ${p.house}, nakshatra ${p.nakshatra} pada ${p.pada}, dignity ${p.dignity}`,
    )
    .join("\n");

  const houseLords = [1, 4, 5, 7, 9, 10, 11]
    .map((h) => {
      const lord = lordOfHouse(chart, h);
      const pos = planetInHouse(chart, lord);
      return `House ${h} lord ${lord} is in house ${pos.house} in ${pos.sign}`;
    })
    .join("\n");

  const facts = [
    `Name: ${person}`,
    `Birth UTC: ${chart.utcBirth}`,
    `Place: ${chart.placeName}`,
    `Lat/Lon: ${chart.latitude.toFixed(4)}, ${chart.longitude.toFixed(4)}`,
    `Timezone: ${chart.timezone}`,
    `System: ${chart.ayanamsaNote}`,
    chart.timeAssumed ? "Birth time unknown; noon local time was assumed (lagna approximate)." : "Birth time was provided.",
    `Lagna: ${chart.lagna} ${chart.lagnaDegree.toFixed(2)}°`,
    `Sidereal Sun: ${chart.sunSign}`,
    `Sidereal Moon: ${chart.moonSign}`,
    `Birth star: ${chart.birthNakshatra} pada ${chart.birthPada} (nakshatra lord ${moon.nakshatraLord})`,
    ``,
    `PLANETS`,
    planetBlock,
    ``,
    `HOUSE LORDS`,
    houseLords,
    ``,
    `VIMSHOTTARI DASHA`,
    `Current mahadasha: ${dasha.currentMaha.lord} (${periodSpan(dasha.currentMaha.start, dasha.currentMaha.end)})`,
    `Current antardasha: ${dasha.currentAntar.lord} (${periodSpan(dasha.currentAntar.start, dasha.currentAntar.end)})`,
    dasha.previousMaha
      ? `Previous mahadasha: ${dasha.previousMaha.lord} (${periodSpan(dasha.previousMaha.start, dasha.previousMaha.end)})`
      : "Still in the first mahadasha of life.",
    dasha.nextAntar ? `Next antardasha: ${dasha.nextAntar.lord} from ${fmtDate(dasha.nextAntar.start)}` : "",
    dasha.nextMaha ? `Next mahadasha: ${dasha.nextMaha.lord} from ${fmtDate(dasha.nextMaha.start)} to ${fmtDate(dasha.nextMaha.end)}` : "",
    ``,
    `CURRENT TRANSITS`,
    ...transits,
  ]
    .filter((line) => line !== "")
    .join("\n");

  return {
    person,
    facts,
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

export const SYSTEM_PROMPT = `You are DestinyAI, a careful Vedic astrology interpreter.
You receive computed natal facts (Lahiri sidereal planets, whole-sign houses, nakshatras, Vimshottari dashas, current transits).
Write a reading that is specific to THESE facts. Do not invent extra planets, dates, or dashas.
Do not give medical, legal, or financial guarantees. Speak as guidance for reflection.
Write in clear English prose (not bullet dumps except the improvement list).
Keep the whole reading under 700 words.
Use this exact section layout and nothing else:

--- PAST ---
Two short paragraphs on early life and the previous mahadasha, using house lords 4 and 9 and the Moon/nakshatra.

--- PRESENT ---
Two short paragraphs on the current mahadasha and antardasha, career (10th), partnership (7th), and the listed transits. Copy dasha dates exactly from the facts.

--- FUTURE ---
Two short paragraphs on remaining dasha time, next antardasha, next mahadasha, and how the native can steer the coming years. Copy dates exactly from the facts.

--- POINTS FOR IMPROVEMENT ---
5 to 8 numbered practical points the native can use (habits, skills, relationships, work). Tie each point to a planet or house in the chart.`;

export function userPrompt(facts: string): string {
  return `Create the natal prediction from these computed facts:\n\n${facts}`;
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

import { buildNatalChart, type NatalChart } from "./chart";
import { assembleFullText, buildChartContext, parseLlmSections, SYSTEM_PROMPT, userPrompt } from "./context";
import { geocodePlace, zonedCivilToUtc } from "./geo";
import type { PredictionPayload } from "./interpret";
import { assertOllamaReady, ollamaChat, ollamaModel } from "./ollama";

export type BirthInput = {
  name?: string;
  date: string;
  time?: string;
  place: string;
  unknownTime?: boolean;
};

export function validateBirthInput(input: BirthInput): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date.trim())) {
    return "Date of birth must be YYYY-MM-DD (example: 1992-08-14).";
  }
  if (!input.unknownTime && !/^\d{2}:\d{2}$/.test((input.time ?? "").trim())) {
    return "Time of birth must be HH:MM in 24-hour format (example: 14:35), or leave it blank if unknown.";
  }
  if (input.place.trim().length < 2) {
    return "Enter a birth place (city and country).";
  }
  return null;
}

export async function computeNatalChart(input: BirthInput): Promise<NatalChart> {
  const unknownTime = Boolean(input.unknownTime) || !(input.time ?? "").trim();
  const time = unknownTime ? "12:00" : (input.time as string).trim();
  const geo = await geocodePlace(input.place.trim());
  const utcBirth = zonedCivilToUtc(input.date.trim(), time, geo.timezone);
  if (Number.isNaN(utcBirth.getTime())) {
    throw new Error("That date and time could not be converted. Check the values.");
  }
  return buildNatalChart({
    utcBirth,
    placeName: geo.displayName,
    latitude: geo.latitude,
    longitude: geo.longitude,
    timezone: geo.timezone,
    timeAssumed: unknownTime,
  });
}

export async function generatePrediction(
  input: BirthInput,
  hooks?: {
    onFacts?: (facts: string) => void;
    onToken?: (chunk: string) => void;
  },
): Promise<PredictionPayload> {
  const err = validateBirthInput(input);
  if (err) throw new Error(err);

  await assertOllamaReady();
  const chart = await computeNatalChart(input);
  const ctx = buildChartContext(chart, input.name);
  hooks?.onFacts?.(ctx.facts);
  const llm = await ollamaChat(
    [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userPrompt(ctx.facts) },
    ],
    hooks?.onToken,
  );

  if (!llm) {
    throw new Error(`Ollama (${ollamaModel()}) returned an empty reading. Try again or pull a larger model.`);
  }

  const sections = parseLlmSections(llm);
  const header = [
    "DESTINYAI NATAL REPORT (Ollama)",
    `Model: ${ollamaModel()}`,
    ctx.facts,
  ].join("\n");

  return {
    name: input.name,
    chart,
    generatedAt: new Date().toISOString(),
    past: sections.past,
    present: sections.present,
    future: sections.future,
    improvements: sections.improvements,
    fullText: assembleFullText(header, llm),
    dasha: ctx.dasha,
    transits: ctx.transits,
  };
}

import { NextResponse } from "next/server";
import { generatePrediction } from "@/lib/pipeline";

export const runtime = "nodejs";
export const maxDuration = 120;

type Body = {
  name?: string;
  date?: string;
  time?: string;
  place?: string;
  unknownTime?: boolean;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Body;
    const report = await generatePrediction({
      name: (body.name ?? "").trim().slice(0, 80) || undefined,
      date: (body.date ?? "").trim(),
      time: (body.time ?? "").trim() || undefined,
      place: (body.place ?? "").trim(),
      unknownTime: Boolean(body.unknownTime),
    });
    return NextResponse.json(report);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Prediction failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

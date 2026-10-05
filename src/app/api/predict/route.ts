/** POST /api/predict. stream:true returns NDJSON (chart first, then tokens, then the full report). */
import { NextResponse } from "next/server";
import { generatePrediction, type BirthInput } from "@/lib/pipeline";

export const runtime = "nodejs";
export const maxDuration = 120;

type Body = BirthInput & { stream?: boolean };

function parseBody(body: Body): BirthInput {
  return {
    name: (body.name ?? "").trim().slice(0, 80) || undefined,
    date: (body.date ?? "").trim(),
    time: (body.time ?? "").trim() || undefined,
    place: (body.place ?? "").trim(),
    unknownTime: Boolean(body.unknownTime),
  };
}

export async function POST(request: Request) {
  const body = (await request.json()) as Body;
  const input = parseBody(body);

  if (!body.stream) {
    try {
      const report = await generatePrediction(input);
      return NextResponse.json(report);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Prediction failed.";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) => {
        controller.enqueue(encoder.encode(`${JSON.stringify(obj)}\n`));
      };
      try {
        const report = await generatePrediction(input, {
          onReady: (meta) => send({ type: "meta", ...meta }),
          onToken: (text) => send({ type: "token", text }),
        });
        send({ type: "done", report });
      } catch (err) {
        send({ type: "error", error: err instanceof Error ? err.message : "Prediction failed." });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}

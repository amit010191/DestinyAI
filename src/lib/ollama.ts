/** Local Ollama client. Host and model come from .env (OLLAMA_HOST, OLLAMA_MODEL). */
const DEFAULT_HOST = "http://127.0.0.1:11434";
const DEFAULT_MODEL = "llama3.2";

export function ollamaHost(): string {
  return (process.env.OLLAMA_HOST ?? DEFAULT_HOST).replace(/\/$/, "");
}

export function ollamaModel(): string {
  return process.env.OLLAMA_MODEL ?? DEFAULT_MODEL;
}

export class OllamaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OllamaError";
  }
}

let readyUntil = 0;

export async function assertOllamaReady(): Promise<void> {
  if (Date.now() < readyUntil) return;

  const host = ollamaHost();
  const model = ollamaModel();
  let res: Response;
  try {
    res = await fetch(`${host}/api/tags`, { signal: AbortSignal.timeout(4000) });
  } catch {
    throw new OllamaError(
      `Cannot reach Ollama at ${host}. Start it with: ollama serve\nThen pull the model: ollama pull ${model}`,
    );
  }
  if (!res.ok) {
    throw new OllamaError(`Ollama responded ${res.status} from ${host}/api/tags. Is 'ollama serve' running?`);
  }
  const data = (await res.json()) as { models?: { name: string }[] };
  const names = (data.models ?? []).map((m) => m.name);
  const hasModel = names.some((n) => n === model || n.startsWith(`${model}:`));
  if (!hasModel) {
    throw new OllamaError(
      `Ollama is running, but model "${model}" is not installed.\nInstalled: ${names.join(", ") || "(none)"}\nRun: ollama pull ${model}`,
    );
  }
  readyUntil = Date.now() + 5 * 60 * 1000;
}

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export async function ollamaChat(messages: ChatMessage[], onToken?: (chunk: string) => void): Promise<string> {
  const host = ollamaHost();
  const model = ollamaModel();
  const res = await fetch(`${host}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages,
      stream: true,
      keep_alive: "60m",
      options: {
        temperature: 0.5,
        num_ctx: 2048,
        num_predict: 420,
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new OllamaError(`Ollama chat failed (${res.status}): ${body.slice(0, 400)}`);
  }

  if (!res.body) {
    throw new OllamaError("Ollama returned an empty stream.");
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let out = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const json = JSON.parse(trimmed) as { message?: { content?: string }; error?: string };
      if (json.error) throw new OllamaError(json.error);
      const piece = json.message?.content ?? "";
      if (piece) {
        out += piece;
        onToken?.(piece);
      }
    }
  }
  return out.trim();
}

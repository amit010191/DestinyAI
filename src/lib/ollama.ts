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

export async function assertOllamaReady(): Promise<void> {
  const host = ollamaHost();
  const model = ollamaModel();
  let res: Response;
  try {
    res = await fetch(`${host}/api/tags`);
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
}

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export async function ollamaChat(messages: ChatMessage[], onToken?: (chunk: string) => void): Promise<string> {
  const host = ollamaHost();
  const model = ollamaModel();
  const stream = Boolean(onToken);
  const res = await fetch(`${host}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages,
      stream,
      options: { temperature: 0.6, num_ctx: 4096, num_predict: 900 },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new OllamaError(`Ollama chat failed (${res.status}): ${body.slice(0, 400)}`);
  }

  if (!stream) {
    const data = (await res.json()) as { message?: { content?: string } };
    return (data.message?.content ?? "").trim();
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
      const json = JSON.parse(trimmed) as { message?: { content?: string }; error?: string; done?: boolean };
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

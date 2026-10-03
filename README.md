# DestinyAI

Natal prediction agent. It calculates sidereal planet positions from date, time, and place of birth, then asks a **local Ollama** model to write past, present, and future guidance plus improvement points.

The console agent is the primary way to run it.

## 1. Install Ollama

Download and install from [https://ollama.com/download](https://ollama.com/download) (Windows installer is fine).

Check:

```bash
ollama --version
```

## 2. Start Ollama and pull a model

Ollama usually starts in the background after install. If calls fail, start it:

```bash
ollama serve
```

Pull the model used by DestinyAI (llama3.2 is the default and already a good fit):

```bash
ollama pull llama3.2
```

Confirm it is listed:

```bash
ollama list
```

Optional: use another local model.

```powershell
$env:OLLAMA_MODEL="mistral"
```

```bash
set OLLAMA_MODEL=llama3.1
```

## 3. Install DestinyAI

In the project folder:

```bash
cd d:\DestinyAI
npm install
```

## 4. Run the AI in the console

```bash
npm run predict
```

You will be asked:

1. Name (optional)
2. Date of birth (`YYYY-MM-DD`, example `1992-08-14`)
3. Time of birth (`HH:MM` 24-hour, example `06:20`) — press Enter if unknown
4. Place of birth (`City, country`, example `Pune, India`)

The console prints the calculated chart, then streams the Ollama reading: **Past**, **Present**, **Future**, and **Points for improvement**.

### One-shot (no prompts)

```bash
npm run predict -- --full-name "Asha" --date 1988-03-21 --time 14:35 --place "Bengaluru, India"
```

Do not use `--name` with `npm run` — npm keeps that flag for itself. Use `--full-name` or `-n`, or call:

```bash
npx tsx src/cli.ts -n Asha -d 1988-03-21 -t 14:35 -p "Bengaluru, India"
```

Unknown birth time:

```bash
npm run predict -- --date 1988-03-21 --unknown-time --place "Bengaluru, India"
```

Help:

```bash
npm run predict -- --help
```

## 5. Optional web UI

With Ollama already running:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The form uses the same Ollama pipeline.

## Environment

| Variable       | Default                     | Meaning              |
|----------------|-----------------------------|----------------------|
| `OLLAMA_HOST`  | `http://127.0.0.1:11434`    | Ollama API           |
| `OLLAMA_MODEL` | `llama3.2`                  | Chat model name      |

## If something fails

- `Cannot reach Ollama` → run `ollama serve`, then retry `npm run predict`
- `model is not installed` → `ollama pull llama3.2`
- Place not found → add the country, e.g. `Pune, India`

This reading is interpretive guidance, not medical, legal, or financial advice.

# DestinyAI

Natal prediction agent. You enter date of birth, place, and time. The app calculates sidereal planets, the birth star, houses, and Vimshottari dashas, then a **local Ollama** model writes a short **past / present / future** reading plus improvement points.

The console is the main way to run it.

## Steps to run

### 1. Install and start Ollama

Download from [https://ollama.com/download](https://ollama.com/download), then:

```bash
ollama --version
ollama pull llama3.2
ollama list
```

If a later command says it cannot reach Ollama:

```bash
ollama serve
```

Leave that window open.

### 2. Install project packages

```bash
cd d:\DestinyAI
npm install
```

### 3. Check `.env`

Copy `.env.example` to `.env` if you do not already have one:

```
OLLAMA_HOST=http://127.0.0.1:11434
OLLAMA_MODEL=llama3.2
```

`npm run predict` loads this file. `npm run dev` loads it automatically.

### 4. Run the agent in the console

```bash
npm run predict
```

Answer the prompts:

1. Name (optional)
2. Date of birth — `YYYY-MM-DD` (example `1992-08-14`)
3. Time of birth — `HH:MM` 24-hour (example `06:20`). Press Enter if unknown (noon is used; the ascendant is approximate)
4. Place of birth — `City, country` (example `Pune, India`)

The console prints the chart, then streams the reading.

Skip the prompts with flags. Do not use `--name` with `npm run` (npm keeps that flag):

```bash
npm run predict -- --full-name "Asha" --date 1988-03-21 --time 14:35 --place "Bengaluru, India"
```

Unknown birth time:

```bash
npm run predict -- --date 1988-03-21 --unknown-time --place "Bengaluru, India"
```

Help:

```bash
npm run predict -- --help
```

### 5. Optional web UI

With Ollama already running:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The chart appears first, then the reading streams in. It uses the same pipeline as the console.

## How the code is arranged

| File | Role |
|------|------|
| `src/cli.ts` | Console prompts and streamed output |
| `src/app/page.tsx` | Web form |
| `src/app/api/predict/route.ts` | HTTP API |
| `src/lib/pipeline.ts` | Ties the steps together |
| `src/lib/geo.ts` | City lookup and timezone |
| `src/lib/ephemeris.ts` / `chart.ts` / `dasha.ts` | Planet positions, houses, dashas |
| `src/lib/context.ts` | Facts sent to the model, and section parser |
| `src/lib/ollama.ts` | Calls local Ollama |

## If something fails

- `Cannot reach Ollama` — run `ollama serve`, then `npm run predict` again
- `model is not installed` — `ollama pull llama3.2`
- Place not found — add the country, for example `Pune, India`
- First reply after a reboot is slower while the model loads; later replies reuse the loaded model

This reading is interpretive guidance, not medical, legal, or financial advice.

/** Console agent: prompt for birth details, print the chart, stream the Ollama reading. */
import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { generatePrediction, type BirthInput } from "./lib/pipeline";
import { ollamaHost, ollamaModel } from "./lib/ollama";

type Parsed = BirthInput & { help?: boolean };

function parseArgs(argv: string[]): Parsed {
  const out: Parsed = { date: "", place: "", unknownTime: false };
  const rest: string[] = [];

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i] ?? "";
    if (a === "--help" || a === "-h") out.help = true;
    else if (a === "--unknown-time") out.unknownTime = true;
    else if (a === "--date" || a === "-d") out.date = next();
    else if (a === "--time" || a === "-t") out.time = next();
    else if (a === "--place" || a === "-p") out.place = next();
    else if (a === "--full-name" || a === "-n" || a === "--name") out.name = next();
    else if (!a.startsWith("-")) rest.push(a);
  }

  for (const token of rest) {
    if (!out.date && /^\d{4}-\d{2}-\d{2}$/.test(token)) out.date = token;
    else if (!out.time && /^\d{2}:\d{2}$/.test(token)) out.time = token;
    else if (!out.name && !out.date) out.name = token;
    else if (!out.place) out.place = out.place ? `${out.place} ${token}` : token;
    else out.place = `${out.place} ${token}`;
  }

  return out;
}

async function promptMissing(current: BirthInput): Promise<BirthInput> {
  const rl = readline.createInterface({ input, output });
  const ask = async (label: string, fallback = "") => {
    const hint = fallback ? ` [${fallback}]` : "";
    const value = (await rl.question(`${label}${hint}: `)).trim();
    return value || fallback;
  };

  try {
    const name = current.name ?? (await ask("Name (optional)", ""));
    const date = current.date || (await ask("Date of birth (YYYY-MM-DD)"));
    let time = current.time ?? "";
    let unknownTime = Boolean(current.unknownTime);
    if (!time && !unknownTime) {
      time = await ask("Time of birth (HH:MM 24h, or Enter if unknown)");
      unknownTime = !time;
    }
    const place = current.place || (await ask("Place of birth (city, country)"));
    return { name, date, time, place, unknownTime };
  } finally {
    rl.close();
  }
}

async function main() {
  const seeded = parseArgs(process.argv.slice(2));

  if (seeded.help) {
    console.log(`DestinyAI console agent (Ollama)

Interactive:
  npm run predict

With arguments (avoid --name; npm treats that as its own flag):
  npm run predict -- --full-name "Asha" --date 1988-03-21 --time 14:35 --place "Bengaluru, India"
  npx tsx src/cli.ts -n Asha -d 1988-03-21 -t 14:35 -p "Bengaluru, India"

Options:
  -n, --full-name NAME
  -d, --date YYYY-MM-DD
  -t, --time HH:MM          24-hour; omit or use --unknown-time if unknown
  -p, --place "City, Country"
  --unknown-time
  -h, --help

Environment:
  OLLAMA_HOST   default http://127.0.0.1:11434
  OLLAMA_MODEL  default llama3.2
`);
    return;
  }

  const interactive = !seeded.date || !seeded.place || (!seeded.time && !seeded.unknownTime);
  if (interactive && !process.stdin.isTTY) {
    throw new Error(
      'Missing birth details. In a non-interactive shell pass flags, for example:\n  npm run predict -- --full-name "Asha" --date 1988-03-21 --time 14:35 --place "Bengaluru, India"',
    );
  }
  const birth = interactive ? await promptMissing(seeded) : seeded;

  console.log("");
  console.log(`Ollama  ${ollamaHost()}  model=${ollamaModel()}`);
  console.log("Computing natal chart, then asking the model...\n");

  await generatePrediction(birth, {
    onReady: ({ facts }) => {
      console.log(facts);
      console.log("\n----- Ollama reading -----\n");
    },
    onToken: (chunk) => {
      process.stdout.write(chunk);
    },
  });

  console.log("\n\n--- done ---");
}

main().catch((err) => {
  console.error(`\n${err instanceof Error ? err.message : err}`);
  process.exit(1);
});

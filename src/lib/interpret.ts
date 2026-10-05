/** Template reading (not the live path). The live reading is written by Ollama via pipeline.ts. */
import { HOUSE_THEMES, SIGNS, type Planet } from "./constants";
import { lordOfHouse, planetInHouse, type NatalChart, type PlanetPlacement } from "./chart";
import { dashaAt, fmtDate, type DashaTimeline } from "./dasha";
import { siderealLongitudes } from "./ephemeris";
import { houseOf } from "./chart";

const PLANET_NATURE: Record<Planet, string> = {
  Sun: "authority, vitality, father-figures, and the will to be seen",
  Moon: "mind, mother, habits, public mood, and emotional security",
  Mercury: "thinking, trade, writing, analysis, and adaptability",
  Venus: "love, art, comfort, money-pleasure, and how you bond",
  Mars: "drive, conflict, courage, engineering energy, and sharp action",
  Jupiter: "wisdom, expansion, teachers, ethics, and protective luck",
  Saturn: "discipline, delay, structure, karma, and long-term duty",
  Rahu: "hunger for the unconventional, foreign fields, obsession, and sudden rise",
  Ketu: "detachment, research, spirituality, past-life skill, and letting go",
};

const DASHA_LIFE: Record<Planet, { past: string; present: string; future: string; grow: string }> = {
  Sun: {
    past: "matters of confidence, recognition, and dealing with authority or father-like figures came to the foreground. You were asked to stand more visibly as yourself.",
    present: "the Sun period highlights leadership, health discipline, and honest self-expression. Ego tests and career visibility often arrive together.",
    future: "recognition grows when you act from integrity rather than pride. Positions of responsibility can open if you carry them with warmth, not heat.",
    grow: "Protect vitality: sleep, sunlight, and a spine-straight daily routine. Lead by example; avoid dominating conversations or family decisions.",
  },
  Moon: {
    past: "the mind, home, and emotional bonds shaped the story. Moves, caretaking, or public mood swings may have left a deep imprint on how you feel safe.",
    present: "the Moon period sensitizes intuition and popularity. Restlessness of mind is the main weather — nurture, don't numb.",
    future: "emotional intelligence becomes a professional asset. Careers touching people, food, water, care, or the public can swell.",
    grow: "Stabilize the mind with regular meals, moonlight walks, journaling, and fewer late-night screens. Honour the mother or the inner mother.",
  },
  Mars: {
    past: "initiative, conflict, or physical effort defined chapters of life. You learned by doing — and sometimes by colliding.",
    present: "Mars time rewards decisive work, sport, surgery-level focus, and courage. Temper is the leak that can drain the whole gain.",
    future: "bold projects, technical skill, and competitive fields can advance you. Channel heat into building, not battling.",
    grow: "Train the body; pause before you send the sharp message. Iron, strength work, and a craft you can master will civilize Mars.",
  },
  Mercury: {
    past: "study, commerce, siblings, or frequent small shifts trained your wit. Communication opened doors — or misunderstandings closed them.",
    present: "Mercury time favours learning, writing, sales, coding, and negotiation. Scattered attention is the tax you pay if you multitask without a spine.",
    future: "skill-stacking pays. Teaching what you know, documenting processes, and cleaner contracts improve outcomes.",
    grow: "Write things down. Learn one high-value skill deeply. Speak 20% less and listen 20% more in key meetings.",
  },
  Jupiter: {
    past: "teachers, faith, children, or a widening of worldview coloured the years. Grace arrived when you stayed ethical under pressure.",
    present: "Jupiter time expands education, guidance, prosperity, and meaning. Over-optimism or over-giving is the shadow.",
    future: "mentorship, publishing, law, finance wisdom, or spiritual study can bless the path. Share knowledge; don't preach.",
    grow: "Study with a living teacher. Give without keeping score, but keep a budget. Yellow food for the body, honest counsel for the mind.",
  },
  Venus: {
    past: "relationships, aesthetics, and the search for ease were central. Love or money (often both) taught you what you actually value.",
    present: "Venus time ripens partnership, art, luxury, and social grace. Indulgence and people-pleasing are the two ditches on this road.",
    future: "alliances, creative work, and taste-based careers can flourish. Choose quality over quantity in both love and spending.",
    grow: "Beautify one room, one skill, one relationship. Keep agreements in love. Reduce sugar and late nights — Venus likes sweetness with measure.",
  },
  Saturn: {
    past: "duty, delay, and heavy lifting built character. What felt unfair was often apprenticeship for later authority.",
    present: "Saturn time is a kiln: career structure, aging parents, bones, and reputation. Shortcuts crack; consistency compounds.",
    future: "lasting status comes from systems you maintain. Property, governance, engineering, and elder-respecting work stabilize the next decade.",
    grow: "Show up on time. Finish one long project. Care for knees, teeth, and oil the body. Serve someone older than you each week.",
  },
  Rahu: {
    past: "unusual paths, foreign influence, technology, or a hunger to break the family script pulled you off the well-lit road.",
    present: "Rahu time accelerates ambition and ambiguity. Fame, digital fields, or outsider strategies can spike — so can anxiety and shortcuts.",
    future: "breakthroughs arrive where you are willing to be unconventional without becoming unprincipled. Foreign or online arenas stay hot.",
    grow: "Name the hunger. Cap screen time. Work with a mentor who has already survived the same maze. Ground with earth, routine, and truth-telling.",
  },
  Ketu: {
    past: "endings, spiritual questions, isolation, or a talent that felt 'already known' shaped you. You outgrew rooms that others still wanted.",
    present: "Ketu time strips excess. Research, healing, occult/technical depth, and retreat outperform loud networking.",
    future: "mastery through subtraction. Let go of identities that won applause but cost peace. Quiet expertise becomes your signature.",
  grow: "Meditate or walk without headphones. Finish unfinished inner work. Donate unused things. Don't ghost people — close loops cleanly.",
  },
};

const HOUSE_GROWTH: Record<number, string> = {
  1: "Invest in health, posture, and a clear personal brand. How you start the day is how you start your fate.",
  2: "Build a savings rule you never break. Refine speech — your words are a bank account.",
  3: "Practice a skill daily for 30 minutes. Courage is a muscle; take one small brave action each week.",
  4: "Make home a recovery temple. Resolve one family tension with a calm conversation, not a verdict.",
  5: "Create something that didn't exist last month. Romance and speculation both need a head, not only a heart.",
  6: "Treat health like a job: food, movement, labs if needed. Compete by being more useful, not more loud.",
  7: "Choose partners (life and business) by character under stress. Write agreements. Listen for what is not said.",
  8: "Get financially literate about shared money, insurance, and taxes. Therapy or deep study turns fear into power.",
  9: "Keep a living philosophy. Travel with purpose. Find a mentor and be a mentee worth teaching.",
  10: "Define the work you want to be known for in one sentence. Then do visible, excellent versions of it weekly.",
  11: "Network with generosity. Join one room of ambitious peers. Track goals in writing, not only in hope.",
  12: "Protect sleep and solitude. Budget for leaks (hidden expenses). Foreign or spiritual work needs a container.",
};

function dignityPhrase(p: PlanetPlacement): string {
  if (p.dignity === "exalted") return `${p.planet} is exalted in ${p.sign}, which strengthens ${PLANET_NATURE[p.planet]}.`;
  if (p.dignity === "debilitated")
    return `${p.planet} is debilitated in ${p.sign}, so ${PLANET_NATURE[p.planet]} need extra conscious work rather than autopilot.`;
  if (p.dignity === "own") return `${p.planet} occupies its own sign ${p.sign}, a stable seat for ${PLANET_NATURE[p.planet]}.`;
  return `${p.planet} in ${p.sign} colours ${PLANET_NATURE[p.planet]} with that sign's style.`;
}

function sadeSati(moonSignIndex: number, saturnSignIndex: number): "approaching" | "peak" | "leaving" | "none" {
  const rel = (saturnSignIndex - moonSignIndex + 12) % 12;
  if (rel === 11) return "approaching";
  if (rel === 0) return "peak";
  if (rel === 1) return "leaving";
  return "none";
}

function transitLines(chart: NatalChart, now: Date): string[] {
  const longs = siderealLongitudes(now);
  const lagnaIndex = SIGNS.indexOf(chart.lagna);
  const moonIndex = SIGNS.indexOf(chart.moonSign);
  const lines: string[] = [];

  const interesting: Planet[] = ["Jupiter", "Saturn", "Rahu", "Mars"];
  for (const planet of interesting) {
    const signIndex = Math.floor(longs[planet] / 30) % 12;
    const house = houseOf(signIndex, lagnaIndex);
    lines.push(
      `Transit ${planet} is in ${SIGNS[signIndex]}, activating your ${ordinal(house)} house of ${HOUSE_THEMES[house]}.`,
    );
  }

  const satIdx = Math.floor(longs.Saturn / 30) % 12;
  const ss = sadeSati(moonIndex, satIdx);
  if (ss === "approaching") {
    lines.push(
      "Saturn is in the sign before your Moon (Sade Sati beginning). Pressure on mind and duties is rising; simplify commitments.",
    );
  } else if (ss === "peak") {
    lines.push(
      "Saturn is on your natal Moon sign (peak Sade Sati). Emotional weather is heavy; structure, not speed, is the medicine.",
    );
  } else if (ss === "leaving") {
    lines.push(
      "Saturn is in the sign after your Moon (Sade Sati closing). You are metabolizing lessons; do not restart old battles.",
    );
  }
  return lines;
}

function nameOf(name: string | undefined): string {
  const n = (name ?? "").trim();
  return n || "You";
}

function periodSpan(start: Date, end: Date): string {
  return `${fmtDate(start)} to ${fmtDate(end)}`;
}

function ordinal(n: number): string {
  const v = n % 100;
  if (v >= 11 && v <= 13) return `${n}th`;
  if (n % 10 === 1) return `${n}st`;
  if (n % 10 === 2) return `${n}nd`;
  if (n % 10 === 3) return `${n}rd`;
  return `${n}th`;
}

function article(word: string): string {
  return /^[aeiou]/i.test(word) ? "an" : "a";
}

function cap(s: string): string {
  if (!s) return s;
  return s[0].toUpperCase() + s.slice(1);
}

function houseStory(chart: NatalChart, house: number): string {
  const lord = lordOfHouse(chart, house);
  const pos = planetInHouse(chart, lord);
  return `The lord of the ${ordinal(house)} house (${lord}) sits in the ${ordinal(pos.house)} house in ${pos.sign}, linking ${HOUSE_THEMES[house]} with ${HOUSE_THEMES[pos.house]}.`;
}

export type PredictionPayload = {
  name?: string;
  chart: NatalChart;
  generatedAt: string;
  past: string;
  present: string;
  future: string;
  improvements: string[];
  fullText: string;
  dasha: {
    currentMaha: string;
    currentAntar: string;
    previousMaha: string | null;
    nextMaha: string | null;
  };
  transits: string[];
};

export function interpretChart(chart: NatalChart, name: string | undefined, now = new Date()): PredictionPayload {
  const moon = planetInHouse(chart, "Moon");
  const sun = planetInHouse(chart, "Sun");
  const lagnaLord = lordOfHouse(chart, 1);
  const lagnaLordPos = planetInHouse(chart, lagnaLord);
  const dasha: DashaTimeline = dashaAt(new Date(chart.utcBirth), moon.longitude, now);
  const person = nameOf(name);
  const transits = transitLines(chart, now);

  const who = chart.timeAssumed
    ? `${person}, using a noon birth time (ascendant is therefore approximate)`
    : person;

  const pastDasha = dasha.previousMaha;
  const past = [
    `${who} was born with ${chart.lagna} rising, Sun in ${sun.sign} (house ${sun.house}), and Moon in ${moon.sign} in ${chart.birthNakshatra} pada ${chart.birthPada}. The natal star ${chart.birthNakshatra} (lord ${moon.nakshatraLord}) is the seed of the Vimshottari clock that times your chapters.`,
    pastDasha
      ? `The previous mahadasha of ${pastDasha.lord} (${periodSpan(pastDasha.start, pastDasha.end)}) was a training ground: ${DASHA_LIFE[pastDasha.lord].past} ${dignityPhrase(planetInHouse(chart, pastDasha.lord))} That planet occupies the ${ordinal(planetInHouse(chart, pastDasha.lord).house)} house in this chart, so the past concentrated on ${HOUSE_THEMES[planetInHouse(chart, pastDasha.lord).house]}.`
      : `Life so far has been unfolding inside your opening ${dasha.currentMaha.lord} mahadasha, so the past is still the same planetary weather as the present, only earlier in the lesson.`,
    houseStory(chart, 4) + " This is the imprint of childhood, mother, and the idea of 'home' you still carry.",
    houseStory(chart, 9) + " Early fortune, mentors, and belief systems grew from this link.",
    `Looking back, the combination of ${chart.lagna} lagna and ${article(moon.sign)} ${moon.sign} Moon suggests you learned safety through ${HOUSE_THEMES[moon.house]}. What felt like delay or intensity then is now part of your instinctive radar.`,
  ].join("\n\n");

  const present = [
    `Right now you are in ${dasha.currentMaha.lord} mahadasha (${periodSpan(dasha.currentMaha.start, dasha.currentMaha.end)}) and ${dasha.currentAntar.lord} antardasha (${periodSpan(dasha.currentAntar.start, dasha.currentAntar.end)}). ${DASHA_LIFE[dasha.currentMaha.lord].present}`,
    `The antardasha lord ${dasha.currentAntar.lord} is a subplot: ${PLANET_NATURE[dasha.currentAntar.lord]}. ${dignityPhrase(planetInHouse(chart, dasha.currentAntar.lord))} It sits in the ${ordinal(planetInHouse(chart, dasha.currentAntar.lord).house)} house, so this year the mind keeps returning to ${HOUSE_THEMES[planetInHouse(chart, dasha.currentAntar.lord).house]}.`,
    `Lagna lord ${lagnaLord} in the ${ordinal(lagnaLordPos.house)} house (${lagnaLordPos.sign}) shows how you are meeting the world this decade: through ${HOUSE_THEMES[lagnaLordPos.house]}.`,
    houseStory(chart, 10) + " Career weather follows this signature more than any generic sun-sign slogan.",
    houseStory(chart, 7) + " Partnerships — marriage, clients, open rivals — are active according to this map.",
    transits.join(" "),
  ].join("\n\n");

  const next = dasha.nextMaha;
  const future = [
    `${cap(DASHA_LIFE[dasha.currentMaha.lord].future)} The remainder of ${dasha.currentMaha.lord} mahadasha lasts until ${fmtDate(dasha.currentMaha.end)}. Treat that date as a climate change, not a cliff.`,
    dasha.nextAntar
      ? `Next antardasha: ${dasha.nextAntar.lord} from ${fmtDate(dasha.nextAntar.start)}. Expect a tilt toward ${PLANET_NATURE[dasha.nextAntar.lord]}, expressed via the ${ordinal(planetInHouse(chart, dasha.nextAntar.lord).house)} house (${HOUSE_THEMES[planetInHouse(chart, dasha.nextAntar.lord).house]}).`
      : "",
    next
      ? `After that, ${next.lord} mahadasha begins ${fmtDate(next.start)} and runs to ${fmtDate(next.end)}. ${cap(DASHA_LIFE[next.lord].future)} Prepare the skills that planet respects before the season starts.`
      : "",
    houseStory(chart, 11) + " Gains and the company you keep will decide how large the next chapter can become.",
    houseStory(chart, 5) + " Intelligence, creative risk, and the heart's luck are the quiet engines of the coming years.",
    `Overall trajectory: ${chart.lagna} rising people evolve by mastering ${HOUSE_THEMES[1]}, but your particular sky says the future opens when ${lagnaLord} (your chart's steering planet) is used constructively in the ${ordinal(lagnaLordPos.house)} house. Do not wait for a perfect transit. Practice the virtue of that house until the outer planets catch up.`,
  ]
    .filter(Boolean)
    .join("\n\n");

  const weak = chart.planets.filter((p) => p.dignity === "debilitated" || [6, 8, 12].includes(p.house));
  const improvements: string[] = [
    DASHA_LIFE[dasha.currentMaha.lord].grow,
    DASHA_LIFE[dasha.currentAntar.lord].grow,
    HOUSE_GROWTH[lagnaLordPos.house],
    HOUSE_GROWTH[planetInHouse(chart, dasha.currentMaha.lord).house],
    HOUSE_GROWTH[10],
  ];

  if (weak.length) {
    const w = weak.slice(0, 3);
    improvements.push(
      `Support strained placements: ${w
        .map((p) => `${p.planet} in the ${ordinal(p.house)} house (${p.dignity === "debilitated" ? "debilitated in " + p.sign : p.sign})`)
        .join("; ")}. Strengthen them through the daily habits listed above rather than superstition alone.`,
    );
  }

  const ssLine = transits.find((t) => t.includes("Sade Sati"));
  if (ssLine) {
    improvements.push(
      "Saturn-on-Moon weather: reduce caffeine drama, keep written schedules, and do not make identity decisions at 1 a.m. Consistency will outrun intensity.",
    );
  }

  const unique = [...new Set(improvements)].slice(0, 8);

  const planetBlock = chart.planets
    .map(
      (p) =>
        `  ${p.planet.padEnd(8)} ${p.sign.padEnd(12)} ${p.degreeInSign.toFixed(2).padStart(6)}°   house ${String(p.house).padStart(2)}   ${p.nakshatra} (pada ${p.pada})   ${p.dignity}`,
    )
    .join("\n");

  const fullText = [
    `DESTINYAI NATAL REPORT`,
    `Name: ${person}`,
    `Birth: ${chart.utcBirth} UTC | Place: ${chart.placeName}`,
    `Coordinates: ${chart.latitude.toFixed(4)}, ${chart.longitude.toFixed(4)} (${chart.timezone})`,
    `System: ${chart.ayanamsaNote}`,
    chart.timeAssumed ? `Note: birth time was not given; noon local time was used.` : "",
    ``,
    `Lagna (Ascendant): ${chart.lagna} ${chart.lagnaDegree.toFixed(2)}°`,
    `Sun sign (sidereal): ${chart.sunSign} | Moon sign: ${chart.moonSign}`,
    `Birth star: ${chart.birthNakshatra} pada ${chart.birthPada}`,
    ``,
    `PLANETS`,
    planetBlock,
    ``,
    `CURRENT DASHA`,
    `Mahadasha: ${dasha.currentMaha.lord} (${periodSpan(dasha.currentMaha.start, dasha.currentMaha.end)})`,
    `Antardasha: ${dasha.currentAntar.lord} (${periodSpan(dasha.currentAntar.start, dasha.currentAntar.end)})`,
    dasha.previousMaha ? `Previous mahadasha: ${dasha.previousMaha.lord}` : "",
    dasha.nextMaha ? `Next mahadasha: ${dasha.nextMaha.lord} from ${fmtDate(dasha.nextMaha.start)}` : "",
    ``,
    `--- PAST ---`,
    past,
    ``,
    `--- PRESENT ---`,
    present,
    ``,
    `--- FUTURE ---`,
    future,
    ``,
    `--- POINTS FOR IMPROVEMENT ---`,
    unique.map((x, i) => `${i + 1}. ${x}`).join("\n"),
    ``,
    `This reading is an interpretive synthesis of sidereal planetary positions, whole-sign houses, Vimshottari dashas, and current transits. It is guidance for reflection, not medical, legal, or financial advice.`,
  ]
    .filter((line) => line !== "")
    .join("\n");

  return {
    name,
    chart,
    generatedAt: now.toISOString(),
    past,
    present,
    future,
    improvements: unique,
    fullText,
    dasha: {
      currentMaha: `${dasha.currentMaha.lord} (${periodSpan(dasha.currentMaha.start, dasha.currentMaha.end)})`,
      currentAntar: `${dasha.currentAntar.lord} (${periodSpan(dasha.currentAntar.start, dasha.currentAntar.end)})`,
      previousMaha: dasha.previousMaha
        ? `${dasha.previousMaha.lord} (${periodSpan(dasha.previousMaha.start, dasha.previousMaha.end)})`
        : null,
      nextMaha: dasha.nextMaha ? `${dasha.nextMaha.lord} from ${fmtDate(dasha.nextMaha.start)}` : null,
    },
    transits,
  };
}

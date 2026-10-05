/** Shared Vedic tables: signs, planets, nakshatras, dasha years, house themes. */
export const SIGNS = [
  "Aries",
  "Taurus",
  "Gemini",
  "Cancer",
  "Leo",
  "Virgo",
  "Libra",
  "Scorpio",
  "Sagittarius",
  "Capricorn",
  "Aquarius",
  "Pisces",
] as const;

export type Sign = (typeof SIGNS)[number];

export const PLANETS = [
  "Sun",
  "Moon",
  "Mercury",
  "Venus",
  "Mars",
  "Jupiter",
  "Saturn",
  "Rahu",
  "Ketu",
] as const;

export type Planet = (typeof PLANETS)[number];

export const NAKSHATRAS = [
  { name: "Ashwini", lord: "Ketu" },
  { name: "Bharani", lord: "Venus" },
  { name: "Krittika", lord: "Sun" },
  { name: "Rohini", lord: "Moon" },
  { name: "Mrigashira", lord: "Mars" },
  { name: "Ardra", lord: "Rahu" },
  { name: "Punarvasu", lord: "Jupiter" },
  { name: "Pushya", lord: "Saturn" },
  { name: "Ashlesha", lord: "Mercury" },
  { name: "Magha", lord: "Ketu" },
  { name: "Purva Phalguni", lord: "Venus" },
  { name: "Uttara Phalguni", lord: "Sun" },
  { name: "Hasta", lord: "Moon" },
  { name: "Chitra", lord: "Mars" },
  { name: "Swati", lord: "Rahu" },
  { name: "Vishakha", lord: "Jupiter" },
  { name: "Anuradha", lord: "Saturn" },
  { name: "Jyeshtha", lord: "Mercury" },
  { name: "Mula", lord: "Ketu" },
  { name: "Purva Ashadha", lord: "Venus" },
  { name: "Uttara Ashadha", lord: "Sun" },
  { name: "Shravana", lord: "Moon" },
  { name: "Dhanishta", lord: "Mars" },
  { name: "Shatabhisha", lord: "Rahu" },
  { name: "Purva Bhadrapada", lord: "Jupiter" },
  { name: "Uttara Bhadrapada", lord: "Saturn" },
  { name: "Revati", lord: "Mercury" },
] as const;

export const DASHA_ORDER: Planet[] = [
  "Ketu",
  "Venus",
  "Sun",
  "Moon",
  "Mars",
  "Rahu",
  "Jupiter",
  "Saturn",
  "Mercury",
];

export const DASHA_YEARS: Record<Planet, number> = {
  Ketu: 7,
  Venus: 20,
  Sun: 6,
  Moon: 10,
  Mars: 7,
  Rahu: 18,
  Jupiter: 16,
  Saturn: 19,
  Mercury: 17,
};

export const SIGN_LORDS: Record<Sign, Planet> = {
  Aries: "Mars",
  Taurus: "Venus",
  Gemini: "Mercury",
  Cancer: "Moon",
  Leo: "Sun",
  Virgo: "Mercury",
  Libra: "Venus",
  Scorpio: "Mars",
  Sagittarius: "Jupiter",
  Capricorn: "Saturn",
  Aquarius: "Saturn",
  Pisces: "Jupiter",
};

export const EXALTATION: Partial<Record<Planet, Sign>> = {
  Sun: "Aries",
  Moon: "Taurus",
  Mercury: "Virgo",
  Venus: "Pisces",
  Mars: "Capricorn",
  Jupiter: "Cancer",
  Saturn: "Libra",
};

export const DEBILITATION: Partial<Record<Planet, Sign>> = {
  Sun: "Libra",
  Moon: "Scorpio",
  Mercury: "Pisces",
  Venus: "Virgo",
  Mars: "Cancer",
  Jupiter: "Capricorn",
  Saturn: "Aries",
};

export const HOUSE_THEMES: Record<number, string> = {
  1: "self, vitality, appearance, and the way you begin things",
  2: "speech, family resources, savings, and self-worth",
  3: "courage, siblings, skills, short travel, and self-effort",
  4: "home, mother, inner peace, property, and emotional roots",
  5: "intelligence, creativity, romance, children, and speculative luck",
  6: "work ethic, health, service, competition, and daily problems to solve",
  7: "partnership, marriage, contracts, and how you meet the public",
  8: "transformation, shared money, research, longevity, and hidden matters",
  9: "dharma, higher learning, mentors, fortune, and long journeys",
  10: "career, status, public duty, and the mark you leave on the world",
  11: "gains, networks, ambitions, elder siblings, and fulfillment of desires",
  12: "solitude, foreign lands, rest, expenses, and spiritual release",
};

export const NAKSHATRA_SPAN = 360 / 27;
export const PADA_SPAN = NAKSHATRA_SPAN / 4;

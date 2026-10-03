"use client";

import { useMemo, useState } from "react";

type PlanetRow = {
  planet: string;
  sign: string;
  degreeInSign: number;
  house: number;
  nakshatra: string;
  pada: number;
  dignity: string;
};

type Report = {
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
  chart: {
    lagna: string;
    lagnaDegree: number;
    sunSign: string;
    moonSign: string;
    birthNakshatra: string;
    birthPada: number;
    placeName: string;
    timezone: string;
    timeAssumed: boolean;
    planets: PlanetRow[];
  };
};

export default function HomePage() {
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [place, setPlace] = useState("");
  const [unknownTime, setUnknownTime] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<Report | null>(null);

  const canSubmit = useMemo(() => {
    return Boolean(date && place && (unknownTime || time) && !loading);
  }, [date, place, time, unknownTime, loading]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, date, time, place, unknownTime }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not generate a reading.");
      setReport(data as Report);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not generate a reading.");
    } finally {
      setLoading(false);
    }
  }

  async function copyText() {
    if (!report) return;
    await navigator.clipboard.writeText(report.fullText);
  }

  function downloadText() {
    if (!report) return;
    const blob = new Blob([report.fullText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "destinyai-reading.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <div className="sky" />
      <main className="wrap">
        <div className="brand">
          <h1>DestinyAI</h1>
          <span>Natal agent</span>
        </div>
        <p className="lede">
          Enter date of birth, place, and time. The agent computes sidereal planet positions,
          the birth star (nakshatra), whole-sign houses, and Vimshottari dashas, then writes a
          past–present–future reading with concrete points you can use to improve the next chapter.
          The narrative is written by a local Ollama model from those calculated positions.
        </p>

        <section className="panel">
          <form className="grid" onSubmit={onSubmit}>
            <label>
              Name
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Optional"
                autoComplete="name"
              />
            </label>
            <label>
              Place of birth
              <input
                type="text"
                value={place}
                onChange={(e) => setPlace(e.target.value)}
                placeholder="City, country"
                required
              />
            </label>
            <label>
              Date of birth
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </label>
            <label>
              Time of birth
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                disabled={unknownTime}
                required={!unknownTime}
              />
            </label>
            <label className="check full">
              <input
                type="checkbox"
                checked={unknownTime}
                onChange={(e) => setUnknownTime(e.target.checked)}
              />
              I don&apos;t know the birth time (noon will be used; ascendant becomes approximate)
            </label>
            <button className="full" type="submit" disabled={!canSubmit}>
              {loading ? "Ollama is writing the reading…" : "Generate prediction"}
            </button>
          </form>
          {error ? <p className="error">{error}</p> : null}
        </section>

        {report ? (
          <article className="report">
            <div className="meta">
              <span className="chip">Lagna {report.chart.lagna}</span>
              <span className="chip">Moon {report.chart.moonSign}</span>
              <span className="chip">Sun {report.chart.sunSign}</span>
              <span className="chip">
                Star {report.chart.birthNakshatra} pada {report.chart.birthPada}
              </span>
              <span className="chip">MD {report.dasha.currentMaha}</span>
              <span className="chip">AD {report.dasha.currentAntar}</span>
            </div>
            <p className="foot" style={{ marginTop: 0 }}>
              {report.chart.placeName} · {report.chart.timezone}
              {report.chart.timeAssumed ? " · birth time assumed noon" : ""}
            </p>

            <h2>Chart</h2>
            <div className="table-wrap panel" style={{ padding: 8 }}>
              <table>
                <thead>
                  <tr>
                    <th>Planet</th>
                    <th>Sign</th>
                    <th>Deg</th>
                    <th>House</th>
                    <th>Nakshatra</th>
                    <th>Dignity</th>
                  </tr>
                </thead>
                <tbody>
                  {report.chart.planets.map((p) => (
                    <tr key={p.planet}>
                      <td>{p.planet}</td>
                      <td>{p.sign}</td>
                      <td>{p.degreeInSign.toFixed(1)}°</td>
                      <td>{p.house}</td>
                      <td>
                        {p.nakshatra} {p.pada}
                      </td>
                      <td>{p.dignity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h2>Past</h2>
            <p>{report.past}</p>
            <h2>Present</h2>
            <p>{report.present}</p>
            <h2>Future</h2>
            <p>{report.future}</p>
            <h2>Points for improvement</h2>
            <ol className="improvements">
              {report.improvements.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ol>

            <div className="actions">
              <button type="button" onClick={copyText}>
                Copy full text
              </button>
              <button type="button" className="ghost" onClick={downloadText}>
                Download .txt
              </button>
            </div>
            <p className="foot">
              Interpretive guidance from planetary geometry and traditional timing, not a substitute
              for medical, legal, or financial advice.
            </p>
          </article>
        ) : null}
      </main>
    </>
  );
}

// Local leaderboard — stored entirely in the browser (localStorage).
// Booth requirement from the brief: the board must keep working with no
// Wi-Fi, so nothing here ever touches the network.

export interface ScoreEntry {
  name: string;
  score: number;
  accuracy: number; // 0..1
  date: string; // ISO yyyy-mm-dd
}

const KEY = "skystrike.leaderboard.v1";
export const MAX_ENTRIES = 10;

export function loadScores(): ScoreEntry[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ScoreEntry[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((e) => typeof e?.name === "string" && typeof e?.score === "number")
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_ENTRIES);
  } catch {
    return [];
  }
}

export function qualifies(score: number): boolean {
  if (score <= 0) return false;
  const scores = loadScores();
  return scores.length < MAX_ENTRIES || score > scores[scores.length - 1].score;
}

export function saveScore(name: string, score: number, accuracy: number): ScoreEntry[] {
  const entry: ScoreEntry = {
    name: (name || "ACE").toUpperCase().slice(0, 10),
    score,
    accuracy,
    date: new Date().toISOString().slice(0, 10),
  };
  const scores = [...loadScores(), entry]
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_ENTRIES);
  try {
    localStorage.setItem(KEY, JSON.stringify(scores));
  } catch {
    /* storage unavailable (private mode) — game still works, board just won't persist */
  }
  return scores;
}

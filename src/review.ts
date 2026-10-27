import { Chess } from "chess.js";
import { uci } from "./chess";
import { search, ENGINE_VERSION, type Evaluation, type Score } from "./engine";
import { cached, cache } from "./storage";

export type Grade = "Best" | "Good" | "Inaccuracy" | "Mistake" | "Blunder";
export type MoveReview = {
  ply: number;
  played: string;
  best: Evaluation;
  actual: Evaluation;
  grade: Grade;
  loss: number;
  ms: number;
};

// These are transparent app heuristics, not Chess.com's proprietary classifications.
function utility(score: Score, sign: number): number {
  const value = score.value * sign;
  if (score.type === "mate")
    return value > 0
      ? 100000 - Math.abs(value) * 10
      : -100000 + Math.abs(value) * 10;
  return value;
}
export function classify(
  best: Score,
  actual: Score,
  turn: "w" | "b",
  isBest: boolean,
): { grade: Grade; loss: number } {
  if (isBest) return { grade: "Best", loss: 0 };
  const sign = turn === "w" ? 1 : -1;
  // Keeping a forced mate (or remaining in a forced loss) isn't a blunder merely because its length changes.
  if (
    best.type === "mate" &&
    actual.type === "mate" &&
    Math.sign(best.value) === Math.sign(actual.value)
  )
    return { grade: "Good", loss: 0 };
  const loss = Math.max(0, utility(best, sign) - utility(actual, sign));
  return {
    grade:
      loss < 50
        ? "Good"
        : loss < 100
          ? "Inaccuracy"
          : loss < 200
            ? "Mistake"
            : "Blunder",
    loss,
  };
}
async function evaluate(
  initialFen: string,
  moves: string[],
  turn: "w" | "b",
  ms: number,
  signal: AbortSignal,
  onlyMove?: string,
): Promise<Evaluation> {
  const key = JSON.stringify([
    ENGINE_VERSION,
    initialFen,
    moves,
    ms,
    onlyMove || "",
  ]);
  try {
    const result = await cached(key);
    if (result) {
      if (signal.aborted) throw new DOMException("Cancelled", "AbortError");
      return result;
    }
  } catch (e) {
    if (signal.aborted) throw e;
  }
  const value = await search({ initialFen, moves, turn, ms, onlyMove }, signal);
  try {
    await cache(key, value);
  } catch {
    /* Review still works when storage is unavailable. */
  }
  return value;
}
export async function reviewMove(
  pgn: string,
  ply: number,
  ms: number,
  signal: AbortSignal,
): Promise<MoveReview> {
  const game = new Chess();
  game.loadPgn(pgn);
  const history = game.history({ verbose: true }),
    move = history[ply - 1];
  if (!move) throw new Error("No move at this position.");
  const initialFen = history[0].before,
    prefix = history.slice(0, ply - 1).map(uci),
    played = uci(move);
  const best = await evaluate(initialFen, prefix, move.color, ms, signal);
  const actual =
    best.bestMove === played
      ? best
      : await evaluate(initialFen, prefix, move.color, ms, signal, played);
  return {
    ply,
    played,
    best,
    actual,
    ...classify(best.score, actual.score, move.color, best.bestMove === played),
    ms,
  };
}

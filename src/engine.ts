export const ENGINE_VERSION = "Stockfish 19 lite / 19.0.1";
export type Score = { type: "cp" | "mate"; value: number }; // Always White's perspective.
export type Evaluation = {
  score: Score;
  bestMove: string;
  pv: string[];
  depth: number;
};
export type Search = {
  initialFen: string;
  moves?: string[];
  turn: "w" | "b";
  ms: number;
  skill?: number;
  onlyMove?: string;
};
const engineUrl = "/engine/stockfish-19-lite-single.js";

// Each request owns its worker. Cancellation physically terminates the search,
// so an old bestmove can never be applied to a newer position.
export function search(
  options: Search,
  signal?: AbortSignal,
): Promise<Evaluation> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted)
      return reject(new DOMException("Cancelled", "AbortError"));
    const worker = new Worker(engineUrl);
    let latest: Omit<Evaluation, "bestMove"> | undefined;
    let settled = false,
      started = false;
    const finish = (result?: Evaluation, error?: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      worker.terminate();
      signal?.removeEventListener("abort", abort);
      if (error) reject(error);
      else resolve(result!);
    };
    const abort = () =>
      finish(undefined, new DOMException("Cancelled", "AbortError"));
    const timeout = setTimeout(
      () =>
        finish(
          undefined,
          new Error(
            "Stockfish took too long to respond. Try again or reload the app.",
          ),
        ),
      options.ms + 25000,
    );
    signal?.addEventListener("abort", abort, { once: true });
    worker.onerror = () =>
      finish(
        undefined,
        new Error(
          "Stockfish could not load. Run npm run engine:download, then reload.",
        ),
      );
    worker.onmessage = ({ data }) => {
      const line = String(data);
      if (line === "uciok") {
        worker.postMessage("setoption name Hash value 32");
        worker.postMessage(
          "setoption name Skill Level value " + (options.skill ?? 20),
        );
        worker.postMessage("isready");
      } else if (line === "readyok" && !started) {
        started = true;
        worker.postMessage(
          "position fen " +
            options.initialFen +
            (options.moves?.length ? " moves " + options.moves.join(" ") : ""),
        );
        worker.postMessage(
          "go movetime " +
            options.ms +
            (options.onlyMove ? " searchmoves " + options.onlyMove : ""),
        );
      } else if (
        line.startsWith("info ") &&
        !/lowerbound|upperbound/.test(line)
      ) {
        const score = line.match(/score (cp|mate) (-?\d+)/),
          pv = line.match(/\bpv (.+)/),
          depth = line.match(/\bdepth (\d+)/);
        if (score && pv)
          latest = {
            score: {
              type: score[1] as Score["type"],
              value: Number(score[2]) * (options.turn === "w" ? 1 : -1),
            },
            pv: pv[1].split(" "),
            depth: Number(depth?.[1] || 0),
          };
      } else if (line.startsWith("bestmove ")) {
        const bestMove = line.split(" ")[1];
        if (!latest || bestMove === "(none)" || bestMove === "0000")
          finish(
            undefined,
            new Error(
              "No playable engine line was returned for this position.",
            ),
          );
        else finish({ ...latest, bestMove });
      }
    };
    worker.postMessage("uci");
  });
}
export const scoreText = (score?: Score): string =>
  !score
    ? "—"
    : score.type === "mate"
      ? (score.value >= 0 ? "+M" : "−M") + Math.abs(score.value)
      : (score.value >= 0 ? "+" : "−") +
        (Math.abs(score.value) / 100).toFixed(2);
export const scoreNumber = (score?: Score): number =>
  !score
    ? 0
    : score.type === "mate"
      ? score.value >= 0
        ? 12
        : -12
      : score.value / 100;

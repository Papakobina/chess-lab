import { useEffect, useState } from "react";
import { Chess } from "chess.js";
import { outcome, uci } from "./chess";
import { search, type Evaluation } from "./engine";

// Results carry their position key so a previous search is never displayed
// against a board the user has already changed.
export function useVariationAnalysis(pgn: string | undefined, ms: number) {
  const [result, setResult] = useState<{
    pgn: string;
    evaluation?: Evaluation;
    error?: string;
  }>();
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    if (!pgn) return;
    const game = new Chess();
    game.loadPgn(pgn);
    if (game.isGameOver()) return;
    const controller = new AbortController();
    // Debounce rapid clicks before starting another worker.
    const timer = setTimeout(() => {
      const history = game.history({ verbose: true });
      search(
        {
          initialFen: history[0]?.before || game.fen(),
          moves: history.map(uci),
          turn: game.turn(),
          ms: Math.max(800, ms),
        },
        controller.signal,
      )
        .then((evaluation) => {
          if (!controller.signal.aborted) setResult({ pgn, evaluation });
        })
        .catch((error) => {
          if (!controller.signal.aborted)
            setResult({
              pgn,
              error:
                error instanceof Error
                  ? error.message
                  : "Could not analyze this position.",
            });
        });
    }, 150);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [pgn, ms, revision]);
  const game = new Chess();
  if (pgn) game.loadPgn(pgn);
  const terminal = pgn ? outcome(game) : undefined;
  const current = result?.pgn === pgn ? result : undefined;
  return {
    evaluation: terminal ? undefined : current?.evaluation,
    error: terminal ? undefined : current?.error,
    thinking: Boolean(pgn && !terminal && !current),
    terminal,
    retry: () => {
      setResult(undefined);
      setRevision((r) => r + 1);
    },
  };
}

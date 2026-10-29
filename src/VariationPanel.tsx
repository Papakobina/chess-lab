import { Chess } from "chess.js";
import {
  ArrowLeft,
  ArrowRight,
  FlaskConical,
  LoaderCircle,
  RotateCcw,
} from "lucide-react";
import { moveRoute } from "./MoveComparison";
import { lineSan } from "./chess";
import { scoreText, type Evaluation } from "./engine";

export function VariationPanel({
  game,
  basePly,
  evaluation,
  thinking,
  error,
  terminal,
  playLine,
  undo,
  retry,
  back,
}: {
  game: Chess;
  basePly: number;
  evaluation?: Evaluation;
  thinking: boolean;
  error?: string;
  terminal?: string;
  playLine: (index: number) => void;
  undo: () => void;
  retry: () => void;
  back: () => void;
}) {
  const moves = game.history().slice(basePly);
  return (
    <div className="live-variation">
      <div className="insight-title">
        <span className="grade-badge best">
          <FlaskConical size={17} />
        </span>
        <div>
          <strong>Explore this position</strong>
          <span>
            {terminal ||
              (game.turn() === "w" ? "White to move" : "Black to move")}
          </span>
        </div>
        <b className="eval-pill">
          {terminal ? "End" : scoreText(evaluation?.score)}
        </b>
      </div>
      <div className="branch-history" aria-label="Variation moves">
        <span>VARIATION</span>
        <p>
          {moves.length
            ? moves.join("  ")
            : "Starting position of this variation"}
        </p>
      </div>
      {thinking && (
        <p className="live-thinking" role="status">
          <LoaderCircle size={14} className="spin" />
          Finding the best continuation…
        </p>
      )}
      {error && (
        <>
          <p className="form-error" role="alert">
            {error}
          </p>
          <button className="text-button" onClick={retry}>
            <RotateCcw size={14} />
            Retry analysis
          </button>
        </>
      )}
      {terminal && <p>{terminal}. Step back to try another move.</p>}
      {evaluation && (
        <>
          <div className="best-move live-best-move">
            <div>
              <span>ENGINE’S BEST NEXT MOVE · DEPTH {evaluation.depth}</span>
              <strong>
                {lineSan(game.fen(), [evaluation.bestMove])[0]}{" "}
                <small>{scoreText(evaluation.score)}</small>
              </strong>
            </div>
            <div className="live-route">
              {moveRoute(game.fen(), evaluation.bestMove)}
            </div>
            <button className="button primary" onClick={() => playLine(0)}>
              Play move <ArrowRight size={15} />
            </button>
          </div>
          <div className="variation-line">
            {lineSan(game.fen(), evaluation.pv.slice(0, 8)).map(
              (san, index) => (
                <button
                  key={index}
                  onClick={() => playLine(index)}
                  title={"Play continuation through " + san}
                >
                  {san}
                </button>
              ),
            )}
          </div>
          <p>
            Play either side on the board, or follow the engine’s line. Analysis
            updates after every move.
          </p>
        </>
      )}
      <div className="variation-actions">
        <button
          className="button secondary"
          disabled={!moves.length}
          onClick={undo}
        >
          <RotateCcw size={14} />
          Step back
        </button>
        <button className="text-button" onClick={back}>
          <ArrowLeft size={14} />
          Back to game
        </button>
      </div>
    </div>
  );
}

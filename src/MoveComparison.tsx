import { Chess, type Square } from "chess.js";
import { ArrowRight, Check, Eye, Sparkles, UserRound } from "lucide-react";
import { lineSan } from "./chess";
import { scoreText } from "./engine";
import type { MoveReview } from "./review";

export function moveRoute(fen: string, move: string): string {
  const piece = new Chess(fen).get(move.slice(0, 2) as Square);
  const names = {
    p: "Pawn",
    n: "Knight",
    b: "Bishop",
    r: "Rook",
    q: "Queen",
    k: "King",
  };
  return (
    (piece ? names[piece.type] + " · " : "") +
    move.slice(0, 2) +
    " → " +
    move.slice(2, 4)
  );
}
export function MoveComparison({
  fen,
  san,
  review,
  preview,
  show,
  explore,
}: {
  fen: string;
  san: string;
  review: MoveReview;
  preview?: "played" | "best";
  show: (kind: "played" | "best") => void;
  explore: () => void;
}) {
  const same = review.played === review.best.bestMove;
  return (
    <section
      className="move-comparison-section"
      aria-label="Your move compared with engine best"
    >
      <div className="comparison-heading">
        <strong>Compare the moves</strong>
        {same && (
          <span>
            <Check size={12} />
            You found the best move
          </span>
        )}
      </div>
      <div className="move-comparison">
        <article
          className={
            "compare-card played " + (preview === "played" ? "previewing" : "")
          }
        >
          <div className="compare-label">
            <UserRound size={14} />
            YOUR MOVE
          </div>
          <div className="compare-notation">{san}</div>
          <div className="compare-route">{moveRoute(fen, review.played)}</div>
          <div className="compare-score">
            <span>White evaluation</span>
            <strong>{scoreText(review.actual.score)}</strong>
          </div>
          <button
            className="compare-show"
            aria-pressed={preview === "played"}
            onClick={() => show("played")}
          >
            <Eye size={14} />
            {preview === "played" ? "Showing on board" : "Show your move"}
          </button>
        </article>
        <article
          className={
            "compare-card recommended " +
            (preview === "best" ? "previewing" : "")
          }
        >
          <div className="compare-label">
            <Sparkles size={14} />
            ENGINE’S BEST
          </div>
          <div className="compare-notation">
            {lineSan(fen, [review.best.bestMove])[0]}
          </div>
          <div className="compare-route">
            {moveRoute(fen, review.best.bestMove)}
          </div>
          <div className="compare-score">
            <span>White evaluation</span>
            <strong>{scoreText(review.best.score)}</strong>
          </div>
          <button
            className="compare-show"
            aria-pressed={preview === "best"}
            onClick={() => show("best")}
          >
            <Eye size={14} />
            {preview === "best" ? "Showing on board" : "Show best move"}
          </button>
        </article>
      </div>
      <button className="button primary compare-explore" onClick={explore}>
        Play best move & explore <ArrowRight size={15} />
      </button>
      <p className="comparison-key">
        <span className="played-key" />
        Your move <span className="best-key" />
        Engine’s best <span>· Arrows show the position before the move.</span>
      </p>
    </section>
  );
}

import { useMemo } from "react";
import { Chess } from "chess.js";
import { BookOpen } from "lucide-react";
import { identifyOpening, type OpeningData } from "./openings";
export function OpeningBadge({
  game,
  data,
  error,
  browse,
}: {
  game: Chess;
  data?: OpeningData;
  error?: string;
  browse: (name: string) => void;
}) {
  const match = useMemo(() => identifyOpening(game, data), [game, data]);
  return (
    <div className="opening-badge">
      <BookOpen size={15} />
      {match ? (
        <button
          onClick={() => browse(match.opening.name)}
          title={
            match.exact
              ? "Named position on the board"
              : "Most recent named opening reached in this game"
          }
        >
          <strong>{match.opening.name}</strong>
          <span>
            {match.opening.eco} ·{" "}
            {match.exact ? "Current opening position" : "Last named position"}
          </span>
        </button>
      ) : (
        <div>
          <strong>
            {error
              ? "Opening names unavailable"
              : data
                ? "Starting position / unclassified line"
                : "Loading opening names…"}
          </strong>
          <span>
            {error || "Opening names appear as the position develops."}
          </span>
        </div>
      )}
    </div>
  );
}

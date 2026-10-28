import { useEffect, useState } from "react";
import { Chess } from "chess.js";

export type Opening = {
  id: string;
  eco: string;
  name: string;
  pgn: string;
  fen: string;
  sequence: string;
  plies: number;
};
export type OpeningData = {
  openings: Opening[];
  byPosition: Map<string, Opening[]>;
  revision: string;
};
let pending: Promise<OpeningData> | undefined;
export const positionKey = (fen: string) =>
  fen.split(" ").slice(0, 4).join(" ");
export function loadOpenings(): Promise<OpeningData> {
  if (!pending)
    pending = fetch("/openings.json")
      .then(async (response) => {
        if (!response.ok)
          throw new Error(
            "Opening database is missing. Run npm run openings:download, then reload.",
          );
        const data = (await response.json()) as {
          openings: Opening[];
          revision: string;
        };
        if (!Array.isArray(data.openings))
          throw new Error("Could not read the opening database.");
        const byPosition = new Map<string, Opening[]>();
        for (const opening of data.openings) {
          const list = byPosition.get(opening.fen) || [];
          list.push(opening);
          byPosition.set(opening.fen, list);
        }
        // A stable fallback for ambiguous names reached by a transposition.
        for (const list of byPosition.values())
          list.sort(
            (a, b) =>
              a.name.length - b.name.length || a.name.localeCompare(b.name),
          );
        return { ...data, byPosition };
      })
      .catch((error) => {
        pending = undefined;
        throw error;
      });
  return pending;
}
export function useOpenings() {
  const [data, setData] = useState<OpeningData>(),
    [error, setError] = useState<string>();
  useEffect(() => {
    let alive = true;
    loadOpenings()
      .then((value) => {
        if (alive) setData(value);
      })
      .catch((e) => {
        if (alive) setError(e.message);
      });
    return () => {
      alive = false;
    };
  }, []);
  return { data, error };
}
export function identifyOpening(
  game: Chess,
  data?: OpeningData,
): { opening: Opening; exact: boolean } | undefined {
  if (!data) return;
  const history = game.history({ verbose: true });
  for (let ply = history.length; ply >= 0; ply--) {
    const fen = ply ? history[ply - 1].after : history[0]?.before || game.fen();
    const choices = data.byPosition.get(positionKey(fen));
    if (!choices?.length) continue;
    const sequence = history
      .slice(0, ply)
      .map((m) => m.san)
      .join(" ");
    return {
      opening: choices.find((o) => o.sequence === sequence) || choices[0],
      exact: ply === history.length,
    };
  }
}
export function moveExplanation(game: Chess): string {
  const move = game.history({ verbose: true }).at(-1);
  if (!move)
    return "Start from the initial position. Step forward to see how this opening takes shape.";
  const color = move.color === "w" ? "White" : "Black";
  const piece = {
    p: "pawn",
    n: "knight",
    b: "bishop",
    r: "rook",
    q: "queen",
    k: "king",
  };
  if (move.flags.includes("k"))
    return (
      color +
      " castles kingside, moving the king toward safety and bringing the rook toward the center."
    );
  if (move.flags.includes("q"))
    return (
      color +
      " castles queenside, moving the king toward the queenside and bringing the rook to the d-file."
    );
  let text = move.captured
    ? color +
      " captures a " +
      piece[move.captured] +
      " on " +
      move.to +
      " with the " +
      piece[move.piece] +
      "."
    : move.piece === "p" && /[de][45]/.test(move.to)
      ? color +
        " advances the " +
        move.from[0] +
        "-pawn to " +
        move.to +
        ", staking a claim in the center."
      : (move.piece === "n" || move.piece === "b") &&
          /^[bcfg][18]$/.test(move.from)
        ? color + " develops a " + piece[move.piece] + " to " + move.to + "."
        : color +
          " moves the " +
          piece[move.piece] +
          " from " +
          move.from +
          " to " +
          move.to +
          ".";
  if (move.promotion)
    text += " The pawn promotes to a " + piece[move.promotion] + ".";
  if (move.san.endsWith("#")) text += " This is checkmate.";
  else if (move.san.endsWith("+")) text += " This gives check.";
  return text;
}
export function familyNote(name: string): string {
  const family = name.split(":")[0];
  if (/Scotch/.test(family))
    return "White challenges the center early with d4. Watch how the central pawn exchanges open lines for the pieces.";
  if (/Four Knights/.test(family))
    return "Both sides develop their knights early. Compare the central pawn breaks and the different squares available to the bishops.";
  if (/Italian/.test(family))
    return "White develops the bishop to c4, where it points toward f7. Notice how each side prepares to challenge the center.";
  if (/Ruy Lopez/.test(family))
    return "White places the bishop on b5, putting pressure on the knight that defends e5. Follow how Black responds to that pressure.";
  if (/Sicilian/.test(family))
    return "Black answers e4 with c5, creating an asymmetric position and contesting d4 with a flank pawn.";
  if (/French/.test(family))
    return "Black uses e6 and often d5 to challenge White’s center. Watch the pawn structure and the space available to each side.";
  if (/Caro-Kann/.test(family))
    return "Black uses c6 to support a central d5 advance. Follow the central exchanges and the development of Black’s light-squared bishop.";
  if (/Queen.s Gambit/.test(family))
    return "White’s c4 pawn challenges Black’s pawn on d5. Follow whether Black accepts the pawn and how White develops afterward.";
  if (/London/.test(family))
    return "White typically develops the bishop to f4 early. Watch how the central pawns support the developing pieces.";
  if (/King.s Indian/.test(family))
    return "Black typically develops the bishop through g7 while White builds a broad center. Watch where each side looks for pawn breaks.";
  return "Step through the named line and watch development, central pawn moves, captures, and king safety. Then explore the resulting position with Stockfish.";
}

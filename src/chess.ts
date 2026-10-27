import { Chess, type Move, type Color } from "chess.js";

export type Position = {
  fen: string;
  san?: string;
  uci?: string;
  from?: string;
  to?: string;
  color?: Color;
};
export const EXAMPLE_PGN =
  '[Event "A first look"]\n[White "You"]\n[Black "Stockfish"]\n[Result "*"]\n\n1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. Nc3 Nf6 5. Nd5 Nxe4 *';
export const uci = (m: Move) => m.from + m.to + (m.promotion || "");
export function parseGame(pgn: string): Chess {
  if (!pgn.trim()) throw new Error("Paste a PGN or a move list first.");
  const game = new Chess();
  try {
    game.loadPgn(pgn.trim());
  } catch {
    throw new Error(
      "Could not read this game. Paste PGN or numbered moves such as 1. e4 e5 2. Nf3 Nc6.",
    );
  }
  if (!game.history().length)
    throw new Error("This game has no moves to replay.");
  for (const [key, fallback] of [
    ["White", "White"],
    ["Black", "Black"],
  ]) {
    const value = game.getHeaders()[key];
    if (!value || value === "?") game.setHeader(key, fallback);
  }
  return game;
}
export function positions(game: Chess): Position[] {
  const history = game.history({ verbose: true });
  return [
    { fen: history[0]?.before || game.fen() },
    ...history.map((m) => ({
      fen: m.after,
      san: m.san,
      uci: uci(m),
      from: m.from,
      to: m.to,
      color: m.color,
    })),
  ];
}
export function atPly(pgn: string, ply: number): Chess {
  const source = new Chess();
  source.loadPgn(pgn);
  const moves = source.history({ verbose: true });
  const game = new Chess(moves[0]?.before || source.fen());
  for (const move of moves.slice(0, ply)) game.move(move.san);
  return game;
}
export function playUci(game: Chess, move: string) {
  return game.move({
    from: move.slice(0, 2),
    to: move.slice(2, 4),
    promotion: move.slice(4) || undefined,
  });
}
export function lineSan(fen: string, moves: string[]): string[] {
  const game = new Chess(fen),
    result: string[] = [];
  for (const move of moves) {
    try {
      result.push(playUci(game, move).san);
    } catch {
      break;
    }
  }
  return result;
}
export function outcome(game: Chess): string | undefined {
  if (game.isCheckmate())
    return game.turn() === "w"
      ? "Black wins by checkmate"
      : "White wins by checkmate";
  if (game.isStalemate()) return "Draw by stalemate";
  if (game.isThreefoldRepetition()) return "Draw by repetition";
  if (game.isInsufficientMaterial()) return "Draw by insufficient material";
  if (game.isDraw()) return "Draw";
}
export function resultFor(game: Chess): string {
  return game.isCheckmate()
    ? game.turn() === "w"
      ? "0-1"
      : "1-0"
    : game.isDraw()
      ? "1/2-1/2"
      : "*";
}
export function download(name: string, text: string, type = "text/plain") {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

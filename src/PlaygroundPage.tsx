import { useEffect, useMemo, useRef, useState } from "react";
import { Chess, type Color, type PieceSymbol, type Square } from "chess.js";
import { Chessboard } from "react-chessboard";
import {
  Eraser,
  FlaskConical,
  LoaderCircle,
  Play,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { lineSan } from "./chess";
import { search, scoreText, type Evaluation } from "./engine";

type PieceTool = { color: Color; type: PieceSymbol } | "erase" | undefined;

const pieces: Array<{ color: Color; type: PieceSymbol; glyph: string }> = [
  { color: "w", type: "k", glyph: "♔" },
  { color: "w", type: "q", glyph: "♕" },
  { color: "w", type: "r", glyph: "♖" },
  { color: "w", type: "b", glyph: "♗" },
  { color: "w", type: "n", glyph: "♘" },
  { color: "w", type: "p", glyph: "♙" },
  { color: "b", type: "k", glyph: "♚" },
  { color: "b", type: "q", glyph: "♛" },
  { color: "b", type: "r", glyph: "♜" },
  { color: "b", type: "b", glyph: "♝" },
  { color: "b", type: "n", glyph: "♞" },
  { color: "b", type: "p", glyph: "♟" },
];

const startFen = new Chess().fen();

function withTurn(game: Chess, turn: Color) {
  return `${game.fen().split(" ")[0]} ${turn} - - 0 1`;
}

function kingsOnly(turn: Color) {
  const game = new Chess();
  game.clear();
  game.put({ color: "w", type: "k" }, "e1");
  game.put({ color: "b", type: "k" }, "e8");
  return withTurn(game, turn);
}

function safeLine(fen: string, evaluation?: Evaluation) {
  if (!evaluation) return [];
  try {
    return lineSan(fen, evaluation.pv.slice(0, 8));
  } catch {
    return evaluation.pv.slice(0, 8);
  }
}

export function PlaygroundPage() {
  const [fen, setFen] = useState(startFen);
  const [turn, setTurn] = useState<Color>("w");
  const [orientation, setOrientation] = useState<"white" | "black">("white");
  const [tool, setTool] = useState<PieceTool>();
  const [evaluation, setEvaluation] = useState<Evaluation>();
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const game = useMemo(() => new Chess(fen), [fen]);

  useEffect(
    () => () => {
      abortRef.current?.abort();
    },
    [],
  );

  function positionChanged(next: Chess) {
    abortRef.current?.abort();
    setThinking(false);
    setEvaluation(undefined);
    setError("");
    setFen(withTurn(next, turn));
  }

  function movePiece(source: string, target: string) {
    if (source === target) return false;
    const next = new Chess(fen);
    const moving = next.get(source as Square);
    const captured = next.get(target as Square);
    if (!moving || captured?.type === "k") return false;
    next.remove(source as Square);
    next.remove(target as Square);
    if (!next.put(moving, target as Square)) return false;
    positionChanged(next);
    return true;
  }

  function placePiece(square: string) {
    if (!tool) return;
    const next = new Chess(fen);
    const existing = next.get(square as Square);
    if (tool === "erase") {
      if (existing?.type === "k") {
        setError(
          "Keep both kings on the board. Move a king instead of erasing it.",
        );
        return;
      }
      next.remove(square as Square);
    } else {
      if (existing?.type === "k" && tool.type !== "k") {
        setError("Move the king first; it cannot be covered by another piece.");
        return;
      }
      if (tool.type === "k") {
        for (const row of next.board())
          for (const piece of row)
            if (piece?.type === "k" && piece.color === tool.color)
              next.remove(piece.square);
      }
      next.remove(square as Square);
      next.put(tool, square as Square);
    }
    positionChanged(next);
  }

  function changeTurn(nextTurn: Color) {
    abortRef.current?.abort();
    setTurn(nextTurn);
    setFen(withTurn(new Chess(fen), nextTurn));
    setEvaluation(undefined);
    setThinking(false);
    setError("");
  }

  async function analyze() {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setThinking(true);
    setEvaluation(undefined);
    setError("");
    try {
      const result = await search(
        { initialFen: fen, turn, ms: 1200 },
        controller.signal,
      );
      if (!controller.signal.aborted) setEvaluation(result);
    } catch (reason) {
      if ((reason as Error).name !== "AbortError")
        setError(
          reason instanceof Error
            ? reason.message
            : "Stockfish could not analyze this position.",
        );
    } finally {
      if (!controller.signal.aborted) setThinking(false);
    }
  }

  const line = safeLine(fen, evaluation);
  const arrows = evaluation
    ? [
        {
          startSquare: evaluation.bestMove.slice(0, 2),
          endSquare: evaluation.bestMove.slice(2, 4),
          color: "#76a650ed",
        },
      ]
    : [];

  return (
    <div className="playground-grid">
      <section className="playground-board-card" aria-label="Position editor">
        <div className="playground-board-topline">
          <div>
            <span className="section-kicker">POSITION EDITOR</span>
            <strong>Arrange the board</strong>
          </div>
          <button
            className="button secondary compact-button"
            onClick={() =>
              setOrientation((value) => (value === "white" ? "black" : "white"))
            }
          >
            <RotateCcw size={15} /> Flip
          </button>
        </div>
        <div className="playground-board">
          <Chessboard
            options={{
              id: "chess-lab-playground-board",
              position: fen,
              boardOrientation: orientation,
              lightSquareStyle: { backgroundColor: "#e9eddd" },
              darkSquareStyle: { backgroundColor: "#81936c" },
              darkSquareNotationStyle: { color: "#edf1e3", fontSize: "11px" },
              lightSquareNotationStyle: { color: "#657953", fontSize: "11px" },
              arrows,
              allowDrawingArrows: true,
              allowDragging: !thinking,
              animationDurationInMs: 120,
              onPieceDrop: ({ sourceSquare, targetSquare }) =>
                targetSquare ? movePiece(sourceSquare, targetSquare) : false,
              onSquareClick: ({ square }) => placePiece(square),
            }}
          />
        </div>
        <p className="playground-board-help">
          Drag any piece anywhere. Choose a palette tool, then click a square to
          add or erase a piece.
        </p>
      </section>

      <aside className="playground-panel">
        <div className="playground-section">
          <span className="section-kicker">PIECE PALETTE</span>
          <div className="piece-palette" aria-label="Piece palette">
            {pieces.map((piece) => {
              const active =
                typeof tool === "object" &&
                tool.color === piece.color &&
                tool.type === piece.type;
              return (
                <button
                  key={piece.color + piece.type}
                  className={active ? "active" : ""}
                  onClick={() => setTool(active ? undefined : piece)}
                  aria-label={`Place ${piece.color === "w" ? "white" : "black"} ${piece.type}`}
                  aria-pressed={active}
                >
                  {piece.glyph}
                </button>
              );
            })}
            <button
              className={tool === "erase" ? "active erase" : "erase"}
              onClick={() => setTool(tool === "erase" ? undefined : "erase")}
              aria-label="Erase a piece"
              aria-pressed={tool === "erase"}
            >
              <Eraser size={18} />
            </button>
          </div>
        </div>

        <div className="playground-section">
          <span className="section-kicker">POSITION CONTROLS</span>
          <div className="turn-picker" aria-label="Side to move">
            <button
              className={turn === "w" ? "active" : ""}
              onClick={() => changeTurn("w")}
            >
              White to move
            </button>
            <button
              className={turn === "b" ? "active" : ""}
              onClick={() => changeTurn("b")}
            >
              Black to move
            </button>
          </div>
          <div className="playground-actions">
            <button
              className="button secondary"
              onClick={() => {
                setFen(withTurn(new Chess(startFen), turn));
                setEvaluation(undefined);
                setError("");
              }}
            >
              <RotateCcw size={15} /> Starting board
            </button>
            <button
              className="button secondary"
              onClick={() => {
                setFen(kingsOnly(turn));
                setEvaluation(undefined);
                setError("");
              }}
            >
              <Trash2 size={15} /> Kings only
            </button>
          </div>
        </div>

        <div className="playground-analysis">
          <div>
            <span className="section-kicker">STOCKFISH 19</span>
            <h2>What would the engine play?</h2>
            <p>Stockfish analyzes the exact position shown on the board.</p>
          </div>
          <button
            className="button primary playground-analyze"
            onClick={analyze}
            disabled={thinking}
          >
            {thinking ? (
              <>
                <LoaderCircle className="spin" size={17} /> Analyzing…
              </>
            ) : (
              <>
                <Play size={16} /> Analyze this position
              </>
            )}
          </button>
          {error && <div className="playground-error">{error}</div>}
          {evaluation && (
            <div className="playground-result" role="status">
              <div className="playground-best">
                <FlaskConical size={19} />
                <div>
                  <span>ENGINE’S BEST MOVE</span>
                  <strong>{line[0] || evaluation.bestMove}</strong>
                </div>
                <b>{scoreText(evaluation.score)}</b>
              </div>
              <div className="playground-line">
                <span>Suggested continuation</span>
                <div>
                  {line.map((move, index) => (
                    <span key={index}>{move}</span>
                  ))}
                </div>
              </div>
              <small>
                Depth {evaluation.depth} · Evaluation is from White’s
                perspective
              </small>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

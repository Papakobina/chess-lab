import { useEffect, useMemo, useState } from "react";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";
import {
  ArrowRight,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  FlaskConical,
  RotateCcw,
  Search,
} from "lucide-react";
import { atPly } from "./chess";
import {
  familyNote,
  moveExplanation,
  type OpeningData,
  type Opening,
} from "./openings";

const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['’]/g, "");
export function OpeningsPage({
  data,
  error,
  query,
  setQuery,
  explore,
}: {
  data?: OpeningData;
  error?: string;
  query: string;
  setQuery: (q: string) => void;
  explore: (pgn: string, name: string) => void;
}) {
  const [selectedId, setSelectedId] = useState<string>(),
    [ply, setPly] = useState(0),
    [limit, setLimit] = useState(40),
    [volume, setVolume] = useState("");
  const [orientation, setOrientation] = useState<"white" | "black">("white");
  const filtered = useMemo(() => {
    const terms = normalize(query).split(/\s+/).filter(Boolean);
    return (data?.openings || [])
      .filter(
        (o) =>
          (!volume || o.eco.startsWith(volume)) &&
          terms.every((term) =>
            normalize(o.name + " " + o.eco + " " + o.pgn).includes(term),
          ),
      )
      .sort((a, b) => a.name.localeCompare(b.name) || a.plies - b.plies);
  }, [data, query, volume]);
  const selected = useMemo(
    () =>
      data?.openings.find((o) => o.id === selectedId) ||
      data?.openings.find((o) => o.name === "Scotch Game") ||
      data?.openings[0],
    [data, selectedId],
  );
  const full = useMemo(() => {
    const g = new Chess();
    if (selected) g.loadPgn(selected.pgn);
    return g;
  }, [selected]);
  const history = full.history({ verbose: true }),
    board = useMemo(() => atPly(full.pgn(), ply), [full, ply]);
  const last = board.history({ verbose: true }).at(-1);
  const squareStyles = last
    ? {
        [last.from]: { backgroundColor: "#bdca83" },
        [last.to]: { backgroundColor: "#bdca83" },
      }
    : {};
  function choose(opening: Opening) {
    setSelectedId(opening.id);
    setPly(0);
  }
  useEffect(() => setLimit(40), [query, volume]);
  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      if (
        e.ctrlKey ||
        e.metaKey ||
        /INPUT|TEXTAREA|SELECT/.test((e.target as HTMLElement).tagName)
      )
        return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setPly((n) => Math.max(0, n - 1));
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        setPly((n) => Math.min(history.length, n + 1));
      }
    };
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, [history.length]);
  return (
    <div className="openings-page">
      <div className="opening-browser">
        <div className="opening-search">
          <label className="search-box">
            <Search size={17} />
            <input
              aria-label="Search openings"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Scotch, Sicilian, C45…"
            />
          </label>
          <label>
            <span className="sr-only">ECO volume</span>
            <select value={volume} onChange={(e) => setVolume(e.target.value)}>
              <option value="">All ECO</option>
              {["A", "B", "C", "D", "E"].map((v) => (
                <option key={v} value={v}>
                  {v}00–{v}99
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="opening-quick-filters">
          {["Scotch", "Italian", "Sicilian", "Queen's Gambit", "London"].map(
            (name) => (
              <button
                key={name}
                className={query === name ? "chosen" : ""}
                onClick={() => setQuery(query === name ? "" : name)}
              >
                {name}
              </button>
            ),
          )}
        </div>
        <div className="opening-results-header">
          <strong>
            {data
              ? filtered.length.toLocaleString() + " lines"
              : "Loading openings…"}
          </strong>
          <span>Search by name, moves, or ECO</span>
        </div>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="opening-results" aria-label="Opening search results">
          {data && !filtered.length && (
            <div className="empty-moves">
              No matching openings.
              <br />
              <span>Try a broader name or another ECO code.</span>
            </div>
          )}
          {filtered.slice(0, limit).map((o) => (
            <button
              key={o.id}
              className={
                "opening-result " + (selected?.id === o.id ? "selected" : "")
              }
              aria-pressed={selected?.id === o.id}
              onClick={() => choose(o)}
            >
              <div>
                <span className="opening-eco">{o.eco}</span>
                <strong>{o.name}</strong>
              </div>
              <p>{o.pgn}</p>
            </button>
          ))}
          {filtered.length > limit && (
            <button
              className="button secondary full-width"
              onClick={() => setLimit((n) => n + 40)}
            >
              Show 40 more lines
            </button>
          )}
        </div>
        <p className="opening-attribution">
          Names and lines:{" "}
          <a
            href="https://github.com/lichess-org/chess-openings"
            target="_blank"
            rel="noreferrer"
          >
            Lichess opening database
          </a>{" "}
          · CC0.
          <br />A named line is a reference, not a promise that every move is
          best.
        </p>
      </div>
      <section className="opening-study" aria-label="Opening study">
        {selected ? (
          <>
            <div className="opening-study-title">
              <span className="section-kicker">
                OPENING STUDY · {selected.eco}
              </span>
              <h2>{selected.name}</h2>
              <p>{familyNote(selected.name)}</p>
            </div>
            <div className="opening-study-board">
              <Chessboard
                options={{
                  id: "opening-study-board",
                  position: board.fen(),
                  boardOrientation: orientation,
                  allowDragging: false,
                  allowDrawingArrows: true,
                  lightSquareStyle: { backgroundColor: "#e9eddd" },
                  darkSquareStyle: { backgroundColor: "#81936c" },
                  squareStyles,
                  animationDurationInMs: 160,
                }}
              />
            </div>
            <div className="opening-study-controls">
              <button
                className="icon-button"
                aria-label="Flip study board"
                title="Flip study board"
                onClick={() =>
                  setOrientation((o) => (o === "white" ? "black" : "white"))
                }
              >
                <RotateCcw size={17} />
              </button>
              <div className="playback">
                <button
                  className="icon-button"
                  aria-label="Opening first move"
                  disabled={!ply}
                  onClick={() => setPly(0)}
                >
                  <ChevronsLeft size={20} />
                </button>
                <button
                  className="icon-button"
                  aria-label="Opening previous move"
                  disabled={!ply}
                  onClick={() => setPly((n) => n - 1)}
                >
                  <ChevronLeft size={20} />
                </button>
                <span>
                  {ply} / {history.length}
                </span>
                <button
                  className="icon-button"
                  aria-label="Opening next move"
                  disabled={ply === history.length}
                  onClick={() => setPly((n) => n + 1)}
                >
                  <ChevronRight size={20} />
                </button>
                <button
                  className="icon-button"
                  aria-label="Opening last move"
                  disabled={ply === history.length}
                  onClick={() => setPly(history.length)}
                >
                  <ChevronsRight size={20} />
                </button>
              </div>
              <span className="small-tag">
                {ply === history.length
                  ? "Line complete"
                  : board.turn() === "w"
                    ? "White to move"
                    : "Black to move"}
              </span>
            </div>
            <div className="opening-step-note" role="status">
              <BookOpen size={18} />
              <div>
                <strong>
                  {last
                    ? "Move " + Math.ceil(ply / 2) + " · " + last.san
                    : "The starting position"}
                </strong>
                <p>{moveExplanation(board)}</p>
              </div>
            </div>
            <div className="opening-moves" aria-label="Opening move sequence">
              <button
                className={ply === 0 ? "selected" : ""}
                onClick={() => setPly(0)}
              >
                Start
              </button>
              {history.map((m, i) => (
                <button
                  key={i}
                  className={ply === i + 1 ? "selected" : ""}
                  onClick={() => setPly(i + 1)}
                >
                  {m.color === "w" ? Math.ceil((i + 1) / 2) + ". " : ""}
                  {m.san}
                </button>
              ))}
            </div>
            <button
              className="button primary full-width"
              onClick={() => explore(board.pgn(), selected.name)}
            >
              <FlaskConical size={16} />
              Explore this position with Stockfish <ArrowRight size={16} />
            </button>
            <p className="field-help">
              Use ← → to replay. Explore lets you try either side and get a
              fresh engine suggestion after every move.
            </p>
          </>
        ) : (
          <div className="empty-library">
            <BookOpen size={35} />
            <h2>
              {error
                ? "Opening data unavailable"
                : "Preparing your opening library…"}
            </h2>
            <p>{error || "Select a named line to begin."}</p>
          </div>
        )}
      </section>
    </div>
  );
}

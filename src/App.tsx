import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { Chess, type Square } from "chess.js";
import { Chessboard } from "react-chessboard";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  CircleHelp,
  Clock3,
  Download,
  Flag,
  FlaskConical,
  FolderOpen,
  Lightbulb,
  LoaderCircle,
  Plus,
  RotateCcw,
  Save,
  Search,
  ShieldCheck,
  Sparkles,
  Swords,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import {
  atPly,
  download,
  EXAMPLE_PGN,
  lineSan,
  outcome,
  parseGame,
  playUci,
  positions,
  resultFor,
  uci,
} from "./chess";
import { search, scoreNumber, scoreText, type Evaluation } from "./engine";
import { reviewMove, type Grade, type MoveReview } from "./review";
import { deleteGame, listGames, saveGame, type SavedGame } from "./storage";

import { useVariationAnalysis } from "./useVariationAnalysis";
import { VariationPanel } from "./VariationPanel";

import { OpeningsPage } from "./OpeningsPage";
import { OpeningBadge } from "./OpeningBadge";
import { useOpenings } from "./openings";

type View = "review" | "play" | "library" | "openings";
type Modal = "import" | "new" | "help" | "resign" | null;
const grades: Grade[] = ["Best", "Good", "Inaccuracy", "Mistake", "Blunder"];
const symbols: Record<Grade, string> = {
  Best: "★",
  Good: "✓",
  Inaccuracy: "?!",
  Mistake: "?",
  Blunder: "??",
};
const difficultyName = (skill = 3) =>
  skill < 7 ? "Casual" : skill < 16 ? "Club" : "Strong";
const initial: SavedGame = {
  id: "example",
  pgn: EXAMPLE_PGN,
  title: "Your first analysis",
  source: "import",
  updatedAt: Date.now(),
  reviews: [],
};
const formatTime = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
};
const errorText = (e: unknown) =>
  e instanceof Error ? e.message : "Something went wrong. Please try again.";

function IconButton({
  label,
  children,
  onClick,
  disabled,
}: {
  label: string;
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      className="icon-button"
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
function Dialog({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    ref.current?.focus();
    const handle = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab") {
        const items = ref.current?.querySelectorAll<HTMLElement>(
          "button:not(:disabled), input, select, textarea, a[href]",
        );
        if (!items?.length) return;
        const first = items[0],
          last = items[items.length - 1];
        if (
          e.shiftKey &&
          (document.activeElement === first ||
            document.activeElement === ref.current)
        ) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", handle);
    return () => {
      document.removeEventListener("keydown", handle);
      previous?.focus();
    };
  }, []);
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        ref={ref}
        tabIndex={-1}
      >
        <div className="modal-title">
          <h2>{title}</h2>
          <IconButton label="Close dialog" onClick={onClose}>
            <X size={20} />
          </IconButton>
        </div>
        {children}
      </div>
    </div>
  );
}
function EvaluationChart({
  reviews,
  count,
  ply,
  select,
}: {
  reviews: MoveReview[];
  count: number;
  ply: number;
  select: (n: number) => void;
}) {
  const points = [...reviews].sort((a, b) => a.ply - b.ply),
    x = (n: number) => 12 + (n / Math.max(count, 1)) * 476;
  const y = (r: MoveReview) =>
    52 - Math.max(-6, Math.min(6, scoreNumber(r.actual.score))) * 6.5;
  const line = points.map((r) => x(r.ply) + "," + y(r)).join(" ");
  return (
    <div className="chart">
      <div className="chart-label">
        <span>POSITION EVALUATION</span>
        <span>White + / Black −</span>
      </div>
      <svg
        viewBox="0 0 500 105"
        role="img"
        aria-label="Evaluation graph. Click to select a move."
        onClick={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          select(
            Math.max(
              0,
              Math.min(
                count,
                Math.round(
                  ((((e.clientX - r.left) / r.width) * 500 - 12) / 476) * count,
                ),
              ),
            ),
          );
        }}
      >
        <line
          x1="12"
          y1="52"
          x2="488"
          y2="52"
          stroke="#d7dcd3"
          strokeDasharray="4 5"
        />
        {points.length > 0 && (
          <>
            <polygon
              points={
                x(points[0].ply) +
                ",52 " +
                line +
                " " +
                x(points.at(-1)!.ply) +
                ",52"
              }
              fill="#e0ead5"
            />
            <polyline
              points={line}
              fill="none"
              stroke="#6a8c48"
              strokeWidth="2.3"
              strokeLinejoin="round"
            />
            {points
              .filter((r) => r.grade === "Blunder" || r.grade === "Mistake")
              .map((r) => (
                <circle
                  key={r.ply}
                  cx={x(r.ply)}
                  cy={y(r)}
                  r="3.5"
                  fill={r.grade === "Blunder" ? "#c45f53" : "#d3923f"}
                />
              ))}
          </>
        )}
        <line x1={x(ply)} y1="9" x2={x(ply)} y2="95" stroke="#9aa791" />
        {!points.length && (
          <text x="250" y="37" textAnchor="middle" fill="#8b9385" fontSize="11">
            Analyze to see the story of your game
          </text>
        )}
      </svg>
      <div className="chart-axis">
        <span>Opening</span>
        <span>{Math.ceil(count / 2)} moves</span>
      </div>
    </div>
  );
}

export default function App() {
  const { data: openingData, error: openingError } = useOpenings();
  const [openingQuery, setOpeningQuery] = useState("");
  const [view, setView] = useState<View>("review"),
    [record, setRecord] = useState<SavedGame>(initial),
    [ply, setPly] = useState(10);
  const [orientation, setOrientation] = useState<"white" | "black">("white"),
    [modal, setModal] = useState<Modal>(null);
  const [importText, setImportText] = useState(""),
    [notice, setNotice] = useState(""),
    [noticeIsError, setNoticeIsError] = useState(false);
  const [busy, setBusy] = useState(false),
    [thinking, setThinking] = useState(false),
    [engineFailed, setEngineFailed] = useState(false);
  const [progress, setProgress] = useState(0),
    [analysisTime, setAnalysisTime] = useState(500),
    [hint, setHint] = useState<Evaluation>();
  const [branch, setBranch] = useState<{ pgn: string; basePly: number }>(),
    [selection, setSelection] = useState<string>();
  const [promotion, setPromotion] = useState<{ from: string; to: string }>(),
    [library, setLibrary] = useState<SavedGame[]>([]),
    [libraryQuery, setLibraryQuery] = useState("");
  const [newColor, setNewColor] = useState("w"),
    [newSkill, setNewSkill] = useState(3),
    [newClock, setNewClock] = useState(0);
  const [deleteId, setDeleteId] = useState<string>(),
    [savedAt, setSavedAt] = useState(0),
    [storageUnavailable, setStorageUnavailable] = useState(false);
  const reviewAbort = useRef<AbortController | null>(null),
    playAbort = useRef<AbortController | null>(null),
    hintAbort = useRef<AbortController | null>(null);
  const latestRecord = useRef(record);
  latestRecord.current = record;
  const selectedMoveRef = useRef<HTMLButtonElement>(null);
  const game = useMemo(() => {
    const g = new Chess();
    g.loadPgn(record.pgn);
    return g;
  }, [record.pgn]);
  const timeline = useMemo(() => positions(game), [game]),
    total = timeline.length - 1;
  const boardGame = useMemo(() => {
    if (branch) {
      const b = new Chess();
      b.loadPgn(branch.pgn);
      return b;
    }
    return atPly(record.pgn, Math.min(ply, total));
  }, [record.pgn, ply, total, branch]);
  const currentReview = record.reviews.find((r) => r.ply === ply),
    before = timeline[Math.max(0, ply - 1)],
    current = timeline[ply] || timeline[0],
    header = game.getHeaders();
  const activePlay = view === "play" && record.active && !record.endReason;
  const variation = useVariationAnalysis(
    view === "review" ? branch?.pgn : undefined,
    analysisTime,
  );
  const shownScore = branch
    ? variation.evaluation?.score
    : ply === 0
      ? record.reviews.find((r) => r.ply === 1)?.best.score
      : currentReview?.actual.score;
  const counts = grades.map(
    (grade) => record.reviews.filter((r) => r.grade === grade).length,
  );
  function announce(text: string, error = false) {
    setNotice(text);
    setNoticeIsError(error);
  }
  function stopAll() {
    reviewAbort.current?.abort();
    playAbort.current?.abort();
    hintAbort.current?.abort();
    setBusy(false);
    setThinking(false);
    setHint(undefined);
  }
  function navigate(n: number) {
    setPly(Math.max(0, Math.min(total, n)));
    setSelection(undefined);
    setBranch(undefined);
    setHint(undefined);
  }
  function persist(value = latestRecord.current) {
    if (value.id === "example") return;
    saveGame(value)
      .then(() => setSavedAt(Date.now()))
      .catch(() => {
        setStorageUnavailable(true);
        announce(
          "Browser storage is unavailable. Export your game to keep a copy.",
          true,
        );
      });
  }
  function switchView(next: View) {
    stopAll();
    setBranch(undefined);
    setSelection(undefined);
    setView(next);
    if (next === "play") {
      if (record.source !== "play") setModal("new");
      else setPly(total);
    }
  }
  useEffect(() => {
    if (record.id !== "example") persist(record);
  }, [record.id, record.pgn, record.reviews, record.active, record.endReason]);
  useEffect(() => {
    const timer = setInterval(() => {
      if (latestRecord.current.active) persist();
    }, 3000);
    const save = () => persist();
    window.addEventListener("pagehide", save);
    return () => {
      clearInterval(timer);
      window.removeEventListener("pagehide", save);
    };
  }, []);
  useEffect(() => {
    if (view === "library")
      listGames()
        .then(setLibrary)
        .catch(() => announce("Could not open browser storage.", true));
  }, [view, savedAt]);
  useEffect(() => {
    const button = selectedMoveRef.current,
      list = button?.closest(".move-list");
    if (!button || !list) return;
    const b = button.getBoundingClientRect(),
      l = list.getBoundingClientRect();
    if (b.top < l.top) list.scrollTop -= l.top - b.top;
    else if (b.bottom > l.bottom) list.scrollTop += b.bottom - l.bottom;
  }, [ply]);
  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      if (
        e.ctrlKey ||
        e.metaKey ||
        e.altKey ||
        modal ||
        promotion ||
        deleteId ||
        view === "library" ||
        view === "openings" ||
        /INPUT|TEXTAREA|SELECT/.test((e.target as HTMLElement).tagName)
      )
        return;
      const n =
        e.key === "ArrowLeft"
          ? ply - 1
          : e.key === "ArrowRight"
            ? ply + 1
            : e.key === "Home"
              ? 0
              : e.key === "End"
                ? total
                : undefined;
      if (n !== undefined) {
        e.preventDefault();
        navigate(n);
      }
    };
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, [ply, total, modal, promotion, deleteId, view]);
  useEffect(
    () => () => {
      reviewAbort.current?.abort();
      playAbort.current?.abort();
      hintAbort.current?.abort();
    },
    [],
  );
  // Practice clocks pause outside Play and while dialogs are open.
  useEffect(() => {
    if (!activePlay || !record.clockLimit || modal || promotion || engineFailed)
      return;
    let last = Date.now();
    const timer = setInterval(() => {
      const now = Date.now(),
        elapsed = now - last;
      last = now;
      setRecord((r) => {
        if (!r.active || !r.clocks) return r;
        const color = game.turn(),
          remaining = Math.max(0, r.clocks[color] - elapsed);
        if (remaining === 0) {
          const g = new Chess();
          g.loadPgn(r.pgn);
          g.setHeader("Result", color === "w" ? "0-1" : "1-0");
          return {
            ...r,
            pgn: g.pgn(),
            active: false,
            endReason: (color === "w" ? "Black" : "White") + " wins on time",
            clocks: { ...r.clocks, [color]: 0 },
            updatedAt: now,
          };
        }
        return { ...r, clocks: { ...r.clocks, [color]: remaining } };
      });
    }, 200);
    return () => clearInterval(timer);
  }, [activePlay, record.clockLimit, game, modal, promotion, engineFailed]);
  useEffect(() => {
    if (
      !activePlay ||
      game.turn() === record.player ||
      game.isGameOver() ||
      modal ||
      engineFailed
    )
      return;
    const controller = new AbortController();
    playAbort.current = controller;
    const id = record.id,
      pgn = record.pgn,
      moves = game.history({ verbose: true });
    setThinking(true);
    search(
      {
        initialFen: timeline[0].fen,
        moves: moves.map(uci),
        turn: game.turn(),
        ms: 650,
        skill: record.skill,
      },
      controller.signal,
    )
      .then((result) => {
        if (controller.signal.aborted) return;
        const g = new Chess();
        g.loadPgn(pgn);
        playUci(g, result.bestMove);
        const endReason = outcome(g);
        g.setHeader("Result", resultFor(g));
        setRecord((r) =>
          r.id === id && r.pgn === pgn
            ? {
                ...r,
                pgn: g.pgn(),
                reviews: [],
                updatedAt: Date.now(),
                active: !endReason,
                endReason,
              }
            : r,
        );
        setPly(g.history().length);
        setHint(undefined);
        setThinking(false);
      })
      .catch((e) => {
        if (e.name !== "AbortError") {
          announce(errorText(e), true);
          setEngineFailed(true);
          setThinking(false);
        }
      });
    return () => controller.abort();
  }, [
    record.id,
    record.pgn,
    record.player,
    record.skill,
    activePlay,
    modal,
    engineFailed,
  ]);
  function importGame(text = importText) {
    try {
      const g = parseGame(text),
        h = g.getHeaders();
      stopAll();
      persist();
      setRecord({
        id: crypto.randomUUID(),
        pgn: g.pgn(),
        title: (h.White || "White") + " vs " + (h.Black || "Black"),
        source: "import",
        updatedAt: Date.now(),
        reviews: [],
      });
      setPly(0);
      setView("review");
      setBranch(undefined);
      setModal(null);
      setImportText("");
      setNotice("");
    } catch (e) {
      announce(errorText(e), true);
    }
  }
  function newGame() {
    stopAll();
    persist();
    const color =
      newColor === "random"
        ? Math.random() > 0.5
          ? "w"
          : "b"
        : (newColor as "w" | "b");
    const g = new Chess();
    g.setHeader("White", color === "w" ? "You" : "Stockfish");
    g.setHeader("Black", color === "b" ? "You" : "Stockfish");
    g.setHeader("Event", "Chess Lab practice");
    g.setHeader("Result", "*");
    setRecord({
      id: crypto.randomUUID(),
      pgn: g.pgn(),
      title: "You vs Stockfish · " + difficultyName(newSkill),
      source: "play",
      updatedAt: Date.now(),
      reviews: [],
      active: true,
      player: color,
      skill: newSkill,
      clockLimit: newClock,
      clocks: { w: newClock * 1000, b: newClock * 1000 },
    });
    setView("play");
    setPly(0);
    setOrientation(color === "w" ? "white" : "black");
    setBranch(undefined);
    setModal(null);
    setNotice("");
    setEngineFailed(false);
  }
  function tryMove(from: string, to: string, promote?: string): boolean {
    if (
      view === "play" &&
      (!activePlay ||
        game.turn() !== record.player ||
        ply !== total ||
        thinking ||
        engineFailed)
    )
      return false;
    const candidate = boardGame
      .moves({ square: from as Square, verbose: true })
      .find((m) => m.to === to);
    if (!candidate) return false;
    if (candidate.promotion && !promote) {
      setPromotion({ from, to });
      return true;
    }
    const g = new Chess();
    g.loadPgn(view === "play" ? record.pgn : boardGame.pgn());
    try {
      g.move({ from, to, promotion: promote });
    } catch {
      return false;
    }
    setSelection(undefined);
    setHint(undefined);
    if (view === "review")
      setBranch({ pgn: g.pgn(), basePly: branch?.basePly ?? ply });
    else {
      hintAbort.current?.abort();
      const endReason = outcome(g);
      g.setHeader("Result", resultFor(g));
      setRecord((r) => ({
        ...r,
        pgn: g.pgn(),
        reviews: [],
        active: !endReason,
        endReason,
        updatedAt: Date.now(),
      }));
      setPly(g.history().length);
    }
    return true;
  }
  function clickSquare(square: string) {
    if (selection && tryMove(selection, square)) return;
    const piece = boardGame.get(square as Square);
    setSelection(piece?.color === boardGame.turn() ? square : undefined);
  }
  function takeBack() {
    stopAll();
    setEngineFailed(false);
    const g = new Chess();
    g.loadPgn(record.pgn);
    if (!g.history().length) return;
    g.undo();
    if (g.turn() !== record.player && g.history().length) g.undo();
    g.setHeader("Result", "*");
    setRecord((r) => ({
      ...r,
      pgn: g.pgn(),
      reviews: [],
      active: true,
      endReason: undefined,
      updatedAt: Date.now(),
    }));
    setPly(g.history().length);
  }
  function resign() {
    stopAll();
    const g = new Chess();
    g.loadPgn(record.pgn);
    g.setHeader("Result", record.player === "w" ? "0-1" : "1-0");
    setRecord((r) => ({
      ...r,
      pgn: g.pgn(),
      active: false,
      endReason:
        "You resigned. " +
        (record.player === "w" ? "Black" : "White") +
        " wins.",
      updatedAt: Date.now(),
    }));
    setModal(null);
  }
  async function getHint() {
    hintAbort.current?.abort();
    const controller = new AbortController();
    hintAbort.current = controller;
    setThinking(true);
    try {
      const result = await search(
        {
          initialFen: timeline[0].fen,
          moves: game.history({ verbose: true }).map(uci),
          turn: game.turn(),
          ms: 800,
        },
        controller.signal,
      );
      if (!controller.signal.aborted) setHint(result);
    } catch (e) {
      if ((e as Error).name !== "AbortError") announce(errorText(e), true);
    } finally {
      if (!controller.signal.aborted) setThinking(false);
    }
  }
  async function analyze(singlePly?: number) {
    reviewAbort.current?.abort();
    setBranch(undefined);
    const controller = new AbortController();
    reviewAbort.current = controller;
    const source = record.pgn,
      id = record.id,
      ms = singlePly ? Math.max(2500, analysisTime) : analysisTime;
    const targets = singlePly
      ? [singlePly]
      : Array.from({ length: total }, (_, i) => i + 1);
    setBusy(true);
    setProgress(0);
    setNotice("");
    try {
      for (let i = 0; i < targets.length; i++) {
        if (controller.signal.aborted) break;
        const p = targets[i],
          old = latestRecord.current.reviews.find((r) => r.ply === p);
        if (!old || old.ms < ms) {
          const result = await reviewMove(source, p, ms, controller.signal);
          if (controller.signal.aborted) break;
          setRecord((r) =>
            r.id === id
              ? {
                  ...r,
                  reviews: [
                    ...r.reviews.filter((v) => v.ply !== p),
                    result,
                  ].sort((a, b) => a.ply - b.ply),
                }
              : r,
          );
        }
        setProgress(i + 1);
      }
      if (!controller.signal.aborted)
        announce(
          singlePly
            ? "Deeper analysis complete."
            : "Review complete. Select any move to explore it.",
        );
    } catch (e) {
      if ((e as Error).name !== "AbortError") announce(errorText(e), true);
    } finally {
      if (reviewAbort.current === controller) setBusy(false);
    }
  }
  function followLine(index: number) {
    if (!currentReview) return;
    const g = atPly(record.pgn, ply - 1);
    for (const move of currentReview.best.pv.slice(0, index + 1)) {
      try {
        playUci(g, move);
      } catch {
        break;
      }
    }
    setBranch({ pgn: g.pgn(), basePly: ply - 1 });
    setSelection(undefined);
  }
  function playVariationLine(index: number) {
    if (!branch || !variation.evaluation) return;
    const g = new Chess();
    g.loadPgn(branch.pgn);
    for (const move of variation.evaluation.pv.slice(0, index + 1)) {
      try {
        playUci(g, move);
      } catch {
        break;
      }
    }
    setBranch({ ...branch, pgn: g.pgn() });
    setSelection(undefined);
  }
  function undoVariation() {
    if (!branch) return;
    const g = new Chess();
    g.loadPgn(branch.pgn);
    if (g.history().length > branch.basePly) g.undo();
    setBranch({ ...branch, pgn: g.pgn() });
    setSelection(undefined);
  }
  function exploreOpening(pgn: string, name: string) {
    stopAll();
    persist();
    const g = new Chess();
    g.loadPgn(pgn);
    g.setHeader("White", "White");
    g.setHeader("Black", "Black");
    g.setHeader("Event", name);
    setRecord({
      id: crypto.randomUUID(),
      pgn: g.pgn(),
      title: "Study · " + name,
      source: "import",
      updatedAt: Date.now(),
      reviews: [],
    });
    setPly(g.history().length);
    setView("review");
    setBranch({ pgn: g.pgn(), basePly: g.history().length });
    setSelection(undefined);
    setNotice("");
  }
  function saveCurrent() {
    const saved = {
      ...record,
      id: record.id === "example" ? crypto.randomUUID() : record.id,
      updatedAt: Date.now(),
    };
    setRecord(saved);
    persist(saved);
    announce("Game saved in this browser.");
  }
  async function backupImport(file: File) {
    try {
      const value: unknown = JSON.parse(await file.text());
      if (!Array.isArray(value) || value.length > 2000)
        throw new Error("Choose a Chess Lab JSON backup.");
      const checked = value.map((item: SavedGame) => {
        if (
          !item ||
          typeof item.pgn !== "string" ||
          typeof item.id !== "string" ||
          typeof item.title !== "string"
        )
          throw new Error("The backup contains an invalid game.");
        const g = new Chess();
        g.loadPgn(item.pgn);
        return {
          id: item.id,
          pgn: g.pgn(),
          title: item.title,
          source:
            item.source === "play" ? ("play" as const) : ("import" as const),
          updatedAt: Date.now(),
          reviews: [],
          active: false,
        } satisfies SavedGame;
      });
      for (const item of checked) await saveGame(item);
      setLibrary(await listGames());
      announce(
        "Restored " + checked.length + " games. Reviews can be regenerated.",
      );
    } catch (e) {
      announce(errorText(e), true);
    }
  }
  const squareStyles: Record<string, CSSProperties> = {},
    last = boardGame.history({ verbose: true }).at(-1);
  if (last) {
    squareStyles[last.from] = { backgroundColor: "#bdca83" };
    squareStyles[last.to] = { backgroundColor: "#bdca83" };
  }
  if (selection) {
    squareStyles[selection] = { backgroundColor: "#e2d28b" };
    for (const m of boardGame.moves({
      square: selection as Square,
      verbose: true,
    }))
      squareStyles[m.to] = {
        backgroundImage:
          "radial-gradient(circle, rgba(34,50,30,.27) 20%, transparent 22%)",
      };
  }
  if (boardGame.isCheck())
    for (const row of boardGame.board())
      for (const p of row)
        if (p?.type === "k" && p.color === boardGame.turn())
          squareStyles[p.square] = { backgroundColor: "#d99181" };
  const arrows = hint
    ? [
        {
          startSquare: hint.bestMove.slice(0, 2),
          endSquare: hint.bestMove.slice(2, 4),
          color: "#6f963be0",
        },
      ]
    : branch && variation.evaluation
      ? [
          {
            startSquare: variation.evaluation.bestMove.slice(0, 2),
            endSquare: variation.evaluation.bestMove.slice(2, 4),
            color: "#6f963be0",
          },
        ]
      : [];
  const playerRow = (color: "w" | "b") => {
    const name =
        header[color === "w" ? "White" : "Black"] ||
        (color === "w" ? "White" : "Black"),
      engine = record.source === "play" && color !== record.player;
    return (
      <div className="player-row">
        <div
          className={
            "avatar " + (color === "w" ? "white-avatar" : "black-avatar")
          }
        >
          {engine ? (
            <Swords size={21} />
          ) : (
            <span>{color === "w" ? "♔" : "♚"}</span>
          )}
        </div>
        <div>
          <strong>{name}</strong>
          <span>
            {engine
              ? difficultyName(record.skill) + " · Stockfish 19"
              : record.source === "play"
                ? "A little better, every game"
                : color === "w"
                  ? "White pieces"
                  : "Black pieces"}
          </span>
        </div>
        <div
          className={
            "clock " +
            (activePlay && game.turn() === color ? "clock-active" : "")
          }
        >
          <Clock3 size={15} />
          {record.clockLimit && record.clocks
            ? formatTime(record.clocks[color])
            : "∞"}
        </div>
      </div>
    );
  };
  const filtered = library.filter((g) =>
    g.title.toLowerCase().includes(libraryQuery.toLowerCase()),
  );
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            switchView("review");
          }}
        >
          <div className="brand-mark">
            <FlaskConical size={23} />
          </div>
          <span>
            chess<span className="brand-light">lab</span>
            <span className="brand-dot">.</span>
          </span>
        </a>
        <div className="nav-caption">YOUR WORKSPACE</div>
        <nav aria-label="Main navigation">
          {(
            [
              ["play", "Play Stockfish", Swords],
              ["review", "Game review", BookOpen],
              ["library", "Saved games", FolderOpen],
              ["openings", "Openings", Search],
            ] as const
          ).map(([key, label, Icon]) => (
            <button
              key={key}
              className={"nav-item " + (view === key ? "active" : "")}
              onClick={() => switchView(key)}
            >
              <Icon size={19} />
              {label}
            </button>
          ))}
        </nav>
        <div className="sidebar-note">
          <div className="mini-board">♞</div>
          <strong>
            Make your next
            <br />
            move a better one.
          </strong>
          <p>
            A space to play, explore,
            <br />
            and learn at your pace.
          </p>
        </div>
        <div className="sidebar-bottom">
          <button className="nav-item" onClick={() => setModal("help")}>
            <CircleHelp size={18} />
            How it works
          </button>
          <div className="local-status">
            <span
              className={"status-dot " + (storageUnavailable ? "warning" : "")}
            />
            <div>
              <strong>Saved on this browser</strong>
              <small>
                {storageUnavailable
                  ? "Storage unavailable"
                  : "Your games stay with you"}
              </small>
            </div>
          </div>
        </div>
      </aside>
      <main>
        <header className="topbar">
          <div className="breadcrumb">
            Workspace <ChevronRight size={14} />
            <strong>
              {view === "review"
                ? "Game review"
                : view === "play"
                  ? "Play Stockfish"
                  : view === "openings"
                    ? "Openings"
                    : "Saved games"}
            </strong>
          </div>
          <div className="topbar-right">
            <span className="engine-tag">
              <span className="status-dot" />
              Stockfish 19
            </span>
            <div className="profile">Y</div>
          </div>
        </header>
        <div className="page">
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                {view === "review"
                  ? "EVERY MOVE HAS A STORY"
                  : view === "play"
                    ? "YOUR NEXT CHALLENGE"
                    : view === "openings"
                      ? "EXPLORE THE FIRST MOVES"
                      : "YOUR PERSONAL COLLECTION"}
              </div>
              <h1>
                {view === "review"
                  ? "Find your next better move."
                  : view === "play"
                    ? "Take a seat. Make a move."
                    : view === "openings"
                      ? "Every opening starts a story."
                      : "Every game, a little progress."}
              </h1>
              <p>
                {view === "review"
                  ? "Explore your games, spot opportunities, and see what comes next."
                  : view === "play"
                    ? "A patient practice partner. A fresh position to explore."
                    : view === "openings"
                      ? "Find a line, understand its moves, and explore what comes next."
                      : "Pick up where you left off, or revisit what you learned."}
              </p>
            </div>
            <button
              hidden={view === "openings"}
              className="button primary heading-action"
              onClick={() => {
                setNotice("");
                setModal(view === "play" ? "new" : "import");
              }}
            >
              {view === "play" ? <Plus size={17} /> : <Upload size={17} />}
              {view === "play" ? "New game" : "Import game"}
            </button>
          </div>
          {notice && (
            <div
              className={"notice " + (noticeIsError ? "error" : "")}
              role={noticeIsError ? "alert" : "status"}
            >
              <span>{notice}</span>
              <IconButton label="Dismiss message" onClick={() => setNotice("")}>
                <X size={16} />
              </IconButton>
            </div>
          )}
          {view === "openings" ? (
            <OpeningsPage
              data={openingData}
              error={openingError}
              query={openingQuery}
              setQuery={setOpeningQuery}
              explore={exploreOpening}
            />
          ) : view === "library" ? (
            <div className="library">
              <div className="library-toolbar">
                <label className="search-box">
                  <Search size={17} />
                  <input
                    placeholder="Find a game…"
                    value={libraryQuery}
                    onChange={(e) => setLibraryQuery(e.target.value)}
                  />
                </label>
                <div className="button-group">
                  <button
                    className="button secondary"
                    onClick={() =>
                      download(
                        "chess-lab-backup.json",
                        JSON.stringify(library, null, 2),
                        "application/json",
                      )
                    }
                    disabled={!library.length}
                  >
                    <Download size={16} />
                    Back up games
                  </button>
                  <label className="button secondary file-button">
                    <Upload size={16} />
                    Restore
                    <input
                      type="file"
                      accept=".json"
                      onChange={(e) => {
                        if (e.target.files?.[0])
                          void backupImport(e.target.files[0]);
                        e.target.value = "";
                      }}
                    />
                  </label>
                </div>
              </div>
              {!filtered.length ? (
                <div className="empty-library">
                  <FolderOpen size={40} />
                  <h2>
                    {library.length
                      ? "No matching games"
                      : "Your collection starts here."}
                  </h2>
                  <p>
                    Import a game or play Stockfish. Your games will appear
                    here.
                  </p>
                  <button
                    className="button primary"
                    onClick={() => setModal("import")}
                  >
                    <Upload size={16} />
                    Import a game
                  </button>
                </div>
              ) : (
                <div className="game-grid">
                  {filtered.map((g) => (
                    <article className="game-card" key={g.id}>
                      <div className="game-card-icon">
                        {g.source === "play" ? (
                          <Swords size={25} />
                        ) : (
                          <BookOpen size={25} />
                        )}
                      </div>
                      <span className="small-tag">
                        {g.active
                          ? "In progress"
                          : g.source === "play"
                            ? "Practice"
                            : "Imported"}
                      </span>
                      <h3>{g.title}</h3>
                      <p>
                        {new Date(g.updatedAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}{" "}
                        ·{" "}
                        {g.reviews.length
                          ? g.reviews.length + " moves reviewed"
                          : "Ready to explore"}
                      </p>
                      <div className="game-card-footer">
                        <button
                          className="text-button"
                          onClick={() => {
                            stopAll();
                            setRecord(g);
                            const c = new Chess();
                            c.loadPgn(g.pgn);
                            setPly(g.active ? c.history().length : 0);
                            setView(g.active ? "play" : "review");
                            setBranch(undefined);
                            setEngineFailed(false);
                          }}
                        >
                          Open game <ArrowRight size={15} />
                        </button>
                        <IconButton
                          label={"Delete " + g.title}
                          onClick={() => setDeleteId(g.id)}
                        >
                          <Trash2 size={16} />
                        </IconButton>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="workspace-grid">
                <section className="board-section" aria-label="Chessboard">
                  {playerRow(orientation === "white" ? "b" : "w")}
                  <div className="board-wrap">
                    <div
                      className="evaluation-bar"
                      title={"White evaluation " + scoreText(shownScore)}
                    >
                      <div
                        className="evaluation-white"
                        style={{
                          height:
                            (shownScore
                              ? 50 + Math.tanh(scoreNumber(shownScore) / 4) * 46
                              : 50) + "%",
                        }}
                      />
                      <span>{scoreText(shownScore)}</span>
                    </div>
                    <div className="board-inner">
                      <Chessboard
                        options={{
                          id: "chess-lab-board",
                          position: boardGame.fen(),
                          boardOrientation: orientation,
                          lightSquareStyle: { backgroundColor: "#e9eddd" },
                          darkSquareStyle: { backgroundColor: "#81936c" },
                          darkSquareNotationStyle: {
                            color: "#edf1e3",
                            fontSize: "11px",
                            fontWeight: 600,
                          },
                          lightSquareNotationStyle: {
                            color: "#657953",
                            fontSize: "11px",
                            fontWeight: 600,
                          },
                          squareStyles,
                          arrows,
                          allowDrawingArrows: true,
                          animationDurationInMs: 180,
                          allowDragging:
                            view === "review" ||
                            Boolean(
                              activePlay &&
                                game.turn() === record.player &&
                                ply === total &&
                                !thinking,
                            ),
                          onPieceDrop: ({ sourceSquare, targetSquare }) =>
                            targetSquare
                              ? tryMove(sourceSquare, targetSquare)
                              : false,
                          onSquareClick: ({ square }) => clickSquare(square),
                        }}
                      />
                    </div>
                  </div>
                  {playerRow(orientation === "white" ? "w" : "b")}
                  <div className="board-controls">
                    <div className="button-group">
                      <IconButton
                        label="Flip board"
                        onClick={() =>
                          setOrientation((o) =>
                            o === "white" ? "black" : "white",
                          )
                        }
                      >
                        <RotateCcw size={17} />
                      </IconButton>
                      <IconButton
                        label="Export PGN"
                        onClick={() =>
                          download("chess-lab-game.pgn", record.pgn)
                        }
                      >
                        <Download size={17} />
                      </IconButton>
                    </div>
                    <div className="playback">
                      <IconButton
                        label="First move"
                        onClick={() => navigate(0)}
                        disabled={ply === 0}
                      >
                        <ChevronsLeft size={20} />
                      </IconButton>
                      <IconButton
                        label="Previous move"
                        onClick={() => navigate(ply - 1)}
                        disabled={ply === 0}
                      >
                        <ChevronLeft size={21} />
                      </IconButton>
                      <span>
                        {ply}
                        <span> / {total}</span>
                      </span>
                      <IconButton
                        label="Next move"
                        onClick={() => navigate(ply + 1)}
                        disabled={ply === total}
                      >
                        <ChevronRight size={21} />
                      </IconButton>
                      <IconButton
                        label="Last move"
                        onClick={() => navigate(total)}
                        disabled={ply === total}
                      >
                        <ChevronsRight size={20} />
                      </IconButton>
                    </div>
                    <IconButton label="Save game" onClick={saveCurrent}>
                      <Save size={17} />
                    </IconButton>
                  </div>
                  {branch ? (
                    <div className="exploration-banner">
                      <FlaskConical size={17} />
                      <span>Exploring a variation</span>
                      <button
                        onClick={() => {
                          setBranch(undefined);
                          setSelection(undefined);
                        }}
                      >
                        Back to game <ArrowLeft size={14} />
                      </button>
                    </div>
                  ) : (
                    <div className="board-hint">
                      {thinking ? (
                        <>
                          <LoaderCircle size={14} className="spin" />
                          Stockfish is thinking…
                        </>
                      ) : (
                        <>
                          <span className="keyboard-key">←</span>
                          <span className="keyboard-key">→</span> to explore
                          moves <span className="hint-divider">·</span>{" "}
                          Right-click to draw arrows
                        </>
                      )}
                    </div>
                  )}
                  {view === "review" && (
                    <EvaluationChart
                      reviews={record.reviews}
                      count={total}
                      ply={ply}
                      select={navigate}
                    />
                  )}
                </section>
                <aside className="review-panel">
                  <div className="panel-heading">
                    <div>
                      <span className="section-kicker">
                        {view === "review"
                          ? "GAME WORKSPACE"
                          : "PRACTICE SESSION"}
                      </span>
                      <h2>
                        {view === "review" ? "Game review" : "You vs Stockfish"}
                      </h2>
                    </div>
                    <span className="small-tag">
                      {record.id === "example"
                        ? "Example game"
                        : record.source === "play"
                          ? difficultyName(record.skill)
                          : "Imported PGN"}
                    </span>
                  </div>
                  {view === "review" ? (
                    <div className="analysis-toolbar">
                      <button
                        className="button primary"
                        onClick={() => {
                          if (busy) {
                            reviewAbort.current?.abort();
                            setBusy(false);
                          } else void analyze();
                        }}
                        disabled={!total}
                      >
                        {busy ? (
                          <>
                            <LoaderCircle className="spin" size={16} />
                            Stop · {progress}/{total}
                          </>
                        ) : (
                          <>
                            <Sparkles size={16} />
                            {record.reviews.length === total && total
                              ? "Review again"
                              : "Analyze game"}
                          </>
                        )}
                      </button>
                      <label className="analysis-quality">
                        <span className="sr-only">Analysis quality</span>
                        <select
                          value={analysisTime}
                          onChange={(e) =>
                            setAnalysisTime(Number(e.target.value))
                          }
                          disabled={busy}
                        >
                          <option value={500}>Quick · 0.5s</option>
                          <option value={1500}>Balanced · 1.5s</option>
                          <option value={3000}>Deep · 3s</option>
                        </select>
                      </label>
                    </div>
                  ) : (
                    <div className="play-status">
                      <div className="play-status-title">
                        {record.endReason ||
                          (record.source !== "play"
                            ? "Ready when you are."
                            : thinking
                              ? "Stockfish is thinking…"
                              : ply !== total
                                ? "Viewing an earlier position"
                                : game.turn() === record.player
                                  ? "Your move."
                                  : "Stockfish to move.")}
                      </div>
                      <p>
                        {record.endReason
                          ? "See what you can learn from this game."
                          : record.source !== "play"
                            ? "Start a game to choose your side and difficulty."
                            : "You play " +
                              (record.player === "w" ? "White" : "Black") +
                              (game.isCheck()
                                ? " · Check."
                                : " · Find your next move.")}
                      </p>
                      {record.endReason ? (
                        <button
                          className="button primary"
                          onClick={() => {
                            switchView("review");
                            void analyze();
                          }}
                        >
                          <Sparkles size={16} />
                          Review this game
                        </button>
                      ) : record.source !== "play" ? (
                        <button
                          className="button primary"
                          onClick={() => setModal("new")}
                        >
                          <Swords size={16} />
                          Start playing
                        </button>
                      ) : (
                        <div className="practice-actions">
                          <button
                            className="button secondary"
                            onClick={getHint}
                            disabled={
                              thinking ||
                              game.turn() !== record.player ||
                              ply !== total
                            }
                          >
                            <Lightbulb size={15} />
                            Hint
                          </button>
                          <button
                            className="button secondary"
                            onClick={takeBack}
                            disabled={!total}
                          >
                            <RotateCcw size={15} />
                            Take back
                          </button>
                          <IconButton
                            label="Resign"
                            onClick={() => setModal("resign")}
                          >
                            <Flag size={16} />
                          </IconButton>
                        </div>
                      )}
                      {hint && (
                        <div className="hint-result">
                          Try{" "}
                          <strong>
                            {lineSan(game.fen(), [hint.bestMove])[0]}
                          </strong>
                          . White evaluation: {scoreText(hint.score)}.
                        </div>
                      )}
                      {engineFailed && (
                        <button
                          className="text-button"
                          onClick={() => {
                            setEngineFailed(false);
                            setNotice("");
                          }}
                        >
                          Retry engine <RotateCcw size={14} />
                        </button>
                      )}
                    </div>
                  )}
                  {busy && (
                    <div className="progress-track">
                      <div
                        style={{
                          width: (progress / Math.max(total, 1)) * 100 + "%",
                        }}
                      />
                    </div>
                  )}
                  <OpeningBadge
                    game={boardGame}
                    data={openingData}
                    error={openingError}
                    browse={(name) => {
                      setOpeningQuery(name.split(":")[0]);
                      switchView("openings");
                    }}
                  />
                  <div className="moves-heading">
                    <span>MOVES</span>
                    <span>
                      {header.White || "White"}{" "}
                      <span className="versus">vs</span>{" "}
                      {header.Black || "Black"}
                      {header.Result && header.Result !== "*"
                        ? " · " + header.Result
                        : ""}
                    </span>
                  </div>
                  <div className="move-list" aria-label="Game moves">
                    {!total && (
                      <div className="empty-moves">
                        The board is yours.
                        <br />
                        <span>Make your first move to begin.</span>
                      </div>
                    )}
                    {Array.from({ length: Math.ceil(total / 2) }, (_, row) => (
                      <div className="move-row" key={row}>
                        <span className="move-number">{row + 1}.</span>
                        {[row * 2 + 1, row * 2 + 2].map((p) => {
                          const pos = timeline[p],
                            review = record.reviews.find((r) => r.ply === p);
                          if (!pos) return <span key={p} />;
                          return (
                            <button
                              ref={p === ply ? selectedMoveRef : undefined}
                              key={p}
                              className={
                                "move-cell " + (p === ply ? "selected" : "")
                              }
                              onClick={() => navigate(p)}
                              aria-label={
                                "Move " +
                                Math.ceil(p / 2) +
                                (p % 2 ? " White " : " Black ") +
                                pos.san
                              }
                              aria-current={p === ply ? "step" : undefined}
                            >
                              <span>{pos.san}</span>
                              {review && (
                                <span
                                  className={
                                    "grade-dot " + review.grade.toLowerCase()
                                  }
                                  title={review.grade}
                                >
                                  {symbols[review.grade]}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                  {view === "review" && (
                    <div className="move-insight">
                      {branch ? (
                        <VariationPanel
                          game={boardGame}
                          basePly={branch.basePly}
                          evaluation={variation.evaluation}
                          thinking={variation.thinking}
                          error={variation.error}
                          terminal={variation.terminal}
                          playLine={playVariationLine}
                          undo={undoVariation}
                          retry={variation.retry}
                          back={() => {
                            setBranch(undefined);
                            setSelection(undefined);
                          }}
                        />
                      ) : currentReview ? (
                        <>
                          <div className="insight-title">
                            <span
                              className={
                                "grade-badge " +
                                currentReview.grade.toLowerCase()
                              }
                            >
                              {symbols[currentReview.grade]}
                            </span>
                            <div>
                              <strong>
                                {current.san} is{" "}
                                {currentReview.grade === "Best"
                                  ? "the best move"
                                  : currentReview.grade === "Good"
                                    ? "a good move"
                                    : currentReview.grade === "Inaccuracy"
                                      ? "an inaccuracy"
                                      : "a " +
                                        currentReview.grade.toLowerCase()}
                                .
                              </strong>
                              <span>
                                Move {Math.ceil(ply / 2)} ·{" "}
                                {ply % 2 ? "White" : "Black"} · Depth{" "}
                                {currentReview.actual.depth}
                              </span>
                            </div>
                            <b className="eval-pill">
                              {scoreText(currentReview.actual.score)}
                            </b>
                          </div>
                          <p>
                            {currentReview.grade === "Best"
                              ? "This matches the engine’s top choice at this search depth."
                              : currentReview.grade === "Good"
                                ? "A strong alternative. The evaluation stays close to the engine’s preferred move."
                                : currentReview.loss >= 90000
                                  ? "This move changes a forced-mate outcome. Play through the line to see why."
                                  : "The engine preferred another continuation. Estimated loss: " +
                                    (currentReview.loss / 100).toFixed(2) +
                                    " pawns."}
                          </p>
                          <div className="best-move">
                            <div>
                              <span>ENGINE’S CHOICE</span>
                              <strong>
                                {
                                  lineSan(before.fen, [
                                    currentReview.best.bestMove,
                                  ])[0]
                                }{" "}
                                <small>
                                  {scoreText(currentReview.best.score)}
                                </small>
                              </strong>
                            </div>
                            <button
                              className="text-button"
                              onClick={() => followLine(0)}
                            >
                              Explore <ArrowRight size={15} />
                            </button>
                          </div>
                          <div className="variation-line">
                            {lineSan(
                              before.fen,
                              currentReview.best.pv.slice(0, 6),
                            ).map((san, i) => (
                              <button
                                key={i}
                                onClick={() => followLine(i)}
                                title={"Explore through " + san}
                              >
                                {san}
                              </button>
                            ))}
                          </div>
                          <button
                            className="text-button deeper"
                            onClick={() => void analyze(ply)}
                            disabled={busy}
                          >
                            <Search size={14} />
                            Analyze this move deeper
                          </button>
                        </>
                      ) : (
                        <div className="empty-insight">
                          <div className="insight-spark">
                            <Sparkles size={23} />
                          </div>
                          <h3>
                            {ply === 0
                              ? "Start with the whole picture."
                              : "There’s more to this move."}
                          </h3>
                          <p>
                            {ply === 0 && record.reviews.length
                              ? "Select a move to see its evaluation and the engine’s continuation."
                              : "Analyze the game to see the best moves, missed chances, and paths worth exploring."}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="panel-footer">
                    <ShieldCheck size={14} />
                    <span>
                      {record.id === "example"
                        ? "Try the example, or import your own game."
                        : storageUnavailable
                          ? "Export PGN to keep a copy."
                          : "Autosaved in this browser."}
                    </span>
                  </div>
                </aside>
              </div>
              {view === "review" && (
                <section className="summary-strip">
                  <div className="summary-intro">
                    <span className="section-kicker">AT A GLANCE</span>
                    <strong>Your game, in perspective.</strong>
                    <span>
                      {record.reviews.length} of {total} moves reviewed
                    </span>
                  </div>
                  {grades.map((grade, i) => (
                    <button
                      key={grade}
                      className="summary-stat"
                      disabled={!counts[i]}
                      title={"Jump to next " + grade.toLowerCase()}
                      onClick={() => {
                        const candidates = record.reviews.filter(
                          (r) => r.grade === grade,
                        );
                        navigate(
                          (candidates.find((r) => r.ply > ply) || candidates[0])
                            .ply,
                        );
                      }}
                    >
                      <span className={"grade-icon " + grade.toLowerCase()}>
                        {symbols[grade]}
                      </span>
                      <strong>{record.reviews.length ? counts[i] : "—"}</strong>
                      <span>
                        {grade === "Best"
                          ? "Best moves"
                          : grade === "Good"
                            ? "Good moves"
                            : grade === "Inaccuracy"
                              ? "Inaccuracies"
                              : grade === "Mistake"
                                ? "Mistakes"
                                : "Blunders"}
                      </span>
                    </button>
                  ))}
                </section>
              )}
              <div className="page-footnote">
                <span>Built for the love of the game.</span>
                <button onClick={() => setModal("help")}>
                  About analysis <CircleHelp size={13} />
                </button>
              </div>
            </>
          )}
        </div>
      </main>
      {modal === "import" && (
        <Dialog
          title="Bring your game to the lab."
          onClose={() => setModal(null)}
        >
          <p className="modal-description">
            Copy the PGN from Chess.com, or paste a numbered move list.
          </p>
          <label className="field-label" htmlFor="pgn">
            Game moves / PGN
          </label>
          <textarea
            id="pgn"
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            placeholder="1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5…"
            rows={8}
          />
          <div className="import-options">
            <label className="button secondary file-button">
              <Upload size={16} />
              Choose PGN file
              <input
                type="file"
                accept=".pgn,.txt"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    if (f.size > 2000000)
                      announce("Choose a PGN smaller than 2 MB.", true);
                    else setImportText(await f.text());
                  }
                }}
              />
            </label>
            <button
              className="text-button"
              onClick={() => setImportText(EXAMPLE_PGN)}
            >
              Use example game
            </button>
          </div>
          {noticeIsError && notice && (
            <p className="form-error" role="alert">
              {notice}
            </p>
          )}
          <button
            className="button primary full-width"
            onClick={() => importGame()}
          >
            Open game <ArrowRight size={16} />
          </button>
          <p className="privacy-note">
            Your game stays on this device. No account required.
          </p>
        </Dialog>
      )}
      {modal === "new" && (
        <Dialog title="A fresh board awaits." onClose={() => setModal(null)}>
          <p className="modal-description">
            Choose your practice partner. Hints and takebacks are always
            available.
          </p>
          <label className="field-label">Play as</label>
          <div className="segmented">
            {[
              ["w", "♔ White"],
              ["b", "♚ Black"],
              ["random", "Random"],
            ].map(([v, l]) => (
              <button
                key={v}
                className={newColor === v ? "chosen" : ""}
                onClick={() => setNewColor(v)}
              >
                {l}
              </button>
            ))}
          </div>
          <label className="field-label" htmlFor="difficulty">
            Engine strength
          </label>
          <select
            id="difficulty"
            value={newSkill}
            onChange={(e) => setNewSkill(Number(e.target.value))}
          >
            <option value={0}>Gentle · Skill 0</option>
            <option value={3}>Casual · Skill 3</option>
            <option value={10}>Club · Skill 10</option>
            <option value={20}>Strong · Skill 20</option>
          </select>
          <p className="field-help">
            Engine skill levels are not human Elo ratings.
          </p>
          <label className="field-label" htmlFor="time">
            Time per side
          </label>
          <select
            id="time"
            value={newClock}
            onChange={(e) => setNewClock(Number(e.target.value))}
          >
            <option value={0}>Untimed · room to think</option>
            <option value={180}>3 minutes</option>
            <option value={600}>10 minutes</option>
            <option value={1800}>30 minutes</option>
          </select>
          <p className="field-help">
            Practice clocks pause outside Play and while dialogs are open.
          </p>
          <button className="button primary full-width" onClick={newGame}>
            <Swords size={17} />
            Start game
          </button>
        </Dialog>
      )}
      {modal === "resign" && (
        <Dialog title="Finish this game?" onClose={() => setModal(null)}>
          <p className="modal-description">
            Resigning ends the practice game. You can review it afterward.
          </p>
          <button className="button primary full-width" onClick={resign}>
            <Flag size={16} />
            Resign game
          </button>
        </Dialog>
      )}
      {modal === "help" && (
        <Dialog title="Welcome to Chess Lab." onClose={() => setModal(null)}>
          <div className="help-content">
            <p>
              <strong>Play.</strong> Practice against Stockfish with adjustable
              skill, hints, and takebacks. Takebacks keep the current clock
              time.
            </p>
            <p>
              <strong>Review.</strong> Import one PGN game or a numbered move
              list. Analyze it, select a move, and explore a suggested line.
              Making moves in Review creates a temporary variation.
            </p>
            <p>
              <strong>Scores.</strong> Positive favors White; negative favors
              Black. +M means White has a forced mate, −M means Black does.
              Deeper searches can change the evaluation.
            </p>
            <p>
              <strong>Labels.</strong> Best matches the engine choice. Other
              moves are Good below 0.5 pawns lost, Inaccuracy below 1, Mistake
              below 2, and Blunder at 2 or more. Forced-mate changes are handled
              separately. These are our simple rules, not Chess.com’s ratings.
            </p>
            <p>
              <strong>Saves.</strong> Games and reviews stay in this browser’s
              IndexedDB. Clearing site data removes them. Export PGN or back up
              your library to keep another copy. Backup restore imports games;
              reviews can be regenerated.
            </p>
            <p>
              <strong>Engine.</strong> Stockfish 19 lite runs locally.{" "}
              <a
                href="https://github.com/nmrugg/stockfish.js/tree/v19.0.1"
                target="_blank"
                rel="noreferrer"
              >
                Source and build instructions
              </a>{" "}
              ·{" "}
              <a href="/engine/COPYING" target="_blank" rel="noreferrer">
                GPL v3 license
              </a>
              .
            </p>
          </div>
        </Dialog>
      )}
      {promotion && (
        <Dialog
          title="Choose your promotion."
          onClose={() => setPromotion(undefined)}
        >
          <div className="promotion-options">
            {[
              ["q", "Queen", "♛"],
              ["r", "Rook", "♜"],
              ["b", "Bishop", "♝"],
              ["n", "Knight", "♞"],
            ].map(([type, label, symbol]) => (
              <button
                key={type}
                onClick={() => {
                  tryMove(promotion.from, promotion.to, type);
                  setPromotion(undefined);
                }}
              >
                <span>{symbol}</span>
                {label}
              </button>
            ))}
          </div>
        </Dialog>
      )}
      {deleteId && (
        <Dialog
          title="Delete this saved game?"
          onClose={() => setDeleteId(undefined)}
        >
          <p className="modal-description">
            This removes its browser save. Export PGN first if you want a
            separate copy.
          </p>
          <button
            className="button danger full-width"
            onClick={async () => {
              try {
                await deleteGame(deleteId);
                if (record.id === deleteId) {
                  stopAll();
                  setRecord(initial);
                  setPly(10);
                }
                setLibrary(await listGames());
                setDeleteId(undefined);
              } catch (e) {
                announce(errorText(e), true);
              }
            }}
          >
            <Trash2 size={16} />
            Delete game
          </button>
        </Dialog>
      )}
    </div>
  );
}

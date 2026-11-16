# Chess Lab

A personal chess workspace: play Stockfish, import games, explore alternatives, and review your moves. React + TypeScript + Vite, with all chess computation and saves in your browser.

## Start locally

Requires Node.js 22+ (22.12 or newer recommended).

```sh
npm install
npm run engine:download
npm run dev
```

Open **http://127.0.0.1:5173**. On the original Windows machine, `Start-ChessLab.ps1` can also use the Node runtime bundled with Codex.

The server uses a fixed port. Use the same URL and browser profile each time: IndexedDB belongs to an origin, so `localhost` and `127.0.0.1` have different saves.

## Features

- **Play**: White, Black, or random side; four skill presets; untimed or 3/10/30-minute practice clocks; hints, takebacks, resignation, and post-game review.
- **Review**: paste a numbered move list, paste/upload one PGN game, step through the board, compare played and preferred moves, view an evaluation graph, and explore engine variations or your own moves with fresh analysis after every move.
- **Playground**: freely arrange pieces with drag-and-drop or a piece palette, choose the side to move, and ask Stockfish for the best move and continuation from that exact position.
- **Library**: automatic saves, reopen/resume games, PGN export, JSON backup, restore, and deletion.
- Responsive desktop/mobile interface, keyboard replay controls, promotion selection, and board arrows.

## How it fits together

```text
src/App.tsx       React screens, board interactions, play/review lifecycle
src/chess.ts      PGN parsing, positions, move conversion, game outcomes
src/engine.ts     Stockfish worker lifecycle and UCI messages
src/review.ts     Position analysis, caching, move classifications
src/storage.ts    IndexedDB schema and operations
src/styles.css   Responsive visual design
```

The board component draws pieces and reports interactions. **chess.js** validates and applies moves. **Stockfish** evaluates them. **IndexedDB**, via `idb`, persists records.

Each engine search owns a worker. Cancellation terminates it, preventing a stale response from making a move in a newer game. A full review uses a bounded pool of 2–4 workers, chosen from the browser's reported logical-core count, and saves partial results as positions finish. The main thread assigns each worker a different ply and restores results to move order. Search commands contain the initial FEN and move history so repetition context is preserved.

For each played move, the app searches the original position for the preferred move, then searches that same position restricted to the played move. Both use the selected time budget. Scores are normalized to White's perspective. If the played move is already the engine choice, its result is reused.

The cache key includes the engine build, initial position, move history, search budget, and any forced move. A deeper search has a separate cache entry.

## Reading a review

- Positive scores favor White; negative scores favor Black.
- `+M3` means White has a forced mate in 3; `−M3` means Black does.
- Best: matches the preferred move at this search depth.
- Good: under 0.50 pawns of estimated loss.
- Inaccuracy: 0.50–0.99 pawns.
- Mistake: 1.00–1.99 pawns.
- Blunder: at least 2.00 pawns, including losing or missing a forced-mate outcome.
- Maintaining the same forced-mate outcome is not penalized merely for mate distance.

These are simple, documented Chess Lab heuristics, not Chess.com's proprietary grading. Equal time budgets can reach different depths, and short searches can disagree. The move card reports depth and offers a deeper search.

## Storage and practice behavior

Games and reviews stay in this browser. They do not sync to other browsers or devices. Clearing site data can delete them. Export PGN or use Library → Back up games for a separate copy.

A JSON backup includes saved game records. Restore validates and imports game text; reviews are regenerated on demand and active clocks are not resumed from backups. Normal library reopening retains reviews and can resume active practice games.

Practice clocks pause outside Play, while a dialog is open, or after an engine failure. They continue while viewing earlier moves in Play. Takebacks do not refund time. They are training clocks rather than competitive tournament clocks.

Draw detection follows chess.js (including automatic repetition and fifty-move handling). No rated play, accounts, multiplayer, cloud sync, or LLM is involved.

## Build and checks

```sh
npm run build
npm run preview
```

Build includes TypeScript checking. No test framework or CI test suite is included. Validation focuses on the build and browser smoke checks of import, review, play, and save/reopen flows.

## Engine and dependency licenses

The app downloads the **Stockfish 19.0.1 lite single-threaded** JavaScript/WASM build from its official release. Engine binaries are generated local assets, excluded from Git. They are copied into `dist/engine` during the build.

- Exact engine source and build instructions: https://github.com/nmrugg/stockfish.js/tree/v19.0.1
- Release: https://github.com/nmrugg/stockfish.js/releases/tag/v19.0.1
- Stockfish is GPL v3; the download script includes its license in `public/engine/COPYING`, linked in the app.
- React, react-chessboard, idb, Vite, and Lucide use permissive licenses; chess.js uses BSD-2-Clause. Their package license files accompany installations.

An app-wide distribution license has not been selected. Stockfish remains available under GPL v3, and the opening-name dataset remains available under CC0-1.0 as described above.

## Live variation exploration

Click Explore on a reviewed move, or make a move directly on the Review board. The variation panel analyzes the current position automatically and shows the best next move for the side to play. Play move follows one engine move; clicking a continuation move plays through that point. Step back lets you try another move, and Back to game returns to the original game.

Each position change cancels the previous search. Results are keyed to the variation PGN, so a stale result cannot appear against a newer position. Checkmate and draw positions stop engine analysis and show the outcome. Variations are temporary and do not overwrite the saved game.

## Opening library and recognition

The Openings tab searches 3,865 named lines from the CC0 Lichess opening-name dataset. Search by name, ECO code, or move text, filter ECO volumes, select a reference line, and replay it move by move. Common opening families have short study prompts; each step has a factual description of the move. These are learning aids, not a complete annotated opening course.

Explore this position with Stockfish opens the currently displayed position in Review with live variation analysis. Studies are saved separately from the game you were viewing.

Play and Review display the most recent named position reached. Detection matches positions without FEN move counters, includes side to move, castling rights and legal en-passant rights, and prefers the exact move sequence when multiple names share a position. It handles transpositions and retains the last known opening after the game leaves the named lines.

- Source: https://github.com/lichess-org/chess-openings
- Pinned revision: f06a50d5c7c140e50b068049fa31d289e2c3d347
- License: CC0-1.0
- Regenerate: `npm run openings:download -- --force`
- `npm run dev` and `npm run build` prepare this data automatically if missing; generated `public/openings.json` is excluded from Git.
- `src/openings.ts` implements loading, recognition, and move descriptions; `src/OpeningsPage.tsx` contains the library; `src/OpeningBadge.tsx` labels game positions.

Names and lines are reference data and are not engine evaluations or win-rate statistics.


## Comparing moves visually

Reviewed moves show two large cards: Your move (amber) and Engine’s best (green). Each includes standard move notation, the piece and source/destination squares, and a score labeled from White’s perspective. Show your move / Show best move previews the pre-move board with the corresponding arrow; Back to game position restores normal replay. Previewing does not modify the game. Play best move & explore enters a live variation. Live exploration also uses a larger best-move display and square coordinates.

## Dark mode and easy Windows startup

Use the sun/moon toggle at the top right to switch between light and dark themes. The first visit follows the system preference; your choice is saved in localStorage. Theme changes preserve the current board and game.

On the original Windows computer, double-click **Start Chess Lab.cmd** in the project folder to start the local server. Keep its window open and visit http://127.0.0.1:5173/. Press Ctrl+C in that window to stop. The launcher uses the working Codex-bundled Node runtime when available. See **START-HERE.md** for exact steps and the standard npm workflow.

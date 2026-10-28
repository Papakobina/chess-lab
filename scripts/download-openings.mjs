import { readFile, writeFile, mkdir } from "node:fs/promises";
import { Chess } from "chess.js";

export const revision = "f06a50d5c7c140e50b068049fa31d289e2c3d347";
const destination = new URL("../public/openings.json", import.meta.url);
const existing = await readFile(destination, "utf8").catch(() => "");
if (
  existing &&
  JSON.parse(existing).revision === revision &&
  !process.argv.includes("--force")
) {
  console.log("Opening database is ready.");
} else {
  const openings = [];
  const files = await Promise.all(
    ["a", "b", "c", "d", "e"].map(async (letter) => {
      const response = await fetch(
        "https://raw.githubusercontent.com/lichess-org/chess-openings/" +
          revision +
          "/" +
          letter +
          ".tsv",
      );
      if (!response.ok)
        throw new Error(
          "Could not download opening volume " +
            letter +
            ": " +
            response.status,
        );
      return response.text();
    }),
  );
  for (const text of files)
    for (const line of text.trim().split(/\r?\n/).slice(1)) {
      const [eco, name, pgn] = line.split("\t");
      const game = new Chess();
      game.loadPgn(pgn);
      openings.push({
        id: String(openings.length),
        eco,
        name,
        pgn,
        fen: game.fen().split(" ").slice(0, 4).join(" "),
        sequence: game.history().join(" "),
        plies: game.history().length,
      });
    }
  await mkdir(new URL("../public/", import.meta.url), { recursive: true });
  await writeFile(
    destination,
    JSON.stringify({
      revision,
      source: "https://github.com/lichess-org/chess-openings",
      license: "CC0-1.0",
      openings,
    }),
  );
  console.log("Prepared " + openings.length + " named opening lines.");
}

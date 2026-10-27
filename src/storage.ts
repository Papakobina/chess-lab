import { openDB, type DBSchema } from "idb";
import type { Evaluation } from "./engine";
import type { MoveReview } from "./review";

export type SavedGame = {
  id: string;
  pgn: string;
  title: string;
  source: "import" | "play";
  updatedAt: number;
  reviews: MoveReview[];
  active?: boolean;
  player?: "w" | "b";
  skill?: number;
  clocks?: { w: number; b: number };
  clockLimit?: number;
  endReason?: string;
};
interface LabDB extends DBSchema {
  games: { key: string; value: SavedGame; indexes: { updatedAt: number } };
  analysis: { key: string; value: Evaluation };
}
const database = openDB<LabDB>("chess-lab", 1, {
  upgrade(db) {
    const games = db.createObjectStore("games", { keyPath: "id" });
    games.createIndex("updatedAt", "updatedAt");
    db.createObjectStore("analysis");
  },
});
export const saveGame = async (game: SavedGame) =>
  (await database).put("games", game);
export const listGames = async () =>
  (await (await database).getAllFromIndex("games", "updatedAt")).reverse();
export const deleteGame = async (id: string) =>
  (await database).delete("games", id);
export const cached = async (key: string) =>
  (await database).get("analysis", key);
export const cache = async (key: string, value: Evaluation) =>
  (await database).put("analysis", value, key);

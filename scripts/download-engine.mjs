import { mkdir, writeFile } from "node:fs/promises";
const destination = new URL("../public/engine/", import.meta.url);
await mkdir(destination, { recursive: true });
const release =
  "https://github.com/nmrugg/stockfish.js/releases/download/v19.0.1/";
for (const file of [
  "stockfish-19-lite-single.js",
  "stockfish-19-lite-single.wasm",
]) {
  console.log("Downloading " + file);
  const response = await fetch(release + file);
  if (!response.ok)
    throw new Error("Engine download failed: " + response.status);
  await writeFile(
    new URL(file, destination),
    Buffer.from(await response.arrayBuffer()),
  );
}
const license = await fetch(
  "https://raw.githubusercontent.com/nmrugg/stockfish.js/v19.0.1/Copying.txt",
);
if (!license.ok) throw new Error("Could not download the Stockfish license.");
await writeFile(new URL("COPYING", destination), await license.text());
console.log("Stockfish 19 lite is ready.");

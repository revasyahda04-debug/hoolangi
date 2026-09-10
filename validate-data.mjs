import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const file = path.join(here, "..", "src", "data", "questions.json");
const questions = JSON.parse(fs.readFileSync(file, "utf8"));

const errors = [];
if (!Array.isArray(questions)) errors.push("questions.json harus berupa array.");
if (questions.length < 20) errors.push(`Minimal 20 soal, saat ini ${questions.length}.`);

const ids = new Set();
for (const [index, q] of questions.entries()) {
  const where = `Soal indeks ${index}`;
  if (!Number.isInteger(q.id)) errors.push(`${where}: id harus integer.`);
  if (ids.has(q.id)) errors.push(`${where}: id ${q.id} duplikat.`);
  ids.add(q.id);
  if (!Array.isArray(q.words) || q.words.length < 3) errors.push(`${where}: words minimal 3 kata.`);
  if (typeof q.sentence !== "string" || !q.sentence.trim()) errors.push(`${where}: sentence kosong.`);
  if (typeof q.translation !== "string") errors.push(`${where}: translation harus string.`);
  if (Array.isArray(q.words) && q.words.some((w) => typeof w !== "string" || !w.trim())) {
    errors.push(`${where}: ada kata kosong/tidak valid.`);
  }
}

if (errors.length) {
  console.error("VALIDASI GAGAL:\n- " + errors.join("\n- "));
  process.exit(1);
}

console.log(`OK: ${questions.length} soal valid, semua ID unik.`);

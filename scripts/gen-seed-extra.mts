import fs from "fs";
import path from "path";
import mammoth from "mammoth";
import { parseExam } from "../src/lib/exam/pdf-template";
import type { Section } from "../src/lib/types";

const DL = "C:/Users/KEVIN GARCIA/Downloads";
// id estable ↔ archivo. El 4 lo cubre el seed existente (con imágenes).
const MAP: { id: string; title: string; file: string }[] = [
  { id: "seed-met-1", title: "Simulador MET 1", file: "SILUMADOR 1.docx" },
  { id: "seed-met-2", title: "Simulador MET 2", file: "SIMULADOR 2.docx" },
  { id: "seed-met-3", title: "Simulador MET 3", file: "SIMULADOR 3.docx" },
  { id: "seed-met-5", title: "Simulador MET 5", file: "SIMULADOR 5.docx" },
  { id: "seed-met-6", title: "Simulador MET 6", file: "SIMULADOR 6.docx" },
];

interface SeedExam {
  id: string;
  title: string;
  durationMinutes: number;
  sections: Section[];
}

async function main() {
  const out: SeedExam[] = [];
  for (const { id, title, file } of MAP) {
    const p = path.join(DL, file);
    const buffer = fs.readFileSync(p);
    const text = (await mammoth.extractRawText({ buffer })).value;
    const { sections } = parseExam(text, {});
    // Sanidad: ninguna sección debe traer imagen (docx = solo texto).
    const hasImg = sections.some(
      (s) =>
        s.passages?.some((pp) => pp.imageUrl) ||
        s.speakingTasks?.some((tt) => tt.imageUrl)
    );
    if (hasImg) throw new Error(`${file}: trae imágenes; requiere assets en public/seed`);
    out.push({ id, title, durationMinutes: 90, sections });
    const c: Record<string, number> = {};
    for (const s of sections)
      c[s.kind] =
        (s.writingTasks?.length ?? 0) +
        (s.items?.length ?? 0) +
        (s.speakingTasks?.length ?? 0) +
        (s.passages?.reduce((a, pp) => a + pp.items.length, 0) ?? 0);
    console.log(`${title}: ${JSON.stringify(c)}`);
  }
  const dest = path.join(process.cwd(), "src/lib/exam/seed-extra.json");
  fs.writeFileSync(dest, JSON.stringify(out, null, 2), "utf-8");
  const kb = (fs.statSync(dest).size / 1024).toFixed(0);
  console.log(`\n→ ${dest}  (${kb} KB, ${out.length} exámenes)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

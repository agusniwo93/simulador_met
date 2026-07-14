import fs from "fs";
import path from "path";
import sharp from "sharp";
import { extractDocx, parseExam } from "../src/lib/exam/pdf-template";
import type { Section } from "../src/lib/types";

const DL = "C:/Users/KEVIN GARCIA/Downloads";
const MAP: { id: string; slug: string; title: string; file: string }[] = [
  { id: "seed-met-1", slug: "met1", title: "Simulador MET 1", file: "SILUMADOR 1.docx" },
  { id: "seed-met-2", slug: "met2", title: "Simulador MET 2", file: "SIMULADOR 2.docx" },
  { id: "seed-met-3", slug: "met3", title: "Simulador MET 3", file: "SIMULADOR 3.docx" },
  { id: "seed-met-5", slug: "met5", title: "Simulador MET 5", file: "SIMULADOR 5.docx" },
  { id: "seed-met-6", slug: "met6", title: "Simulador MET 6", file: "SIMULADOR 6.docx" },
];

interface SeedExam {
  id: string;
  title: string;
  durationMinutes: number;
  sections: Section[];
}

async function main() {
  const out: SeedExam[] = [];
  for (const { id, slug, title, file } of MAP) {
    const buffer = fs.readFileSync(path.join(DL, file));
    const { text, images } = await extractDocx(buffer);

    // Comprime cada imagen a WebP (texto de los anuncios legible, ~100-200 KB).
    const dir = path.join(process.cwd(), "public/seed", slug);
    fs.mkdirSync(dir, { recursive: true });
    const urls: string[] = [];
    for (let i = 0; i < images.length; i++) {
      const name = `img${i + 1}.webp`;
      await sharp(images[i].buffer)
        .resize({ width: 1200, withoutEnlargement: true })
        .webp({ quality: 82 })
        .toFile(path.join(dir, name));
      urls.push(`/seed/${slug}/${name}`);
    }

    // Sustituye los marcadores de posición por la URL real de cada imagen.
    let marked = text;
    urls.forEach((u, i) => {
      marked = marked.split(`@@IMGREF${i}@@`).join(`@@IMG:${u}@@`);
    });

    const { sections } = parseExam(marked, {});

    const reading = sections.find((s) => s.kind === "reading");
    const speaking = sections.find((s) => s.kind === "speaking");
    const imgPassages = reading?.passages?.filter((p) => p.imageUrl).length ?? 0;
    const speakingPic = speaking?.speakingTasks?.some((t) => t.imageUrl) ?? false;

    const c: Record<string, number> = {};
    for (const s of sections)
      c[s.kind] =
        (s.writingTasks?.length ?? 0) +
        (s.items?.length ?? 0) +
        (s.speakingTasks?.length ?? 0) +
        (s.passages?.reduce((a, pp) => a + pp.items.length, 0) ?? 0);

    console.log(
      `${title}: ${JSON.stringify(c)} | anuncios-con-imagen=${imgPassages} | foto-speaking=${speakingPic ? "sí" : "NO"}`
    );
    if (imgPassages < 6) console.log(`  ⚠ se esperaban 6 anuncios con imagen`);
    if (!speakingPic) console.log(`  ⚠ falta la foto de Speaking`);

    out.push({ id, title, durationMinutes: 90, sections });
  }

  const dest = path.join(process.cwd(), "src/lib/exam/seed-extra.json");
  fs.writeFileSync(dest, JSON.stringify(out, null, 2), "utf-8");
  console.log(`\n→ ${dest}  (${(fs.statSync(dest).size / 1024).toFixed(0)} KB)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

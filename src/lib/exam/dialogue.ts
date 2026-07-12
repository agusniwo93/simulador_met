// Parte un guion de listening en turnos por hablante para leerlo como una
// conversación real: la etiqueta ("Woman:", "Man:", …) decide la voz y NO se
// pronuncia. Woman/Girl → mujer; Man/Boy → hombre. Compartido cliente/servidor.

export type DialogueSpeaker = "female" | "male" | "narrator";
export interface DialogueSeg {
  speaker: DialogueSpeaker;
  text: string;
}

export function parseDialogue(transcript: string): DialogueSeg[] {
  const labelRe = /^(woman|man|girl|boy|female|male|narrator|w|m|speaker\s*[12]?)\s*[:.\-–]\s*/i;
  const segs: DialogueSeg[] = [];
  let current: DialogueSpeaker = "narrator";
  for (const raw of transcript.split(/\n+/)) {
    const line = raw.trim();
    if (!line) continue;
    const m = line.match(labelRe);
    let text = line;
    if (m) {
      const label = m[1].toLowerCase().replace(/\s+/g, " ");
      current = /^(woman|girl|female|w|speaker 1)$/.test(label)
        ? "female"
        : /^(man|boy|male|m|speaker 2)$/.test(label)
        ? "male"
        : "narrator";
      text = line.slice(m[0].length).trim();
    }
    if (text) segs.push({ speaker: current, text });
  }
  return segs.length ? segs : [{ speaker: "narrator", text: transcript }];
}

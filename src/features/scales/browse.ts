/** Searching and summarizing the scale catalog for the scale browser. */
import { SCALES, TRADITION_BY_ID, scaleDeviations, scaleIntervals, type ScaleDef } from '../../theory/scales';
import { degreeName } from './scaleLogic';

/** Lowercase and strip diacritics and ayn/hamza marks, so "cargah" finds "Çargâh" and "ushaq" finds "ʿUshaq". */
export function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[ʿʾ'’]/g, '')
    .toLowerCase();
}

const INDEX = SCALES.map((s) => ({
  scale: s,
  name: normalize(s.name),
  aliases: (s.aliases ?? []).map(normalize),
  context: normalize(`${s.family} ${TRADITION_BY_ID[s.tradition].name} ${s.id}`),
}));

/** Scales matching every word of the query, best matches first. */
export function searchScales(query: string, limit = 60): ScaleDef[] {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const scored: Array<{ scale: ScaleDef; score: number }> = [];
  for (const e of INDEX) {
    let score = 0;
    let all = true;
    for (const w of words) {
      if (e.name.startsWith(w) || e.name.split(/[\s(]+/).some((part) => part.startsWith(w))) score += 3;
      else if (e.name.includes(w)) score += 2;
      else if (e.aliases.some((a) => a.includes(w))) score += 2;
      else if (e.context.includes(w)) score += 1;
      else {
        all = false;
        break;
      }
    }
    if (all) scored.push({ scale: e.scale, score });
  }
  return scored.sort((a, b) => b.score - a.score).slice(0, limit).map((x) => x.scale);
}

/** Degree labels in the scale's own tradition: "1 2 ♭3 ...", "S R G M P D N", "S R1 G3 M1 ...". */
export function formulaText(def: ScaleDef): string {
  const dev = scaleDeviations(def);
  return scaleIntervals(def)
    .map((iv, i) => degreeName(def, i, iv, dev[i] - dev[0]))
    .join(' ');
}

/** The scales of a tradition in catalog order, for previous and next buttons. */
export function traditionOrder(def: ScaleDef): ScaleDef[] {
  return SCALES.filter((s) => s.tradition === def.tradition);
}

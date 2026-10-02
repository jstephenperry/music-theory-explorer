import type { ScoreSpec } from '../../../theory/score';

/** A passage that can be highlighted on an excerpt (a motive, its inversion, a phrase member). */
export interface Layer {
  id: string;
  label: string;
  /** Color role: 'root', 'tone', 'alt', 'extra' or 'other'. */
  color: string;
  /** Note selector, see selectNotes in theory/score.ts. */
  select: string;
  description: string;
}

export interface ExcerptBracket {
  first: string;
  last: string;
  label: string;
  color?: string;
  row?: number;
  /** Shown only while this layer is switched on. */
  layer?: string;
}

/** A short passage from the classical repertoire, encoded by hand from public-domain sources. */
export interface Excerpt {
  id: string;
  composer: string;
  work: string;
  /** "Bars 1 to 7" */
  bars: string;
  spec: ScoreSpec;
  /** Quarter notes per minute. */
  tempo: number;
  /** How the encoding was checked. */
  source: string;
  layers?: Layer[];
  brackets?: ExcerptBracket[];
  /** Bars to keep together on a line when they fit (a phrase length). */
  barsPerLine?: number;
  /** Paragraphs explaining what to listen for. */
  commentary: string[];
}

/** Verification note for excerpts checked note by note against a Mutopia Project edition. */
export const MUTOPIA = (edition: string) =>
  `Encoded from the score and checked note by note against the ${edition} edition of the Mutopia Project (mutopiaproject.org). Ornaments are realized in playback with the diatonic neighbors of the key: trills from the main note, mordents to the lower neighbor.`;

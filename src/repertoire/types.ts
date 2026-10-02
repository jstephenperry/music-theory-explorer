import type { ScoreSpec } from '../theory/score';

/**
 * The repertoire: short passages from public-domain scores, encoded by hand, that the composition
 * rooms show and that the generators borrow motives and themes from. Each work is one file in this
 * directory. A `Work` is the music and its provenance; an `Analysis` is what a room says about it
 * (highlight layers, brackets, commentary). Replacing a work keeps the analysis shape, and
 * `repertoire.test.ts` reports every layer or bracket that no longer matches the notes.
 */
export interface Work {
  /** Registry key, for example "bwv772". */
  id: string;
  composer: string;
  title: string;
  /** Which bars are encoded, for example "Bars 1 to 7". */
  bars: string;
  spec: ScoreSpec;
  /** Quarter notes per minute. */
  tempo: number;
  /** How the encoding was checked. */
  provenance: string;
  /** Bars to keep together on a line when they fit (a phrase length). */
  barsPerLine?: number;
}

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

export interface Bracket {
  first: string;
  last: string;
  label: string;
  color?: string;
  row?: number;
  /** Shown only while this layer is switched on. */
  layer?: string;
}

export interface Analysis {
  layers?: Layer[];
  brackets?: Bracket[];
  /** Paragraphs explaining what to listen for. */
  commentary: string[];
}

export interface Excerpt {
  work: Work;
  analysis: Analysis;
}

/** Provenance note for works checked note by note against a Mutopia Project edition. */
export const MUTOPIA = (edition: string) => `Encoded from the score and checked note by note against the ${edition} edition of the Mutopia Project (mutopiaproject.org).`;

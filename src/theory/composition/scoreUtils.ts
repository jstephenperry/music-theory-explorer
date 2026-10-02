import { keyNotes, keySignatureFifths, type Key } from '../keys';
import { midi, mod, pc, pitchFromMidi, type Pitch } from '../notes';
import { notateVoice, scoreFromVoices, type Clef, type PlainNote, type Score, type ScoreNote } from '../score';
import type { ScoreBracket } from '../score';
import type { Motive } from '../composition/motive';

/** Spell a MIDI note as a pitch of the key when it belongs to it, otherwise with the key's preferred accidental. */
export function spellInKey(m: number, key: Key): Pitch {
  const scaleNote = keyNotes(key).find((n) => pc(n) === mod(m, 12));
  if (scaleNote) {
    const base = pitchFromMidi(m);
    // Octave belongs to the letter: find the octave that gives this MIDI number.
    for (const oct of [base.octave - 1, base.octave, base.octave + 1]) {
      const p = { ...scaleNote, octave: oct };
      if (midi(p) === m) return p;
    }
  }
  return pitchFromMidi(m, keySignatureFifths(key) < 0 ? 'flats' : 'sharps');
}

/** Treble or bass clef, whichever suits the average pitch. */
export function clefFor(pitches: Pitch[]): Clef {
  if (pitches.length === 0) return 'treble';
  const avg = pitches.reduce((a, p) => a + midi(p), 0) / pitches.length;
  return avg < 57 ? 'bass' : 'treble';
}

export interface Segment {
  label: string;
  notes: PlainNote[];
  color?: string;
}

/**
 * A one-staff score from consecutive segments, with a bracket over each segment and the notes of
 * each segment colored. Returns the note ids of every segment for playback highlighting.
 */
export function segmentsToScore(segments: Segment[], key: Key, time: [number, number]): { score: Score; brackets: ScoreBracket[]; colors: Record<string, string>; ids: string[][] } {
  const all = segments.flatMap((s) => s.notes);
  const notes = notateVoice(all, { time });
  const clef = clefFor(all.flatMap((n) => n.pitches));
  const score = scoreFromVoices(key, time, [{ clef, voices: [notes] }]);
  const brackets: ScoreBracket[] = [];
  const colors: Record<string, string> = {};
  const ids: string[][] = [];
  let t = 0;
  segments.forEach((seg, i) => {
    const len = seg.notes.reduce((a, n) => a + n.dur, 0);
    const inSeg = score.staves[0].voices[0].notes.filter((n: ScoreNote) => n.start >= t - 1e-6 && n.start < t + len - 1e-6);
    const pitched = inSeg.filter((n) => !n.rest);
    ids.push(pitched.map((n) => n.id));
    if (pitched.length) {
      brackets.push({ first: pitched[0].id, last: pitched[pitched.length - 1].id, label: seg.label, color: seg.color, row: i % 2 });
      if (seg.color) pitched.forEach((n) => (colors[n.id] = seg.color!));
    }
    t += len;
  });
  return { score, brackets, colors, ids };
}

/** A motive as plain notes for notation. */
export function motiveNotes(m: Motive): PlainNote[] {
  return m.map((n) => ({ pitches: n.pitch ? [n.pitch] : [], dur: n.dur }));
}

/** Alternating colors for consecutive segments. */
export const SEGMENT_COLORS = ['root', 'alt', 'extra', 'other', 'tone'];

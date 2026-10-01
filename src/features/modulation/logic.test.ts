import { describe, expect, it } from 'vitest';
import { makeKey, type Key } from '../../theory/keys';
import { midi, noteName, pc, type Note } from '../../theory/notes';
import {
  allStatuses,
  borrowedChords,
  buildExample,
  commonToneCandidates,
  compareKeys,
  continuation,
  dim7Candidates,
  findBorrowedPivots,
  findPivots,
  ger6Candidates,
  keyChords,
  keyParam,
  keyRelations,
  mapColumns,
  mapEntry,
  parseKeyParam,
  practicalSpelling,
  respellPitch,
  sequentialChain,
  techniqueStatus,
  TECHNIQUES,
  type TechniqueId,
} from './logic';

const names = (ns: Note[]) => ns.map((n) => noteName(n, false)).join(' ');
const C = makeKey('C');
const G = makeKey('G');
const Am = makeKey('A', 'minor');
const relIds = (a: Key, b: Key) => keyRelations(a, b).map((r) => r.id);

describe('key params', () => {
  it('round-trips keys through the URL format', () => {
    for (const s of ['C', 'F#m', 'Ebm', 'Bb', 'C#', 'Gb']) expect(keyParam(parseKeyParam(s)!)).toBe(s);
    expect(parseKeyParam('H')).toBeNull();
    expect(parseKeyParam('')).toBeNull();
  });
  it('respells theoretical keys', () => {
    expect(keyParam(practicalSpelling(makeKey('D#')))).toBe('Eb');
    expect(keyParam(practicalSpelling(makeKey('Db', 'minor')))).toBe('C#m');
    expect(keyParam(practicalSpelling(makeKey('E')))).toBe('E');
  });
});

describe('diatonic chord sets', () => {
  it('lists triads and sevenths of a major key', () => {
    const cs = keyChords(C);
    expect(cs).toHaveLength(14);
    expect(cs.find((c) => c.numeral === 'viiø7')!.chord.symbol).toBe('Bø7');
  });
  it('includes harmonic-minor V and vii° in minor keys', () => {
    const cs = keyChords(Am);
    const sym = (n: string) => cs.find((c) => c.numeral === n)!.chord.symbol;
    expect(sym('V')).toBe('E');
    expect(sym('v')).toBe('Em');
    expect(sym('vii°7')).toBe('G♯°7');
    expect(cs.find((c) => c.numeral === 'V7')!.source).toBe('harmonic');
  });
  it('borrows chords from the parallel key with mixture numerals', () => {
    const b = borrowedChords(C).map((c) => c.display);
    expect(b).toEqual(expect.arrayContaining(['iv', '♭VI', '♭VII', '♭III', 'ii°']));
    expect(b).not.toContain('V'); // harmonic minor V is already diatonic in C major
  });
});

describe('key relationships', () => {
  it('names common relations', () => {
    expect(relIds(C, G)).toEqual(expect.arrayContaining(['dominant', 'close']));
    expect(relIds(C, makeKey('F'))).toContain('subdominant');
    expect(relIds(C, Am)).toEqual(expect.arrayContaining(['relative', 'close']));
    expect(relIds(C, makeKey('C', 'minor'))).toContain('parallel');
    expect(relIds(C, makeKey('E'))).toContain('chromatic-mediant');
    expect(relIds(C, makeKey('Ab'))).toContain('chromatic-mediant');
    expect(relIds(C, makeKey('Eb', 'minor'))).toContain('doubly-chromatic-mediant');
    expect(relIds(C, makeKey('E', 'minor'))).toContain('diatonic-third');
    expect(relIds(C, makeKey('F#'))).toContain('tritone');
    expect(relIds(C, makeKey('Db'))).toContain('semitone-up');
    expect(relIds(C, makeKey('B'))).toContain('semitone-down');
    expect(relIds(C, makeKey('D'))).toContain('whole-step-up');
    expect(relIds(C, makeKey('Bb'))).toContain('whole-step-down');
    expect(relIds(makeKey('C#'), makeKey('Db'))).toEqual(['enharmonic']);
    expect(relIds(C, C)).toEqual(['same']);
  });
  it('compares signatures and common tones', () => {
    const cmp = compareKeys(C, makeKey('Eb'));
    expect(cmp.fifthsSteps).toBe(-3);
    expect(cmp.changedLetters.map((l) => l.letter).sort()).toEqual(['A', 'B', 'E']);
    expect(names(cmp.commonTriadTones)).toBe('G');
    expect(cmp.commonScaleTones).toHaveLength(4);
    expect(compareKeys(C, G).commonScaleTones).toHaveLength(6);
    expect(compareKeys(makeKey('B'), makeKey('Db')).fifthsSteps).toBe(2);
    const resp = compareKeys(makeKey('E'), makeKey('Ab')).respelledScaleTones.map((x) => `${noteName(x.from, false)}=${noteName(x.to, false)}`);
    expect(resp).toEqual(expect.arrayContaining(['G#=Ab', 'C#=Db']));
  });
});

describe('pivot chords', () => {
  it('finds all shared triads and sevenths between C and G', () => {
    const ps = findPivots(C, G);
    expect(ps.map((p) => p.id).sort()).toEqual(['I=IV', 'Imaj7=IVmaj7', 'V=I', 'iii7=vi7', 'iii=vi', 'vi7=ii7', 'vi=ii'].sort());
    expect(ps[0].rating).toBe('ideal');
    expect(ps[0].new.fn).toBe('predominant');
    expect(ps[ps.length - 1].id).toBe('V=I');
  });
  it('ranks a predominant in the new key first', () => {
    const ps = findPivots(Am, makeKey('C'));
    expect(ps[0].new.fn).toBe('predominant');
    expect(ps.some((p) => p.id === 'VII=V')).toBe(true);
  });
  it('includes harmonic-minor dominants as pivots', () => {
    // E major (V of A minor) is IV of B major.
    expect(findPivots(Am, makeKey('B')).map((p) => p.id)).toContain('V=IV');
  });
  it('finds none for distant keys', () => {
    expect(findPivots(C, makeKey('E'))).toHaveLength(0);
    expect(techniqueStatus('pivot', C, makeKey('E')).available).toBe(false);
  });
  it('finds borrowed pivots for modal interchange', () => {
    const ps = findBorrowedPivots(C, makeKey('Ab'));
    const ids = ps.map((p) => p.id);
    expect(ids).toEqual(expect.arrayContaining(['iv=vi', 'bVI=I', 'bIII=V']));
    expect(findBorrowedPivots(C, G)).toHaveLength(0);
  });
});

describe('examples', () => {
  it('pivot example: establish, pivot with dual label, cadence in the new key', () => {
    const ex = buildExample('pivot', C, G, 'vi=ii')!;
    const pivot = ex.steps.find((s) => s.role === 'pivot')!;
    expect(`${pivot.oldLabel} = ${pivot.newLabel}`).toBe('vi = ii');
    expect(ex.steps.slice(-2).map((s) => s.symbol)).toEqual(['D7', 'G']);
    expect(ex.steps.slice(0, 4).map((s) => s.oldLabel)).toEqual(['I', 'IV', 'V⁷', 'I']);
    expect(ex.pitches).toHaveLength(ex.steps.length);
    ex.pitches.forEach((ps) => expect(ps).toHaveLength(4));
  });
  it('pivot on the old tonic replaces the final tonic of the opening', () => {
    const ex = buildExample('pivot', C, G, 'I=IV')!;
    expect(ex.steps).toHaveLength(6);
    expect(ex.steps[3].role).toBe('pivot');
  });
  it('continuation leads from any pivot function to a cadence', () => {
    expect(continuation({ numeral: 'ii', fn: 'predominant', chordId: 'min' }, G)).toEqual(['V7', 'I']);
    expect(continuation({ numeral: 'vi', fn: 'submediant', chordId: 'min' }, G)).toEqual(['ii6', 'V7', 'I']);
    expect(continuation({ numeral: 'VI', fn: 'submediant', chordId: 'maj' }, Am)).toEqual(['iv', 'V7', 'i']);
    expect(continuation({ numeral: 'V7', fn: 'dominant', chordId: '7' }, G)).toEqual(['I']);
  });
  it('direct modulation starts a new phrase on the new tonic', () => {
    const ex = buildExample('direct', C, makeKey('E', 'minor'))!;
    const start = ex.steps.findIndex((s) => s.phraseStart);
    expect(start).toBe(4);
    expect(ex.steps[start].symbol).toBe('Em');
  });
  it('secondary dominant example labels the new V7 in both keys', () => {
    const ex = buildExample('secondary', C, G, 'V7')!;
    const p = ex.steps.find((s) => s.role === 'pivot')!;
    expect(p.symbol).toBe('D7');
    expect(p.oldLabel).toBe('V⁷/V');
    expect(p.newLabel).toBe('V⁷');
    const viio = buildExample('secondary', C, makeKey('E'), 'vii7')!;
    expect(viio.steps.find((s) => s.role === 'pivot')!.symbol).toBe('D♯°7');
  });
  it('common-tone example holds the shared tone as an audible, single bridge note', () => {
    const ex = buildExample('commonTone', C, makeKey('E'))!;
    expect(ex.heldPc).toBe(pc({ letter: 'E', acc: 0 }));
    const bridge = ex.steps.findIndex((s) => s.role === 'bridge');
    expect(ex.pitches[bridge]).toHaveLength(1);
    const held = ex.heldMidi!;
    expect(midi(ex.pitches[bridge][0])).toBe(held);
    expect(ex.pitches[bridge - 1].map(midi)).toContain(held);
    expect(ex.pitches[bridge + 1].map(midi)).toContain(held);
    expect(ex.steps[bridge + 1].symbol).toBe('E');
    expect(ex.heldSteps).toEqual(expect.arrayContaining([bridge - 1, bridge, bridge + 1]));
  });
  it('common-tone modulation to a chromatic mediant prefers the new tonic', () => {
    const c = commonToneCandidates(C, makeKey('Ab'))[0];
    expect(noteName(c.heldOld)).toBe('C');
    expect(c.target.numeral).toBe('I');
    // Respelling of the held tone: A♭ major to E major holds A♭ = G♯.
    const e = commonToneCandidates(makeKey('Ab'), makeKey('E'))[0];
    expect(noteName(e.heldOld, false)).toBe('Ab');
    expect(noteName(e.heldNew, false)).toBe('G#');
  });
  it('common-tone modulation is unavailable when nothing is shared', () => {
    expect(techniqueStatus('commonTone', C, makeKey('F#')).available).toBe(false);
  });
});

describe('enharmonic diminished seventh', () => {
  it('respells B°7 in C major as D°7 (vii°7 of E♭)', () => {
    const cs = dim7Candidates(C, makeKey('Eb'));
    expect(cs[0].oldNumeral).toBe('vii°7');
    expect(names(cs[0].oldChord.notes)).toBe('B D F Ab');
    expect(names(cs[0].newChord.notes)).toBe('D F Ab Cb');
    const ex = buildExample('dim7', C, makeKey('Eb'))!;
    expect(ex.enharmonic!.newNotes.map((n) => noteName(n, false))).toContain('Cb');
    // The respelled step sounds exactly the same pitches.
    const i = ex.steps.findIndex((s) => s.respell);
    expect(ex.pitches[i].map(midi)).toEqual(ex.pitches[i - 1].map(midi));
    expect(ex.pitches[i].some((p) => p.letter === 'C' && p.acc === -1)).toBe(true);
  });
  it('uses vii°7 of a secondary key when needed', () => {
    const cs = dim7Candidates(C, makeKey('E'));
    expect(cs[0].oldNumeral).toBe('vii°7/V');
    expect(names(cs[0].newChord.notes)).toBe('D# F# A C');
  });
  it('is available for every target from a major key except the same leading tone', () => {
    for (const t of ['Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B']) {
      expect(techniqueStatus('dim7', C, makeKey(t)).available).toBe(true);
    }
  });
  it('pitch-class sets match exactly', () => {
    for (const t of ['Db', 'E', 'F#', 'A']) {
      for (const c of dim7Candidates(C, makeKey(t, 'minor'))) {
        expect(c.oldChord.notes.map(pc).sort()).toEqual(c.newChord.notes.map(pc).sort());
      }
    }
  });
});

describe('enharmonic German sixth', () => {
  it('reinterprets V7 of C as the Ger+6 of B', () => {
    const cs = ger6Candidates(C, makeKey('B'));
    expect(cs[0].kind).toBe('v7-to-ger');
    expect(names(cs[0].oldChord.notes)).toBe('G B D F');
    expect(names(cs[0].newChord.notes)).toBe('G B D E#');
    const ex = buildExample('ger6', C, makeKey('B'))!;
    expect(ex.steps.map((s) => s.newLabel)).toContain('Cad⁶₄');
  });
  it('reinterprets the Ger+6 of C as V7 of D♭', () => {
    const cs = ger6Candidates(C, makeKey('Db'));
    const g = cs.find((c) => c.kind === 'ger-to-v7')!;
    expect(names(g.oldChord.notes)).toBe('Ab C Eb F#');
    expect(names(g.newChord.notes)).toBe('Ab C Eb Gb');
  });
  it('uses secondary dominants as German sixths', () => {
    const cs = ger6Candidates(C, makeKey('F#'));
    expect(cs[0].oldNumeral).toBe('V7/V');
    expect(names(cs[0].newChord.notes)).toBe('D F# A B#');
  });
  it('is unavailable for keys a fifth apart', () => {
    expect(techniqueStatus('ger6', C, G).available).toBe(false);
  });
});

describe('sequential modulation', () => {
  it('chains at least two dominants by falling fifths to the new V7', () => {
    const ch = sequentialChain(C, makeKey('Eb'))!;
    expect(ch.start.numeral).toBe('I');
    expect(ch.dominants.map((d) => d.chord.symbol)).toEqual(['F7', 'B♭7']);
    expect(ch.dominants[ch.dominants.length - 1].newLabel).toBe('V⁷');
    const g = sequentialChain(C, G)!;
    expect(g.start.numeral).toBe('iii');
    expect(g.dominants.map((d) => d.newLabel)).toEqual(['V⁷/V', 'V⁷']);
  });
  it('roots fall by perfect fifths throughout', () => {
    for (const t of ['E', 'F#', 'Db', 'A', 'Bb']) {
      const ch = sequentialChain(C, makeKey(t))!;
      const roots = [...ch.dominants.map((d) => d.chord.root), makeKey(t).tonic].map(pc);
      expect(ch.dominants.length).toBeGreaterThanOrEqual(2);
      for (let i = 1; i < roots.length; i++) expect((roots[i - 1] - roots[i] + 12) % 12).toBe(7);
      // The chain either falls a fifth from the start chord or opens with a secondary dominant of C.
      const fromStart = (pc(ch.start.chord.root) - roots[0] + 12) % 12 === 7;
      expect(fromStart || ch.dominants[0].oldLabel !== undefined).toBe(true);
      ch.dominants.forEach((d) => expect(d.chord.chordId).toBe('7'));
    }
  });
  it('adds ii7 chords in the ii-V pattern', () => {
    const ex = buildExample('sequential', C, makeKey('Eb'), 'iiV')!;
    expect(ex.steps.slice(4).map((s) => s.symbol)).toEqual(['Cm7', 'F7', 'Fm7', 'B♭7', 'E♭']);
  });
});

describe('modal interchange and truck driver', () => {
  it('builds a borrowed pivot example', () => {
    const ex = buildExample('mixture', C, makeKey('Ab'), 'bVI=I')!;
    const p = ex.steps.find((s) => s.role === 'pivot')!;
    expect(`${p.oldLabel} = ${p.newLabel}`).toBe('♭VI = I');
  });
  it('truck driver only moves up a semitone or whole step', () => {
    expect(techniqueStatus('truck', C, makeKey('Db')).available).toBe(true);
    expect(techniqueStatus('truck', C, makeKey('D')).available).toBe(true);
    expect(techniqueStatus('truck', C, makeKey('B')).available).toBe(false);
    const ex = buildExample('truck', C, makeKey('D'), 'v7')!;
    expect(ex.steps.map((s) => s.symbol)).toContain('A7');
  });
});

describe('every technique for every key pair', () => {
  const tonics = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
  const keys: Key[] = [...tonics.map((t) => makeKey(t)), ...tonics.map((t) => makeKey(t === 'Db' ? 'C#' : t === 'Ab' ? 'G#' : t, 'minor'))];
  it('builds valid examples whenever a technique is available', () => {
    for (const from of [C, Am, makeKey('Eb'), makeKey('F#', 'minor')]) {
      for (const to of keys) {
        for (const st of allStatuses(from, to)) {
          if (!st.available) {
            expect(st.reason.length).toBeGreaterThan(10);
            expect(buildExample(st.id, from, to)).toBeNull();
            continue;
          }
          const opts = st.options.length ? st.options.map((o) => o.id) : [undefined];
          for (const o of opts) {
            const ex = buildExample(st.id as TechniqueId, from, to, o)!;
            expect(ex.steps.length).toBeGreaterThan(4);
            expect(ex.pitches.length).toBe(ex.steps.length);
            // Ends on the new tonic triad.
            const last = ex.steps[ex.steps.length - 1];
            expect(pc(last.root)).toBe(pc(to.tonic));
            expect(last.chordId).toBe(to.mode === 'major' ? 'maj' : 'min');
            // Every sounding pitch belongs to its chord.
            ex.steps.forEach((s, i) => ex.pitches[i].forEach((p) => expect(s.notes.map(pc)).toContain(pc(p))));
          }
        }
      }
    }
  });
  it('same and enharmonic keys disable everything', () => {
    expect(allStatuses(C, C).every((s) => !s.available)).toBe(true);
    expect(allStatuses(makeKey('C#'), makeKey('Db')).every((s) => !s.available)).toBe(true);
  });
  it('direct and secondary dominant modulation are always available', () => {
    for (const to of keys) {
      if (pc(to.tonic) === 0 && to.mode === 'major') continue;
      expect(techniqueStatus('direct', C, to).available).toBe(true);
      expect(techniqueStatus('secondary', C, to).available).toBe(true);
    }
  });
  it('has nine techniques', () => {
    expect(TECHNIQUES).toHaveLength(9);
  });
});

describe('map', () => {
  it('centers columns on the source and pairs relative keys', () => {
    const cols = mapColumns(C, G);
    expect(cols).toHaveLength(12);
    const center = cols.find((c) => c.offset === 0)!;
    expect(keyParam(center.major)).toBe('C');
    expect(keyParam(center.minor)).toBe('Am');
    const plus1 = cols.find((c) => c.offset === 1)!;
    expect(keyParam(plus1.major)).toBe('G');
    expect(keyParam(plus1.minor)).toBe('Em');
    // Keeps the source's own spelling.
    expect(mapColumns(makeKey('F#'), C).some((c) => keyParam(c.major) === 'F#')).toBe(true);
  });
  it('counts pivots and available techniques', () => {
    const e = mapEntry(C, G);
    expect(e.pivots).toBe(7);
    expect(e.available).toEqual(expect.arrayContaining(['pivot', 'direct', 'secondary', 'commonTone', 'dim7', 'sequential']));
  });
  it('respells pitches without changing MIDI', () => {
    const p = respellPitch({ letter: 'B', acc: 0, octave: 3 }, { letter: 'C', acc: -1 });
    expect(p.octave).toBe(4);
    expect(midi(p)).toBe(59);
  });
});

import { describe, expect, it } from 'vitest';
import { makeKey } from './keys';
import { parseRoman } from './roman';
import { describeChord, detectCadence } from './harmony';

const C = makeKey('C', 'major');
const Cm = makeKey('C', 'minor');
const d = (n: string, k = C) => describeChord(parseRoman(n, k), k);

describe('describeChord', () => {
  it('classifies diatonic function', () => {
    expect(d('I').fn).toBe('tonic');
    expect(d('vi').fn).toBe('tonic');
    expect(d('ii7').fn).toBe('predominant');
    expect(d('IV').fn).toBe('predominant');
    expect(d('V7').fn).toBe('dominant');
    expect(d('vii°').fn).toBe('dominant');
    expect(d('V7', Cm).fn).toBe('dominant');
    expect(d('vii°7', Cm).fn).toBe('dominant');
    expect(d('iv', Cm).fn).toBe('predominant');
    expect(d('Cad64').fn).toBe('dominant');
  });
  it('labels borrowed chords with their source', () => {
    const iv = d('iv');
    expect(iv.fn).toBe('chromatic');
    expect(iv.role).toBe('Borrowed');
    expect(iv.source).toBe('C minor');
    expect(iv.tendency).toBe('predominant');
    expect(d('bVI').source).toBe('C minor');
    expect(d('II').source).toBe('C Lydian');
    expect(d('bII').source).toBe('C Phrygian');
    expect(d('IV', Cm).source).toBe('C major');
    expect(d('I', Cm).role).toBe('Picardy third');
    expect(d('vii°7').source).toBe('C minor (harmonic)');
  });
  it('labels secondary and substitute dominants', () => {
    expect(d('V7/ii').role).toBe('Secondary dominant');
    expect(d('vii°7/V').role).toBe('Secondary leading-tone');
    expect(d('bII7/V').role).toBe('Tritone substitute');
    expect(d('bII7').role).toBe('Tritone substitute');
    expect(d('bVII7').role).toBe('Backdoor dominant');
    expect(d('III7').role).toBe('Secondary dominant');
    expect(d('II7').role).toBe('Secondary dominant');
    expect(d('bIII7').role).toBe('Tritone substitute');
    expect(d('IV7').role).toBe('Blues subdominant');
  });
  it('labels special chromatic chords', () => {
    expect(d('N6').role).toBe('Neapolitan');
    expect(d('Ger+6').role).toBe('Augmented sixth');
    expect(d('III').role).toBe('Chromatic mediant');
    expect(d('VI').role).toBe('Chromatic mediant');
    expect(d('#iv°7').role).toBe('Passing diminished');
    expect(d('I+').role).toBe('Augmented');
  });
});

describe('detectCadence', () => {
  const cad = (s: string, k = C, sop?: number) => detectCadence(s.split(' ').map((n) => parseRoman(n, k)), k, sop).id;
  it('finds authentic cadences', () => {
    expect(cad('IV V7 I', C, 0)).toBe('pac');
    expect(cad('IV V7 I', C, 4)).toBe('iac');
    expect(cad('IV V6 I', C, 0)).toBe('iac');
    expect(cad('iv V7 i', Cm, 0)).toBe('pac');
  });
  it('finds other cadences', () => {
    expect(cad('I IV I')).toBe('plagal');
    expect(cad('I iv I')).toBe('plagal');
    expect(cad('I ii V')).toBe('half');
    expect(cad('i iv6 V', Cm)).toBe('phrygian');
    expect(cad('I V7 vi')).toBe('deceptive');
    expect(cad('I V7 bVI')).toBe('deceptive');
    expect(cad('iv7 bVII7 I')).toBe('backdoor');
    expect(cad('ii7 bII7 Imaj7')).toBe('tritone');
    expect(cad('I vi')).toBe('none');
    expect(cad('I')).toBe('none');
  });
});

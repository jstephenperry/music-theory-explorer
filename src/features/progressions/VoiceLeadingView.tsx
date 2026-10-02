import { useMemo } from 'react';
import { Tag } from '../../components/ui';
import { midi, pitchName } from '../../theory/notes';
import { analyzeVoiceLeading, formatSemis, voiceName } from './voiceLeading';
import { cx } from './classes';
import type { LabChord } from './parts';
import s from './Progressions.module.css';

const VOICE_COLORS = ['var(--royal)', 'var(--verdigris)', 'var(--plum)', 'var(--accent)'];

export function VoiceLeadingView({ chords, active, onSelect }: { chords: LabChord[]; active: number | null; onSelect: (i: number) => void }) {
  const voicings = useMemo(() => chords.map((c) => c.voicing), [chords]);
  const transitions = useMemo(() => analyzeVoiceLeading(voicings), [voicings]);
  if (chords.length === 0) return null;
  const nVoices = voicings[0].length;
  const all = voicings.flat().map(midi);
  const lo = Math.min(...all) - 2;
  const hi = Math.max(...all) + 2;
  const colW = 100;
  const padL = 34;
  const top = 34;
  const plotH = 230;
  const W = padL + chords.length * colW + 10;
  const H = top + plotH + 14;
  const x = (i: number) => padL + i * colW + colW / 2;
  const y = (m: number) => top + ((hi - m) / (hi - lo)) * plotH;
  const flagged = new Set<string>();
  transitions.forEach((t) => t.warnings.forEach((w) => (w.kind === 'parallel5' || w.kind === 'parallel8') && w.voices.forEach((v) => flagged.add(`${t.from}:${v}`))));
  const totalWarnings = transitions.reduce((a, t) => a + t.warnings.length, 0);
  const cLines = [];
  for (let m = Math.ceil(lo / 12) * 12; m <= hi; m += 12) cLines.push(m);

  return (
    <div className={s.vl}>
      <div className={s.vlLegend}>
        {Array.from({ length: nVoices }, (_, v) => (
          <span key={v} className={s.vlLegendItem}>
            <span className={s.vlLine} style={{ background: VOICE_COLORS[v % 4] }} />
            {voiceName(v, nVoices)}
          </span>
        ))}
        <span className={s.vlLegendItem}>
          <span className={s.vlLine} style={{ background: 'var(--ink)', height: 5 }} />
          held common tone
        </span>
        <span className={s.vlLegendItem}>
          {totalWarnings === 0 ? <Tag tone="verdigris">No voice-leading warnings</Tag> : <Tag tone="accent">{totalWarnings} warning{totalWarnings > 1 ? 's' : ''}</Tag>}
        </span>
      </div>
      <div className={s.vlChartWrap}>
        <svg className={s.vlChart} width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Voice-leading chart: each line follows one voice through the progression">
          {cLines.map((m) => (
            <g key={m}>
              <line x1={padL - 4} x2={W - 6} y1={y(m)} y2={y(m)} style={{ stroke: 'var(--rule)' }} strokeDasharray="2 4" />
              <text x={2} y={y(m) + 4} style={{ fill: 'var(--ink-faint)', fontSize: 10, fontFamily: 'var(--font-ui)' }}>
                C{m / 12 - 1}
              </text>
            </g>
          ))}
          {chords.map((c, i) => (
            <g key={i} onClick={() => onSelect(i)} style={{ cursor: 'pointer' }}>
              <rect x={padL + i * colW + 4} y={2} width={colW - 8} height={H - 6} rx={6} style={{ fill: active === i ? 'var(--brass-soft)' : 'transparent' }} />
              <text x={x(i)} y={20} textAnchor="middle" style={{ fill: 'var(--ink)', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 16 }}>
                {c.rc.display}
              </text>
            </g>
          ))}
          {transitions.map((t) =>
            t.moves.map((mv) => {
              const x1 = x(t.from);
              const x2 = x(t.to);
              const y1 = y(midi(mv.from));
              const y2 = y(midi(mv.to));
              const bad = flagged.has(`${t.from}:${mv.voice}`);
              return (
                <g key={`${t.from}-${mv.voice}`}>
                  <line
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    style={{ stroke: bad ? 'var(--accent)' : VOICE_COLORS[mv.voice % 4] }}
                    strokeWidth={mv.common ? 5 : 2}
                    strokeLinecap="round"
                    strokeDasharray={bad ? '5 4' : undefined}
                    opacity={mv.common ? 0.55 : 0.9}
                  />
                  {!mv.common && (
                    <text x={(x1 + x2) / 2} y={(y1 + y2) / 2 - 4} textAnchor="middle" style={{ fill: 'var(--ink-muted)', fontSize: 9.5, fontFamily: 'var(--font-ui)', paintOrder: 'stroke', stroke: 'var(--bg-elev)', strokeWidth: 3 }}>
                      {formatSemis(mv.semis)}
                    </text>
                  )}
                </g>
              );
            }),
          )}
          {voicings.map((vc, i) =>
            vc.map((p, v) => (
              <g key={`${i}-${v}`}>
                <circle cx={x(i)} cy={y(midi(p))} r={4.5} style={{ fill: VOICE_COLORS[v % 4], stroke: 'var(--bg-elev)' }} strokeWidth={1.5} />
                <text x={x(i) + 7} y={y(midi(p)) + 3.5} style={{ fill: 'var(--ink)', fontSize: 10, fontFamily: 'var(--font-ui)', fontWeight: 600, paintOrder: 'stroke', stroke: 'var(--bg-elev)', strokeWidth: 3 }}>
                  {pitchName(p)}
                </text>
              </g>
            )),
          )}
        </svg>
      </div>
      <div className={s.transitions}>
        {transitions.map((t) => (
          <div key={t.from} className={cx(s.transition, t.warnings.length > 0 && s.transitionWarn)}>
            <div className={s.transitionHead}>
              <span>
                {chords[t.from].rc.display} → {chords[t.to].rc.display}
              </span>
              <span className={s.vlHead}>
                {t.total} semitone{t.total === 1 ? '' : 's'}, {t.commonTones} held
              </span>
            </div>
            <div className={s.moves}>
              {[...t.moves].reverse().map((m) => (
                <div key={m.voice} style={{ display: 'contents' }}>
                  <span className={s.moveName}>{voiceName(m.voice, t.moves.length)}</span>
                  <span>
                    {pitchName(m.from)} → {pitchName(m.to)}
                  </span>
                  <span className={m.common ? s.moveHeld : undefined}>{m.common ? 'held' : `${formatSemis(m.semis)} (${m.interval})`}</span>
                </div>
              ))}
            </div>
            {t.warnings.map((w, k) => (
              <div key={k} className={s.warn}>
                {w.message}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

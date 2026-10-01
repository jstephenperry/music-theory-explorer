# Instrument sample credits

The recordings in this folder are redistributed under their original licenses. They are not
covered by the MIT license of the Music Theory Explorer source code.

## Grand piano (`piano/`)

Salamander Grand Piano V3 by Alexander Holm, a Yamaha C5 grand recorded at 16 velocity layers.
Licensed under Creative Commons Attribution 3.0 (https://creativecommons.org/licenses/by/3.0/).
The files are the per-note MP3 excerpts published by the Tone.js project
(https://github.com/Tonejs/audio, folder `salamander`): one velocity layer, one note every
minor third from A0 to C8.

## Electric piano, pipe organ, string section, harp (`epiano/`, `organ/`, `strings/`, `harp/`)

Musyng Kite soundfont, General MIDI programs 5 (Electric Piano 1), 20 (Church Organ),
49 (String Ensemble 1) and 47 (Orchestral Harp). Licensed under Creative Commons
Attribution-ShareAlike 3.0 (https://creativecommons.org/licenses/by-sa/3.0/). The per-note MP3
renderings are from the midi-js-soundfonts project by Benjamin Gleitzman
(https://github.com/gleitz/midi-js-soundfonts). Notes that the soundfont leaves silent were
removed; the app plays the nearest remaining recording instead.

No changes were made to the audio files. At run time the app trims the silence before each
attack, loops the sustained part of organ and string notes, and fades the end of shorter notes.

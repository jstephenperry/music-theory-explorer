/**
 * Widely cited melodic references for recognizing intervals by ear. Titles and positions only.
 * Keyed by the size in semitones (1 to 12); spelling does not change how an interval sounds.
 */
export interface SongReference {
  title: string;
  where: string;
}

export const MELODIC_REFERENCES: Record<number, { up: SongReference[]; down: SongReference[] }> = {
  1: {
    up: [
      { title: 'Jaws (main theme)', where: 'the two-note ostinato' },
      { title: 'The Pink Panther Theme', where: 'opening' },
    ],
    down: [
      { title: 'Für Elise', where: 'opening' },
      { title: 'Joy to the World', where: 'first two notes' },
    ],
  },
  2: {
    up: [
      { title: 'Happy Birthday', where: 'second to third note' },
      { title: 'Silent Night', where: 'first two notes' },
    ],
    down: [
      { title: 'Mary Had a Little Lamb', where: 'first two notes' },
      { title: 'Yesterday (The Beatles)', where: 'first two notes' },
    ],
  },
  3: {
    up: [
      { title: 'Greensleeves', where: 'first two notes' },
      { title: 'Smoke on the Water', where: 'opening riff, first two notes' },
    ],
    down: [
      { title: 'Hey Jude', where: 'first two notes' },
      { title: 'Frosty the Snowman', where: 'first two notes' },
    ],
  },
  4: {
    up: [
      { title: 'When the Saints Go Marching In', where: 'first two notes' },
      { title: 'Kumbaya', where: 'first two notes' },
    ],
    down: [
      { title: 'Swing Low, Sweet Chariot', where: 'first two notes' },
      { title: 'Beethoven, Symphony No. 5', where: 'opening motif, third to fourth note' },
    ],
  },
  5: {
    up: [
      { title: 'Here Comes the Bride', where: 'opening' },
      { title: 'Amazing Grace', where: 'first two notes' },
    ],
    down: [
      { title: 'Eine kleine Nachtmusik', where: 'first two notes' },
      { title: 'O Come, All Ye Faithful', where: 'second to third note' },
    ],
  },
  6: {
    up: [
      { title: 'Maria (West Side Story)', where: 'first two notes' },
    ],
    down: [{ title: 'Black Sabbath (Black Sabbath)', where: 'main riff, octave to tritone' }],
  },
  7: {
    up: [
      { title: 'Twinkle, Twinkle, Little Star', where: 'second to third note' },
      { title: 'Star Wars (main title)', where: 'the leap after the opening triplet' },
    ],
    down: [{ title: 'The Flintstones (theme)', where: 'first two notes' }],
  },
  8: {
    up: [{ title: 'The Entertainer', where: 'third to fourth note' }],
    down: [],
  },
  9: {
    up: [
      { title: 'My Bonnie Lies over the Ocean', where: 'first two notes' },
      { title: 'NBC chimes', where: 'first two notes' },
    ],
    down: [{ title: 'Nobody Knows the Trouble I’ve Seen', where: 'first two notes' }],
  },
  10: {
    up: [
      { title: 'Somewhere (West Side Story)', where: 'first two notes' },
      { title: 'Star Trek (original series theme)', where: 'first two notes' },
    ],
    down: [],
  },
  11: {
    up: [
      { title: 'Take On Me', where: 'chorus, the rising leap' },
      { title: 'Don’t Know Why (Norah Jones)', where: 'first two notes' },
    ],
    down: [{ title: 'I Love You (Cole Porter)', where: 'first two notes' }],
  },
  12: {
    up: [
      { title: 'Over the Rainbow', where: 'first two notes' },
    ],
    down: [{ title: 'Willow Weep for Me', where: 'first two notes' }],
  },
};

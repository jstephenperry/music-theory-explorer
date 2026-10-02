/** Shuffle a copy of an array. */
export function shuffle<T>(xs: T[]): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Pick `count` items at random, always including `must`, in random order. */
export function choicesWith<T>(all: T[], must: T, count: number): T[] {
  return shuffle([must, ...shuffle(all.filter((x) => x !== must)).slice(0, count - 1)]);
}

export const pick = <T,>(xs: T[]): T => xs[Math.floor(Math.random() * xs.length)];

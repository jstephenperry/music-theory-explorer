/**
 * Jewish liturgical modes. The Ashkenazi prayer modes (shtayger) are named after prayers in which
 * they are characteristically used. Cantillation of scripture is built from melodic motifs, one
 * for each accent sign (trope); the scales below are the pitch material those motifs use, and the
 * details vary between communities.
 */
import { define, fromAbsolute } from './define';

export const JEWISH = [
  ...define('jewish', 'Ashkenazi prayer modes (shtayger)', [
    {
      id: 'ahavah-rabbah', name: 'Ahavah Rabbah',
      intervals: ['P1', 'm2', 'M3', 'P4', 'P5', 'm6', 'm7'],
      facts: [['Named after', 'The blessing before the Shema in the morning service'], ['Focal degree', 'The third']],
      description: 'The mode most associated with Jewish music: a lowered second followed by an augmented second. Used through much of the weekday services and in folk songs such as Hava Nagila. It matches Phrygian dominant and the Arabic Hijaz, but favors its third degree rather than the fourth.',
      aliases: ['Freygish', 'Freigish'],
      mood: ['devotional', 'klezmer'], characteristic: [1, 2],
    },
    {
      id: 'mi-sheberakh', name: 'Mi Sheberakh (Ukrainian Dorian)',
      intervals: ['P1', 'M2', 'm3', 'A4', 'P5', 'M6', 'm7'],
      facts: [['Also called', 'Av HaRachamim'], ['Relation', 'Built on the seventh degree of Ahavah Rabbah']],
      description: 'A minor mode with a raised fourth, common in prayer, klezmer and Eastern European folk music. It resembles the Arabic Nikriz.',
      aliases: ['Av HaRachamim', 'Altered Dorian'],
      characteristic: [3],
    },
    {
      id: 'magen-avot', name: 'Magen Avot',
      intervals: ['P1', 'M2', 'm3', 'P4', 'P5', 'm6', 'm7'],
      facts: [['Named after', 'The Me\'ein Sheva paragraph of the Friday evening service']],
      description: 'A minor mode used for simple, flowing recitation, especially on Shabbat evening. It differs from an ordinary minor scale by turning to the relative major at important words.',
      aliases: ['Magein Avot'],
      mood: ['calm', 'meditative'],
    },
    {
      id: 'yishtabach', name: 'Yishtabach',
      intervals: ['P1', 'm2', 'm3', 'P4', 'P5', 'm6', 'm7'],
      description: 'A variant of Magen Avot with a lowered second degree, resembling Phrygian or the Arabic Kurd.',
      characteristic: [1],
    },
    {
      id: 'adonai-malakh', name: 'Adonai Malakh',
      intervals: ['P1', 'M2', 'M3', 'P4', 'P5', 'M6', 'm7'],
      forms: [{ label: 'Range (flats added in the upper octave)', notes: '-m7 P1 M2 M3 P4 P5 M6 m7 P8 M9 m10' }],
      facts: [['Named after', '"God reigns," Psalm 93']],
      description: 'A major mode with a lowered seventh and, above the octave, a lowered tenth. Used for Kabbalat Shabbat psalms, Lekhah Dodi and the Torah service. On the High Holidays the seventh and tenth are often raised.',
      aliases: ['HaShem Malakh'],
      mood: ['majestic'], characteristic: [6],
    },
  ]),

  ...define('jewish', 'Cantillation (trope)', [
    {
      id: 'cantillation-torah-ashkenazi', name: 'Torah reading (Eastern Ashkenazi)',
      intervals: ['P1', 'M2', 'M3', 'P4', 'P5', 'M6', 'M7'],
      description: 'The weekday and Shabbat Torah chant of Eastern European communities uses major-mode material. Each trope sign has its own short motif; a coda motif marks the end of each reading.',
    },
    {
      id: 'cantillation-haftarah-ashkenazi', name: 'Haftarah reading (Ashkenazi)',
      intervals: ['P1', 'M2', 'm3', 'P4', 'P5', 'm6', 'm7'],
      description: 'The prophetic readings are chanted in a minor mode. The final coda modulates from minor to major to lead into the blessing that follows.',
    },
    {
      id: 'cantillation-esther', name: 'Megillat Esther (Ashkenazi)',
      intervals: ['P1', 'M2', 'M3', 'P4', 'P5', 'M6', 'M7'],
      description: 'Read on Purim to a mostly light, major-mode tune. The coda at the end of each verse turns from major to minor for a more serious effect, and passages about the destruction of the Temple borrow the Lamentations tune.',
    },
    {
      id: 'cantillation-lamentations', name: 'Eikhah (Lamentations)',
      intervals: ['P1', 'M2', 'm3', 'P4', 'P5', 'm6', 'm7'],
      description: 'A mournful minor-mode tune for the Book of Lamentations on the Ninth of Av. Echoes of it appear in Esther and in the Torah reading before the fast.',
      mood: ['mournful'],
    },
    {
      id: 'cantillation-torah-sephardic', name: 'Torah reading (Syrian and Sephardic, maqam Sigah)', tonic: 'E',
      intervals: fromAbsolute([['E', 366], ['F', 498], ['G', 702], ['A', 906], ['B', 1064], ['C', 1200], ['D', 1404]]),
      description: 'In the Jerusalem-Sephardic, Syrian, Egyptian and Baghdadi traditions the Torah is chanted almost always in maqam Sigah (Sikah), with its half-flat tonic. The Egyptian melody was moving toward maqam Huzzam in the 20th century.',
      characteristic: [0, 4],
    },
  ]),
];

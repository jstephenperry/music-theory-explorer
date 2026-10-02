import { CHORALE_269, INVENTION_1, WTC_C_PRELUDE } from './bach';
import { FIFTH_SYMPHONY, OP2_NO1 } from './beethoven';
import { K265_THEME, K265_VAR1, K331_THEME, K545_OPENING } from './mozart';
import type { Excerpt } from './types';

/** Every excerpt, for tests and verification. */
export const ALL_EXCERPTS: Excerpt[] = [INVENTION_1, FIFTH_SYMPHONY, OP2_NO1, K331_THEME, WTC_C_PRELUDE, CHORALE_269, K545_OPENING, K265_THEME, K265_VAR1];

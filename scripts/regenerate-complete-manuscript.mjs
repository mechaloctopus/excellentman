// Regenerates content/manuscript/THE_EXCELLENT_MAN_COMPLETE_MANUSCRIPT.md by
// concatenating the individual source files in reading order. Run this after
// editing any chapter so the combined convenience copy never goes stale.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONTENT = path.resolve(__dirname, '..', 'content', 'manuscript');
const read = (name) => fs.readFileSync(path.join(CONTENT, name), 'utf8').trim();

const order = [
  '00_FRONT_MATTER.md',
  'CH01_The_Monkey_King.md',
  'BOOK_I_THE_MIND.md',
  'BOOK_II_THE_WORD.md',
  'BOOK_III_THE_BODY.md',
  'BOOK_IV_THE_COMPANY.md',
  'BOOK_V_THE_COMPANION.md',
  'BOOK_VI_THE_WORLD.md',
  'BOOK_VII_THE_GUARDIAN.md',
  'BOOK_VIII_THE_SERVICE.md',
  'BOOK_IX_THE_CROWN_49-51.md',
  'CH52_The_Sleeper_King.md',
  'APPENDIX_A.md',
  'APPENDIX_B.md',
];

const sections = order.map(read);
const closing = '\n\n---\n\n*THE MANUSCRIPT OF THE EXCELLENT MAN IS NOW COMPLETE: 50 chapters, nine Books, one arc — from the monkey king who serves and is struck, to the sleeper king who serves because he lacks nothing.*\n';

const out = sections.join('\n\n---\n---\n\n') + closing;
fs.writeFileSync(path.join(CONTENT, 'THE_EXCELLENT_MAN_COMPLETE_MANUSCRIPT.md'), out);
console.log('Regenerated THE_EXCELLENT_MAN_COMPLETE_MANUSCRIPT.md from', order.length, 'source files.');

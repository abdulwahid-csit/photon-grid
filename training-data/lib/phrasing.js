'use strict';

/**
 * Generic phrasing-variation engine shared by every intent. Each canonical
 * intent in `intents.js` only supplies a handful of *core* phrase templates
 * (verb + slot pattern); this module multiplies those into 50-200 distinct
 * surface forms per intent by wrapping them in politeness/casualness/
 * question framing, injecting typos, and swapping explicit slot mentions
 * for contextual pronouns — without any intent needing to hand-author every
 * variant itself.
 */

const POLITE_PREFIXES = [
  '', 'please ', 'could you ', 'can you ', 'would you mind ', 'kindly ', "would you please ",
];

const POLITE_SUFFIXES = [
  '', ' please', ' for me', ' now', ' quickly', ' thanks', ' when you get a chance', ' asap',
];

const CASUAL_OPENERS = [
  '', 'hey, ', 'hey photon, ', 'quick thing - ', 'btw, ', 'ok so ', 'yo, ', 'so, ',
];

const QUESTION_WRAPPERS = [
  (phrase) => `can you ${phrase}?`,
  (phrase) => `could you ${phrase}?`,
  (phrase) => `would you ${phrase}?`,
  (phrase) => `is it possible to ${phrase}?`,
  (phrase) => `how do i ${phrase}?`,
];

/** Cheap, deterministic single-word typo injection — swap adjacent letters, drop a letter, or double a letter in one word of the phrase. Flags the example as `variantType: "typo"` downstream. */
function injectTypo(phrase, rand) {
  const words = phrase.split(' ');
  const candidates = words
    .map((w, i) => ({ w, i }))
    .filter(({ w }) => w.length > 3 && /^[a-zA-Z]+$/.test(w));
  if (candidates.length === 0) return phrase;
  const { w, i } = candidates[Math.floor(rand() * candidates.length)];
  const mode = Math.floor(rand() * 3);
  let mutated = w;
  if (mode === 0) {
    // adjacent swap
    const pos = 1 + Math.floor(rand() * (w.length - 2));
    mutated = w.slice(0, pos) + w[pos + 1] + w[pos] + w.slice(pos + 2);
  } else if (mode === 1) {
    // drop a letter
    const pos = 1 + Math.floor(rand() * (w.length - 2));
    mutated = w.slice(0, pos) + w.slice(pos + 1);
  } else {
    // double a letter
    const pos = 1 + Math.floor(rand() * (w.length - 1));
    mutated = w.slice(0, pos) + w[pos - 1] + w.slice(pos);
  }
  words[i] = mutated;
  return words.join(' ');
}

const CONTEXTUAL_PRONOUNS = ['it', 'that column', 'this column', 'that field', 'the same one'];

/**
 * Replaces the first occurrence of `literalSlotValue` in `phrase` with a
 * contextual pronoun, simulating a follow-up turn that refers back to a
 * column named earlier in the conversation rather than repeating it.
 */
function contextualize(phrase, literalSlotValue, rand) {
  if (!literalSlotValue || !phrase.includes(literalSlotValue)) return null;
  const pronoun = CONTEXTUAL_PRONOUNS[Math.floor(rand() * CONTEXTUAL_PRONOUNS.length)];
  return phrase.replace(literalSlotValue, pronoun);
}

/**
 * Produces one wrapped surface form for a base phrase, tagged with the
 * `variantType` it represents. `kind` selects which wrapping strategy to
 * apply; callers cycle through kinds to build a diverse variant set.
 */
function wrap(basePhrase, kind, rand) {
  switch (kind) {
    case 'plain':
      return { text: basePhrase, variantType: 'single-step' };
    case 'polite': {
      const prefix = POLITE_PREFIXES[Math.floor(rand() * POLITE_PREFIXES.length)];
      const suffix = POLITE_SUFFIXES[Math.floor(rand() * POLITE_SUFFIXES.length)];
      return { text: `${prefix}${basePhrase}${suffix}`.trim(), variantType: 'single-step' };
    }
    case 'casual': {
      const opener = CASUAL_OPENERS[Math.floor(rand() * CASUAL_OPENERS.length)];
      return { text: `${opener}${basePhrase}`.trim(), variantType: 'conversational' };
    }
    case 'question': {
      const wrapper = QUESTION_WRAPPERS[Math.floor(rand() * QUESTION_WRAPPERS.length)];
      return { text: wrapper(basePhrase), variantType: 'conversational' };
    }
    case 'typo':
      return { text: injectTypo(basePhrase, rand), variantType: 'typo' };
    default:
      return { text: basePhrase, variantType: 'single-step' };
  }
}

const WRAP_KIND_CYCLE = ['plain', 'polite', 'polite', 'casual', 'question', 'typo', 'polite', 'casual'];

module.exports = {
  POLITE_PREFIXES,
  POLITE_SUFFIXES,
  CASUAL_OPENERS,
  QUESTION_WRAPPERS,
  CONTEXTUAL_PRONOUNS,
  WRAP_KIND_CYCLE,
  injectTypo,
  contextualize,
  wrap,
};

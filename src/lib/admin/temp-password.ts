import { randomInt } from "node:crypto";

/**
 * Builds a random 12-character temporary password.
 * We avoid look-alike characters (0/O, 1/l/I) so it is easy to read out loud
 * or copy from the screen. It always contains at least one letter and one
 * digit so it passes `passwordProblems()` if someone tries to keep it.
 */
const LETTERS = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ";
const DIGITS = "23456789";
const ALL = LETTERS + DIGITS;

export function generateTempPassword(length = 12): string {
  const chars: string[] = [];
  // Guarantee one letter and one digit, then fill the rest randomly.
  chars.push(LETTERS[randomInt(LETTERS.length)]);
  chars.push(DIGITS[randomInt(DIGITS.length)]);
  while (chars.length < length) chars.push(ALL[randomInt(ALL.length)]);
  // Shuffle so the guaranteed characters are not always first.
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}

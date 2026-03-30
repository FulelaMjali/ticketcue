export const FRIEND_COLORS = [
  '#e05c5c',
  '#e08c3c',
  '#d4c43c',
  '#5cb85c',
  '#3ca8d4',
  '#7b5cd4',
  '#d45cb8',
  '#5cd4c4',
];

/**
 * Pick the next available color from the palette that isn't already in use
 * by the user's existing friendships. Cycles back to the start if all are used.
 */
export function pickFriendColor(usedColors: string[]): string {
  const available = FRIEND_COLORS.find((c) => !usedColors.includes(c));
  if (available) return available;
  // All colors in use — cycle by index
  return FRIEND_COLORS[usedColors.length % FRIEND_COLORS.length];
}

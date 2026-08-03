/**
 * Mapping between the grid's **content** scroll space and the **track** space of
 * the native scrollbar that drives it.
 *
 * The two are the same thing until the dataset gets tall enough that a scrollbar
 * spacer of that height would exceed what a browser will render. Past that point
 * the track is capped and offsets are mapped through it proportionally, so the
 * end of the dataset stays reachable.
 *
 * Kept free of the DOM so the arithmetic — the part that decides whether the
 * last row of a million is reachable at all — is directly testable.
 *
 * @packageDocumentation
 */

/**
 * Tallest a single element may be before browsers silently clamp it.
 *
 * Firefox caps element height near 17.9M px; Chromium and WebKit near 33.5M
 * (Blink's `LayoutUnit` is a 32-bit fixed-point value with 6 fractional bits, so
 * it saturates at 2^25). A scrollbar spacer taller than the cap stops tracking
 * its content: the track tops out early and the tail of the dataset becomes
 * unreachable — one million rows at 40px each is 40M px, which would strand the
 * last ~160,000 of them.
 *
 * 15M leaves headroom under every engine. At a 40px row height that is ~375,000
 * rows, so for essentially every real grid the mapping below is the identity and
 * scrolling behaves exactly as it always has.
 */
export const MAX_ELEMENT_HEIGHT_PX = 15_000_000;

/** Height to give the vertical scrollbar's spacer for a dataset of `totalHeight` px. */
export function trackHeightFor(totalHeight: number): number {
  return Math.min(totalHeight, MAX_ELEMENT_HEIGHT_PX);
}

/**
 * Projects a content-space scroll offset onto the scrollbar track.
 *
 * @param scrollTop  Offset in content pixels.
 * @param maxScroll  Furthest the content can scroll (`totalHeight - viewportHeight`).
 * @param maxTrack   Furthest the track can scroll (`trackHeight - viewportHeight`).
 */
export function contentToTrack(scrollTop: number, maxScroll: number, maxTrack: number): number {
  if (maxScroll === maxTrack || maxScroll <= 0) return scrollTop;
  return (scrollTop / maxScroll) * maxTrack;
}

/**
 * Projects a scrollbar-track offset back into content space — the inverse of
 * {@link contentToTrack}.
 */
export function trackToContent(track: number, maxScroll: number, maxTrack: number): number {
  if (maxScroll === maxTrack || maxTrack <= 0) return track;
  return (track / maxTrack) * maxScroll;
}

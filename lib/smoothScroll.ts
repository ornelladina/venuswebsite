// The browser's built-in `element.scrollTo({ behavior: 'smooth' })` looks
// fine but its speed isn't something we can tune — every browser picks its
// own fixed, fairly quick duration for it, which is why the "Next" arrow
// and the dot navigation on the carousels felt fast no matter what. This
// runs the same left-scroll by hand over an explicit duration instead, so
// it can be slowed down (or sped up) on request.
//
// Note: this only covers scrolls WE trigger (the arrow button, tapping a
// dot). An actual finger-drag swipe on a touchscreen scrolls natively and
// follows the finger directly — that part isn't something a duration
// setting can slow down, since it's not playing an animation, it's
// tracking the touch in real time.

// Ease-in-out cubic — starts gently, speeds up through the middle, eases
// back down at the end. Good for a deliberate tap (arrow button, a dot)
// where there's no prior motion to continue from.
export const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

// Ease-out cubic — starts at full speed and decelerates into the landing
// spot. Used for the swipe-release snap: the finger was already moving,
// so the animation picking up where that motion left off (instead of
// re-winding up from a standstill) is what reads as an immediate,
// responsive continuation of the swipe rather than a separate, slower
// second step tacked on after it.
export const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

export function smoothScrollTo(
  el: HTMLElement,
  left: number,
  duration = 350,
  ease: (t: number) => number = easeInOutCubic
) {
  const startLeft = el.scrollLeft;
  const change = left - startLeft;
  const startTime = performance.now();

  const step = (now: number) => {
    const elapsed = now - startTime;
    const t = Math.min(elapsed / duration, 1);
    el.scrollLeft = startLeft + change * ease(t);
    if (t < 1) requestAnimationFrame(step);
  };

  requestAnimationFrame(step);
}

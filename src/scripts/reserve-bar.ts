/**
 * Slim "$125 · Reserve" bar pinned to the bottom of event pages on narrow screens (CSS hides it
 * above 960px). The reservation form sits far below the fold on phones, so the bar jumps to it.
 *
 * The bar shows only while the form is still entirely below the viewport. Everything after the
 * form (the pager and the footer with its demo disclaimer) comes later in the page, so the bar
 * has already slid away before any of it scrolls into view. Without JavaScript it stays `hidden`.
 */
export function initReserveBar() {
  const bar = document.querySelector<HTMLElement>('[data-reserve-bar]');
  const form = document.getElementById('reserve-form');
  if (!bar || !form || !('IntersectionObserver' in window)) return;

  const setVisible = (show: boolean) => {
    bar.classList.toggle('is-visible', show);
    bar.inert = !show;
  };

  // The root is the viewport stretched upward without limit, so "intersecting" means exactly
  // "the form's top has reached the bottom of the screen". That flips on every crossing in either
  // direction, including jumps (Home key, back-to-top) that skip over the form entirely. A plain
  // viewport observer would miss those and leave the bar in a stale state.
  new IntersectionObserver(([entry]) => entry && setVisible(!entry.isIntersecting), {
    rootMargin: '100000px 0px 0px 0px',
  }).observe(form);

  bar.hidden = false;
}

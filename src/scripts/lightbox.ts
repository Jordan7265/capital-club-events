/**
 * Accessible lightbox for the /photos gallery, built on the native modal <dialog>:
 *  - each thumbnail is a real link to the full image, so it still works without JavaScript;
 *  - showModal() makes the rest of the page inert; Tab / Shift+Tab wrap around the dialog's
 *    buttons so focus never leaves it;
 *  - Esc closes (native `cancel`), ← / → move between photos, Home / End jump to the ends;
 *  - clicking the dark backdrop closes; swiping left or right on touch screens navigates;
 *  - on close, focus returns to the thumbnail of the photo that was last on screen.
 */
export function initLightbox() {
  const dialog = document.querySelector<HTMLDialogElement>('[data-lightbox]');
  const links = [...document.querySelectorAll<HTMLAnchorElement>('[data-gallery-index]')];
  if (!dialog || !links.length || typeof dialog.showModal !== 'function') return;

  const img = dialog.querySelector<HTMLImageElement>('[data-lightbox-img]')!;
  const caption = dialog.querySelector<HTMLElement>('[data-lightbox-caption]')!;
  const count = dialog.querySelector<HTMLElement>('[data-lightbox-count]')!;
  const live = dialog.querySelector<HTMLElement>('[data-lightbox-live]')!;
  const closeBtn = dialog.querySelector<HTMLButtonElement>('[data-lightbox-close]')!;

  const photos = links.map((link) => {
    const thumb = link.querySelector('img');
    return {
      src: link.getAttribute('href') ?? '',
      alt: thumb?.alt ?? '',
      width: thumb?.getAttribute('width') ?? '',
      height: thumb?.getAttribute('height') ?? '',
    };
  });
  let current = 0;

  const show = (index: number) => {
    current = (index + photos.length) % photos.length;
    const photo = photos[current]!;
    img.src = photo.src;
    img.alt = photo.alt;
    img.width = Number(photo.width);
    img.height = Number(photo.height);
    caption.textContent = photo.alt;
    count.textContent = `${current + 1} / ${photos.length}`;
    live.textContent = `Photo ${current + 1} of ${photos.length}: ${photo.alt}`;
  };

  const open = (index: number) => {
    show(index);
    dialog.showModal();
    closeBtn.focus();
  };

  links.forEach((link, i) => {
    link.setAttribute('aria-haspopup', 'dialog');
    link.addEventListener('click', (event) => {
      // Let modified clicks (new tab, etc.) open the image file as a normal link.
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
      event.preventDefault();
      open(i);
    });
  });

  dialog.querySelector('[data-lightbox-prev]')?.addEventListener('click', () => show(current - 1));
  dialog.querySelector('[data-lightbox-next]')?.addEventListener('click', () => show(current + 1));
  closeBtn.addEventListener('click', () => dialog.close());

  const buttons = [...dialog.querySelectorAll<HTMLButtonElement>('button')];
  const wrapFocus = (event: KeyboardEvent) => {
    const first = buttons[0]!;
    const last = buttons[buttons.length - 1]!;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  dialog.addEventListener('keydown', (event) => {
    if (event.key === 'Tab') return wrapFocus(event);
    const keys: Record<string, () => void> = {
      ArrowLeft: () => show(current - 1),
      ArrowRight: () => show(current + 1),
      Home: () => show(0),
      End: () => show(photos.length - 1),
    };
    const action = keys[event.key];
    if (!action) return;
    event.preventDefault();
    action();
  });

  // Clicks that land on the dialog itself (not the photo, caption or buttons) are backdrop clicks.
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });

  let touchX: number | null = null;
  dialog.addEventListener('touchstart', (e) => (touchX = e.touches[0]?.clientX ?? null), { passive: true });
  dialog.addEventListener('touchend', (e) => {
    const endX = e.changedTouches[0]?.clientX;
    if (touchX !== null && endX !== undefined && Math.abs(endX - touchX) > 50) {
      show(current + (endX < touchX ? 1 : -1));
    }
    touchX = null;
  });

  dialog.addEventListener('close', () => {
    live.textContent = '';
    const link = links[current];
    link?.focus({ preventScroll: true });
    link?.scrollIntoView({ block: 'nearest' });
  });
}

/**
 * Client-side behavior for the mock reservation form.
 *
 * Nothing here touches the network: no fetch, no XHR, no form submission. On a valid
 * submit we show a ~1s "Submitting…" state, then a confirmation panel with a fake code.
 */

type FieldName = 'name' | 'email' | 'phone' | 'guests' | 'notes';
type Control = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

const FIELDS: FieldName[] = ['name', 'email', 'phone', 'guests', 'notes'];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const SUBMIT_DELAY_MS = 1000;
const MIN_GUESTS = 1;
const MAX_GUESTS = 10;

function validateField(name: FieldName, raw: string): string | null {
  const value = raw.trim();
  switch (name) {
    case 'name':
      if (!value) return 'Please enter your name.';
      if (value.length < 2) return 'Please enter your full name.';
      return null;
    case 'email':
      if (!value) return 'Please enter your email address.';
      if (!EMAIL.test(value)) return 'Please enter a valid email address, like name@example.com.';
      return null;
    case 'phone': {
      if (!value) return null;
      const digits = value.replace(/\D/g, '');
      if (digits.length < 10 || digits.length > 15 || /[^\d\s()+.-]/.test(value)) {
        return 'Please enter a 10-digit phone number, or leave this blank.';
      }
      return null;
    }
    case 'guests': {
      const n = Number(value);
      if (!value || !Number.isInteger(n) || n < MIN_GUESTS || n > MAX_GUESTS) {
        return `Choose between ${MIN_GUESTS} and ${MAX_GUESTS} guests.`;
      }
      return null;
    }
    case 'notes':
      return raw.length > 500 ? 'Please keep dietary notes under 500 characters.' : null;
  }
}

function makeConfirmationCode(stem: string): string {
  const bytes = new Uint8Array(2);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
  return `CC-${stem}-${hex}`;
}

function estimateTotal(amount: number, per: string, guests: number): number {
  return per === 'couple' ? amount * Math.ceil(guests / 2) : amount * guests;
}

function initOne(root: HTMLElement) {
  if (root.dataset.rfReady) return;
  root.dataset.rfReady = 'true';

  const form = root.querySelector<HTMLFormElement>('[data-rf-form]');
  const confirmation = root.querySelector<HTMLElement>('[data-rf-confirmation]');
  const submit = root.querySelector<HTMLButtonElement>('[data-rf-submit]');
  const submitLabel = root.querySelector<HTMLElement>('[data-rf-submit-label]');
  const status = root.querySelector<HTMLElement>('[data-rf-status]');
  const total = root.querySelector<HTMLOutputElement>('[data-rf-total]');
  if (!form || !confirmation || !submit || !submitLabel) return;

  const idleLabel = submitLabel.textContent ?? 'Reserve';
  const amount = Number(root.dataset.priceAmount ?? '0');
  const per = root.dataset.pricePer ?? 'person';
  const stem = root.dataset.codeStem ?? '0000';
  const attempted = new Set<FieldName>();

  const control = (name: FieldName) => form.elements.namedItem(name) as Control | null;

  const showError = (name: FieldName, message: string | null) => {
    const el = control(name);
    const slot = root.querySelector<HTMLElement>(`[data-error-for="${name}"]`);
    if (!el || !slot) return;
    slot.textContent = message ?? '';
    if (message) el.setAttribute('aria-invalid', 'true');
    else el.removeAttribute('aria-invalid');
    el.closest('.rf__field')?.classList.toggle('is-invalid', Boolean(message));
  };

  const check = (name: FieldName) => {
    const el = control(name);
    if (!el) return null;
    const message = validateField(name, el.value);
    showError(name, message);
    return message;
  };

  const guestsValue = () => {
    const n = Number(control('guests')?.value ?? '0');
    return Number.isInteger(n) ? n : 0;
  };

  const updateTotal = () => {
    if (!total) return;
    const n = guestsValue();
    if (n >= MIN_GUESTS && n <= MAX_GUESTS) {
      total.textContent = `$${estimateTotal(amount, per, n).toLocaleString('en-US')}`;
    } else {
      total.textContent = '—';
    }
  };

  for (const name of FIELDS) {
    const el = control(name);
    if (!el) continue;
    el.addEventListener('blur', () => {
      if (attempted.has(name) || el.value.trim()) {
        attempted.add(name);
        check(name);
      }
    });
    el.addEventListener('input', () => {
      if (name === 'guests') updateTotal();
      if (attempted.has(name)) check(name);
    });
    el.addEventListener('change', () => {
      if (name === 'guests') updateTotal();
    });
  }

  for (const step of root.querySelectorAll<HTMLButtonElement>('[data-rf-step]')) {
    step.addEventListener('click', () => {
      const el = control('guests');
      if (!el) return;
      const delta = Number(step.dataset.rfStep);
      const current = Number(el.value) || MIN_GUESTS;
      const next = Math.min(MAX_GUESTS, Math.max(MIN_GUESTS, current + delta));
      el.value = String(next);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (root.classList.contains('is-submitting')) return;

    const invalid: FieldName[] = [];
    for (const name of FIELDS) {
      attempted.add(name);
      if (check(name)) invalid.push(name);
    }

    if (invalid.length) {
      if (status) {
        status.textContent =
          invalid.length === 1
            ? 'Please fix the highlighted field.'
            : `Please fix the ${invalid.length} highlighted fields.`;
      }
      control(invalid[0]!)?.focus();
      return;
    }

    const guests = guestsValue();
    const name = control('name')?.value.trim() ?? '';
    root.classList.add('is-submitting');
    form.setAttribute('aria-busy', 'true');
    submit.disabled = true;
    submitLabel.textContent = 'Submitting…';
    if (status) status.textContent = 'Submitting your reservation…';

    window.setTimeout(() => {
      const code = makeConfirmationCode(stem);
      const codeEl = root.querySelector('[data-rf-code]');
      const guestsEl = root.querySelector('[data-rf-guests]');
      const greeting = root.querySelector('[data-rf-greeting]');
      if (codeEl) codeEl.textContent = code;
      if (guestsEl) guestsEl.textContent = `${guests} ${guests === 1 ? 'guest' : 'guests'}`;
      if (greeting) {
        const first = name.split(/\s+/)[0] ?? name;
        greeting.textContent = `Thank you, ${first} — we’ve saved your spot.`;
      }

      root.classList.remove('is-submitting');
      root.classList.add('is-confirmed');
      form.removeAttribute('aria-busy');
      form.hidden = true;
      confirmation.hidden = false;
      if (status) status.textContent = '';
      root.querySelector<HTMLElement>('[data-rf-confirm-heading]')?.focus();
    }, SUBMIT_DELAY_MS);
  });

  root.querySelector('[data-rf-reset]')?.addEventListener('click', () => {
    form.reset();
    attempted.clear();
    for (const name of FIELDS) showError(name, null);
    root.classList.remove('is-confirmed');
    confirmation.hidden = true;
    form.hidden = false;
    submit.disabled = false;
    submitLabel.textContent = idleLabel;
    updateTotal();
    control('name')?.focus();
  });

  submit.disabled = false;
  root.classList.add('has-js');
  updateTotal();
}

export function initMockReservations() {
  for (const root of document.querySelectorAll<HTMLElement>('[data-mock-reservation]')) {
    initOne(root);
  }
}

/**
 * Shared client-side behavior for the site's mock forms (reservations and contact).
 *
 * Nothing here touches the network: no fetch, no XHR, no form submission. On a valid submit
 * we show a ~1s "Submitting…" state, then the form's confirmation panel with a fake code.
 * Without JavaScript the submit button stays disabled (set in the markup), so the browser
 * cannot submit the form either.
 *
 * Markup contract (see ReservationForm.astro / ContactForm.astro):
 *   [data-mock-form]            root; gets .has-js, .is-submitting, .is-confirmed
 *     form[data-mf-form]        fields are found by name via form.elements
 *     [data-error-for="name"]   inline error slot per field
 *     [data-mf-submit]          the only submit button; [data-mf-submit-label] inside it
 *     [data-mf-status]          polite live region for validation/submission messages
 *     [data-mf-confirmation]    hidden panel shown on success
 *       [data-mf-confirm-heading] focused when the panel appears
 *       [data-fill="key"]       text slots filled from MockFormOptions.fill
 *       [data-mf-reset]         restores an empty form
 */

export type Validator = (raw: string) => string | null;
type Control = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

export const SUBMIT_DELAY_MS = 1000;
export const MIN_GUESTS = 1;
export const MAX_GUESTS = 10;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Field rules shared by both forms. Messages are shown verbatim under the field. */
export const rules = {
  name: (raw: string) => {
    const value = raw.trim();
    if (!value) return 'Please enter your name.';
    if (value.length < 2) return 'Please enter your full name.';
    return null;
  },
  email: (raw: string) => {
    const value = raw.trim();
    if (!value) return 'Please enter your email address.';
    if (!EMAIL.test(value)) return 'Please enter a valid email address, like name@example.com.';
    return null;
  },
  phone: (raw: string) => {
    const value = raw.trim();
    if (!value) return null;
    const digits = value.replace(/\D/g, '');
    if (digits.length < 10 || digits.length > 15 || /[^\d\s()+.-]/.test(value)) {
      return 'Please enter a 10-digit phone number, or leave this blank.';
    }
    return null;
  },
  guests: (raw: string) => {
    const value = raw.trim();
    const n = Number(value);
    if (!value || !Number.isInteger(n) || n < MIN_GUESTS || n > MAX_GUESTS) {
      return `Choose between ${MIN_GUESTS} and ${MAX_GUESTS} guests.`;
    }
    return null;
  },
  notes: (raw: string) => (raw.length > 500 ? 'Please keep dietary notes under 500 characters.' : null),
  topic: (raw: string) => (raw.trim() ? null : 'Please choose a topic.'),
  message: (raw: string) => {
    const value = raw.trim();
    if (!value) return 'Please enter a message.';
    if (value.length < 10) return 'Please add a little more detail (at least 10 characters).';
    if (raw.length > 1000) return 'Please keep your message under 1,000 characters.';
    return null;
  },
} satisfies Record<string, Validator>;

/** "CC-1114-4F7A": a fake, random confirmation code. Purely cosmetic. */
export function fakeCode(stem: string): string {
  const bytes = new Uint8Array(2);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
  return `CC-${stem}-${hex}`;
}

export function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? fullName;
}

export interface MockFormOptions {
  /** Validators keyed by field name, in on-screen order (first invalid field gets focus). */
  validators: Record<string, Validator>;
  /** Text for the confirmation panel's [data-fill] slots, from the trimmed submitted values. */
  fill: (values: Record<string, string>) => Record<string, string>;
  /** Runs on load, on every input/change and after reset, e.g. to update a running total. */
  update?: (values: Record<string, string>) => void;
}

export function initMockForm(root: HTMLElement, options: MockFormOptions) {
  if (root.dataset.mfReady) return;

  const form = root.querySelector<HTMLFormElement>('[data-mf-form]');
  const confirmation = root.querySelector<HTMLElement>('[data-mf-confirmation]');
  const submit = root.querySelector<HTMLButtonElement>('[data-mf-submit]');
  const submitLabel = root.querySelector<HTMLElement>('[data-mf-submit-label]');
  const status = root.querySelector<HTMLElement>('[data-mf-status]');
  if (!form || !confirmation || !submit || !submitLabel) return;
  root.dataset.mfReady = 'true';

  const fields = Object.keys(options.validators);
  const idleLabel = submitLabel.textContent ?? 'Submit';
  const attempted = new Set<string>();

  const control = (name: string) => form.elements.namedItem(name) as Control | null;
  const values = () =>
    Object.fromEntries(fields.map((name) => [name, control(name)?.value.trim() ?? '']));

  const showError = (name: string, message: string | null) => {
    const el = control(name);
    const slot = root.querySelector<HTMLElement>(`[data-error-for="${name}"]`);
    if (!el || !slot) return;
    slot.textContent = message ?? '';
    if (message) el.setAttribute('aria-invalid', 'true');
    else el.removeAttribute('aria-invalid');
    el.closest('.mf__field')?.classList.toggle('is-invalid', Boolean(message));
  };

  const check = (name: string) => {
    const el = control(name);
    const validate = options.validators[name];
    if (!el || !validate) return null;
    const message = validate(el.value);
    showError(name, message);
    return message;
  };

  const update = () => options.update?.(values());

  for (const name of fields) {
    const el = control(name);
    if (!el) continue;
    // Validate a field once the visitor has left it with something typed, or after a submit attempt.
    el.addEventListener('blur', () => {
      if (attempted.has(name) || el.value.trim()) {
        attempted.add(name);
        check(name);
      }
    });
    el.addEventListener('input', () => {
      update();
      if (attempted.has(name)) check(name);
    });
    el.addEventListener('change', () => {
      update();
      if (attempted.has(name)) check(name);
    });
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (root.classList.contains('is-submitting')) return;

    const invalid: string[] = [];
    for (const name of fields) {
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

    const submitted = values();
    root.classList.add('is-submitting');
    form.setAttribute('aria-busy', 'true');
    submit.disabled = true;
    submitLabel.textContent = 'Submitting…';
    if (status) status.textContent = 'Submitting…';

    window.setTimeout(() => {
      for (const [key, text] of Object.entries(options.fill(submitted))) {
        for (const slot of root.querySelectorAll(`[data-fill="${key}"]`)) slot.textContent = text;
      }
      root.classList.remove('is-submitting');
      root.classList.add('is-confirmed');
      form.removeAttribute('aria-busy');
      form.hidden = true;
      confirmation.hidden = false;
      if (status) status.textContent = '';
      root.querySelector<HTMLElement>('[data-mf-confirm-heading]')?.focus();
    }, SUBMIT_DELAY_MS);
  });

  root.querySelector('[data-mf-reset]')?.addEventListener('click', () => {
    form.reset();
    attempted.clear();
    for (const name of fields) showError(name, null);
    root.classList.remove('is-confirmed');
    confirmation.hidden = true;
    form.hidden = false;
    submit.disabled = false;
    submitLabel.textContent = idleLabel;
    update();
    control(fields[0]!)?.focus();
  });

  submit.disabled = false;
  root.classList.add('has-js');
  update();
}

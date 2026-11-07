/**
 * Mock reservation form on each event page: validation, a running total, a ~1s "Submitting…"
 * state and a "You're on the list!" confirmation with a fake code. No network requests.
 */
import { fakeCode, firstName, initMockForm, MAX_GUESTS, MIN_GUESTS, rules } from './mock-form';

function estimateTotal(amount: number, per: string, guests: number): number {
  return per === 'couple' ? amount * Math.ceil(guests / 2) : amount * guests;
}

export function initReservationForms() {
  for (const root of document.querySelectorAll<HTMLElement>('[data-mock-form="reservation"]')) {
    const amount = Number(root.dataset.priceAmount ?? '0');
    const per = root.dataset.pricePer ?? 'person';
    const stem = root.dataset.codeStem ?? '0000';
    const total = root.querySelector<HTMLOutputElement>('[data-mf-total]');

    initMockForm(root, {
      validators: {
        name: rules.name,
        email: rules.email,
        phone: rules.phone,
        guests: rules.guests,
        notes: rules.notes,
      },
      update: ({ guests }) => {
        if (!total) return;
        const n = Number(guests);
        total.textContent =
          Number.isInteger(n) && n >= MIN_GUESTS && n <= MAX_GUESTS
            ? `$${estimateTotal(amount, per, n).toLocaleString('en-US')}`
            : 'Select guests';
      },
      fill: ({ name, email, guests }) => ({
        code: fakeCode(stem),
        guests: `${guests} ${guests === '1' ? 'guest' : 'guests'}`,
        greeting: `Thank you, ${firstName(name ?? '')}. We’ve saved your spot.`,
        // Operator-requested copy: point guests to the email they entered. This demo sends no email
        // (or anything else); the footer disclaimer says reservations are not processed.
        emailNote: `Check your email at ${email} for your confirmation.`,
      }),
    });
  }
}

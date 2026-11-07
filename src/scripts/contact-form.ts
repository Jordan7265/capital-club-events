/**
 * Mock contact form: same behavior as the reservation form (validation, ~1s "Submitting…",
 * confirmation with a fake reference code). No network requests.
 */
import { fakeCode, firstName, initMockForm, rules } from './mock-form';

export function initContactForms() {
  for (const root of document.querySelectorAll<HTMLElement>('[data-mock-form="contact"]')) {
    const topicSelect = root.querySelector<HTMLSelectElement>('select[name="topic"]');
    initMockForm(root, {
      validators: {
        name: rules.name,
        email: rules.email,
        phone: rules.phone,
        topic: rules.topic,
        message: rules.message,
      },
      fill: ({ name, email }) => ({
        code: fakeCode('MSG'),
        greeting: `Thanks, ${firstName(name ?? '')}. We’ll reply within two business days.`,
        topic: topicSelect?.selectedOptions[0]?.textContent?.trim() ?? '',
        email: email ?? '',
      }),
    });
  }
}

/**
 * Event content for the Capital Club Events demo site.
 *
 * This is the single source of truth for every event card, list and detail page.
 * Times carry an explicit Eastern offset so formatting is identical no matter which
 * timezone the build machine runs in (Vercel builds in UTC).
 *
 * Only the featured benefit names a real vendor (Mikasa Catering); every other event's
 * copy is fictional and intentionally vendor-neutral.
 */

export interface EventImage {
  /** Path under /public, e.g. /images/venue/rooftop-dusk-string-lights.webp */
  src: string;
  alt: string;
  width: number;
  height: number;
  /** Optional CSS object-position for cropped placements. */
  position?: string;
}

export interface EventPrice {
  /** Whole US dollars. */
  amount: number;
  per: 'person' | 'couple';
  note?: string;
}

export interface VenueEvent {
  slug: string;
  title: string;
  /** Short category line shown above titles, e.g. "Rooftop Benefit". */
  kicker: string;
  /** ISO 8601 with offset. */
  start: string;
  /** ISO 8601 with offset; may fall on the following calendar day. */
  end: string;
  summary: string;
  description: string[];
  catering: string;
  entertainment: string;
  attire: string;
  price: EventPrice;
  image: EventImage;
  featured?: boolean;
}

export const venue = {
  name: 'The Capital Club of Asheville',
  street: '82 Patton Ave',
  city: 'Asheville',
  region: 'NC',
  postalCode: '28801',
  phone: '828-398-5055',
  phoneHref: 'tel:+18283985055',
  mapHref:
    'https://www.google.com/maps/search/?api=1&query=The+Capital+Club+of+Asheville%2C+82+Patton+Ave%2C+Asheville%2C+NC+28801',
  timeZone: 'America/New_York',
} as const;

export const events: VenueEvent[] = [
  {
    slug: 'playgrounds-for-asheville-rooftop-benefit',
    title: 'Playgrounds for Asheville — Rooftop Benefit',
    kicker: 'Rooftop Benefit',
    start: '2026-11-14T18:30:00-05:00',
    end: '2026-11-14T22:30:00-05:00',
    summary:
      'An evening above downtown to raise funds for renovating children’s playgrounds across the Asheville area — dinner by Mikasa Catering and a live DJ under the lights.',
    description: [
      'Every neighborhood deserves a place where kids can climb, swing and run until the streetlights come on. Playgrounds for Asheville brings friends, families and local businesses together on the rooftop to help renovate children’s playgrounds across the Asheville area.',
      'Arrive as the sun drops behind the Blue Ridge and settle in for a cocktail-hour reception, a spread from Mikasa Catering, and a live DJ carrying the night from golden hour to the city lights.',
      'Proceeds from every ticket go toward playground renovation projects in the Asheville area.',
    ],
    catering: 'Mikasa Catering — passed bites and a chef-attended dinner spread',
    entertainment: 'Live DJ from cocktail hour through last dance',
    attire: 'Cocktail or dressy casual',
    price: { amount: 125, per: 'person', note: 'Proceeds support playground renovation' },
    image: {
      src: '/images/venue/rooftop-dusk-string-lights.webp',
      alt: 'Guests gather on the Capital Club rooftop terrace at dusk under string lights, with the sun setting over the mountains.',
      width: 1632,
      height: 1224,
      position: '50% 40%',
    },
    featured: true,
  },
  {
    slug: 'blue-ridge-bourbon-and-bites',
    title: 'Blue Ridge Bourbon & Bites',
    kicker: 'Guided Tasting',
    start: '2026-11-20T19:00:00-05:00',
    end: '2026-11-20T22:00:00-05:00',
    summary:
      'A guided flight of regional bourbons, each paired with a small plate, in the banquet room overlooking downtown.',
    description: [
      'Pull up a chair for a relaxed, guided walk through bourbons from across the region. Each pour is introduced with the story of where it was made and paired with a small plate built to bring out its character.',
      'Expect plenty of conversation, a few surprises in the glass, and a view of downtown Asheville settling in for the evening.',
    ],
    catering: 'Seasonal small plates paired to each pour',
    entertainment: 'Hosted tasting with a guided flight',
    attire: 'Smart casual',
    price: { amount: 75, per: 'person' },
    image: {
      src: '/images/venue/ballroom-evening-dinner.webp',
      alt: 'Guests seated at dinner tables in the warmly lit indoor banquet room, with tall windows at dusk.',
      width: 1800,
      height: 1013,
    },
  },
  {
    slug: 'winter-rooftop-market-and-mulled-wine-social',
    title: 'Winter Rooftop Market & Mulled Wine Social',
    kicker: 'Makers Market',
    start: '2026-12-05T17:00:00-05:00',
    end: '2026-12-05T21:00:00-05:00',
    summary:
      'Local makers, warm mugs of mulled wine and long mountain views — holiday shopping, rooftop style.',
    description: [
      'The terrace becomes a small winter market for an evening: local makers with handmade gifts, mulled wine kept warm by the bar, and the mountains turning blue as the sun goes down.',
      'Come early for the best of the makers’ tables, stay for the view, and bring a list — or don’t.',
    ],
    catering: 'Mulled wine, hot cider and seasonal snacks',
    entertainment: 'Local makers’ market and a holiday playlist',
    attire: 'Casual — dress warmly for the terrace',
    price: { amount: 25, per: 'person', note: 'Includes one mulled wine or cider' },
    image: {
      src: '/images/venue/rooftop-terrace-sunny.webp',
      alt: 'The open rooftop terrace on a clear day, with the Blue Ridge Mountains on the horizon.',
      width: 900,
      height: 675,
    },
  },
  {
    slug: 'mistletoe-masquerade-holiday-party',
    title: 'Mistletoe Masquerade Holiday Party',
    kicker: 'Holiday Party',
    start: '2026-12-18T19:00:00-05:00',
    end: '2026-12-18T23:00:00-05:00',
    summary:
      'Masks encouraged. A live band, holiday cocktails and a dance floor that fills early.',
    description: [
      'Dust off something sparkly and bring a mask — or pick one up at the door. The banquet room is dressed for the season, the band is booked for the whole night, and the holiday cocktail list is short and very good.',
      'Step out to the terrace between sets for a breath of mountain air and a look at downtown in its holiday lights.',
    ],
    catering: 'Holiday cocktails and a late-night dessert table',
    entertainment: 'Live band, two sets',
    attire: 'Festive — masks encouraged',
    price: { amount: 95, per: 'person' },
    image: {
      src: '/images/venue/reception-dance-floor.webp',
      alt: 'A crowded, celebrating dance floor with guests cheering and raising their hands.',
      width: 1600,
      height: 1068,
    },
  },
  {
    slug: 'new-years-eve-on-the-rooftop',
    title: 'New Year’s Eve on the Rooftop',
    kicker: 'New Year’s Eve',
    start: '2026-12-31T20:30:00-05:00',
    end: '2027-01-01T01:00:00-05:00',
    summary:
      'Count down above the city: a DJ, a champagne toast at midnight and the skyline all to yourselves.',
    description: [
      'Ring in 2027 a few stories above downtown. A DJ keeps the floor moving all night, the bar is open, and at midnight we head to the terrace for a champagne toast and the skyline countdown.',
      'Black tie is optional; celebrating is not.',
    ],
    catering: 'Heavy hors d’oeuvres and a midnight champagne toast',
    entertainment: 'DJ and a skyline countdown at midnight',
    attire: 'Black tie optional',
    price: { amount: 175, per: 'person' },
    image: {
      src: '/images/venue/dinner-toast.webp',
      alt: 'Guests at a long table raise their glasses in a toast, with bright windows behind them.',
      width: 1800,
      height: 1200,
    },
  },
  {
    slug: 'winter-jazz-night',
    title: 'Winter Jazz Night',
    kicker: 'Live Music',
    start: '2027-01-16T19:00:00-05:00',
    end: '2027-01-16T22:00:00-05:00',
    summary:
      'A live jazz trio, seasonal cocktails and the warm glow of the banquet room on a cold January night.',
    description: [
      'Settle into a candlelit table for three sets from a live jazz trio — standards, a few surprises, and plenty of room for conversation in between.',
      'The bar is pouring a short list of seasonal cocktails built for a winter night in the mountains.',
    ],
    catering: 'Seasonal cocktails and shareable plates',
    entertainment: 'Live jazz trio, three sets',
    attire: 'Dressy casual',
    price: { amount: 60, per: 'person' },
    image: {
      src: '/images/venue/dining-room-mountain-windows.webp',
      alt: 'Round dinner tables set with blue linens beside floor-to-ceiling windows overlooking green hills.',
      width: 1800,
      height: 1429,
    },
  },
  {
    slug: 'valentines-supper-club',
    title: 'Valentine’s Supper Club',
    kicker: 'Supper Club',
    start: '2027-02-13T18:00:00-05:00',
    end: '2027-02-13T22:00:00-05:00',
    summary:
      'A plated dinner for two by the windows, with a live acoustic set as the city lights come up.',
    description: [
      'Make a night of it: a plated, multi-course dinner for two at a table by the windows, a live acoustic set, and dessert as the city lights come up below.',
      'Seating is intimate and limited — reserve as a couple.',
    ],
    catering: 'Plated multi-course dinner for two',
    entertainment: 'Live acoustic set',
    attire: 'Cocktail attire',
    price: { amount: 150, per: 'couple' },
    image: {
      src: '/images/venue/banquet-crowd.webp',
      alt: 'A full banquet room of guests seated at dinner tables beneath warm ceiling lights.',
      width: 960,
      height: 636,
    },
  },
];

/** Events sorted chronologically by start time. */
export const upcomingEvents: VenueEvent[] = [...events].sort(
  (a, b) => Date.parse(a.start) - Date.parse(b.start),
);

export const featuredEvent: VenueEvent =
  upcomingEvents.find((e) => e.featured) ?? upcomingEvents[0]!;

/** Venue photography used across the site (gallery, heroes, blurbs). */
export const venuePhotos: EventImage[] = [
  { src: '/images/venue/rooftop-dusk-string-lights.webp', alt: 'The rooftop terrace at dusk under string lights, the sun setting over the mountains.', width: 1632, height: 1224 },
  { src: '/images/venue/rooftop-ceremony-mountain-view.webp', alt: 'Guests seated for an open-air ceremony on the rooftop with the Blue Ridge beyond.', width: 960, height: 720 },
  { src: '/images/venue/rooftop-wedding-party.webp', alt: 'A wedding party posing on the rooftop terrace with mountains on the horizon.', width: 1800, height: 1200 },
  { src: '/images/venue/rooftop-terrace-sunny.webp', alt: 'The open rooftop terrace on a clear day with long mountain views.', width: 900, height: 675 },
  { src: '/images/venue/rooftop-ceremony-setup.webp', alt: 'White ceremony chairs and floral arrangements set on the rooftop terrace.', width: 900, height: 675 },
  { src: '/images/venue/rooftop-ceremony-kiss.webp', alt: 'A couple embraces at the end of a rooftop ceremony as guests look on.', width: 666, height: 430 },
  { src: '/images/venue/building-exterior.webp', alt: 'The glass-and-brick building at 82 Patton Avenue in downtown Asheville.', width: 380, height: 552 },
  { src: '/images/venue/ballroom-evening-dinner.webp', alt: 'Guests at dinner in the indoor banquet room during an evening event.', width: 1800, height: 1013 },
  { src: '/images/venue/dining-room-mountain-windows.webp', alt: 'Dinner tables with blue linens beside floor-to-ceiling windows overlooking the hills.', width: 1800, height: 1429 },
  { src: '/images/venue/dinner-toast.webp', alt: 'Guests raise their glasses for a toast at a long dinner table.', width: 1800, height: 1200 },
  { src: '/images/venue/reception-dance-floor.webp', alt: 'A packed dance floor during a celebration.', width: 1600, height: 1068 },
  { src: '/images/venue/reception-grand-entrance.webp', alt: 'Newlyweds make their grand entrance as guests applaud.', width: 1600, height: 1068 },
  { src: '/images/venue/wedding-recessional.webp', alt: 'A newly married couple walks back down the aisle, smiling.', width: 900, height: 600 },
  { src: '/images/venue/banquet-crowd.webp', alt: 'A full banquet room of guests seated at round tables.', width: 960, height: 636 },
  { src: '/images/venue/corporate-presentation.webp', alt: 'A presenter speaks to guests seated at tables in front of a projection screen.', width: 960, height: 720 },
  { src: '/images/venue/seminar-setup.webp', alt: 'The banquet room arranged classroom-style with long tables for a seminar.', width: 1800, height: 1327 },
];

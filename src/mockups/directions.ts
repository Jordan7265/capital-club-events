/**
 * The three visual directions under review. Shared by the /mockups index, the review bar
 * and the operator's decision prompt so names and descriptions stay identical everywhere.
 */
export interface Direction {
  id: 'a' | 'b' | 'c';
  name: string;
  oneLiner: string;
  /** Highlight colour used for this direction on the dark comparison board. */
  accent: string;
  palette: { name: string; hex: string }[];
  fonts: { display: string; body: string };
  moves: string[];
}

export const directions: Direction[] = [
  {
    id: 'a',
    name: 'Skyline Noir',
    accent: '#d6b274',
    oneLiner:
      'Dark rooftop luxe: ink-blue night, gilded hairlines, twinkling café lights across a full-bleed dusk hero, and high-contrast Bodoni type.',
    palette: [
      { name: 'Night ink', hex: '#0b0d12' },
      { name: 'Panel', hex: '#11141b' },
      { name: 'Gilt', hex: '#d6b274' },
      { name: 'Glow', hex: '#ffd99a' },
      { name: 'Linen', hex: '#f1eadf' },
    ],
    fonts: { display: 'Bodoni Moda', body: 'Jost' },
    moves: [
      'Animated string of café lights over a full-screen rooftop-at-dusk hero',
      'Event “program” rows with oversized date numerals and hover photo reveals',
      'Ticket-stub details and a gilded reservation card',
    ],
  },
  {
    id: 'b',
    name: 'Society Pages',
    accent: '#efe6d3',
    oneLiner:
      'Light editorial classic: an ivory broadsheet with a newspaper masthead, Caslon headlines, double rules, oxblood accents and an R.S.V.P. reply card.',
    palette: [
      { name: 'Ivory', hex: '#f5f0e6' },
      { name: 'Card', hex: '#fbf8f1' },
      { name: 'Ink', hex: '#1c1a16' },
      { name: 'Oxblood', hex: '#7d2222' },
      { name: 'Gilt', hex: '#a8843f' },
    ],
    fonts: { display: 'Libre Caslon Display', body: 'Newsreader' },
    moves: [
      'Front-page layout: lead story, drop caps, captions and an “At a Glance” box',
      'Events as a season of engagements with dotted price leaders',
      'Reservation form styled as an engraved R.S.V.P. reply card',
    ],
  },
  {
    id: 'c',
    name: 'Ridgeline',
    accent: '#f3b33d',
    oneLiner:
      'Warm modern Blue Ridge: layered mountain silhouettes, a golden-hour sun, clay accents, chunky Bricolage Grotesque, and soft rounded cards with friendly booking controls.',
    palette: [
      { name: 'Cream', hex: '#fbf5ec' },
      { name: 'Ridge', hex: '#1d3242' },
      { name: 'Mist', hex: '#9fbccd' },
      { name: 'Clay', hex: '#c95c34' },
      { name: 'Sun', hex: '#f3b33d' },
    ],
    fonts: { display: 'Bricolage Grotesque', body: 'Figtree' },
    moves: [
      'Generated Blue Ridge ridgelines that flow from section to section',
      'Arched hero photo with a rising sun and a “next up” ticket',
      'Timeline events list, icon facts and a sticky booking card with a guest stepper',
    ],
  },
];

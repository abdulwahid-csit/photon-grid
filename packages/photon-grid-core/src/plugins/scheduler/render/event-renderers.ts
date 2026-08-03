import type { SchedulerEvent, SchedulerResource } from '../data/scheduler.types';
import type { SchedulerEventRenderer, SchedulerEventRenderParams } from '../scheduler.config';

/**
 * The built-in event-bar renderers.
 *
 * ## Why a registry rather than a `switch`
 *
 * A bar's appearance is chosen per *event type*, and the set of types is
 * open - a host registers `maintenanceWindow` or `chargingCycle` and expects it
 * to behave exactly like the built-ins. A `switch` would make the built-ins
 * privileged, force every addition through this file, and keep all eight in the
 * bundle even for a scheduler that only ever draws one. A `Map` seeded from a
 * plain object gives host renderers the same standing as the shipped ones and
 * makes "which renderers exist" an inspectable value.
 *
 * ## The contract
 *
 * Each renderer returns an element for the caller to append into
 * {@link SchedulerEventRenderParams.el}. It **fills** the bar; it never
 * positions it - `left`, `top`, `width` and `height` are written by the bar
 * renderer from a pure layout pass, and a renderer that touched them would be
 * overwritten on the next frame and would force a layout in the meantime.
 *
 * ## Why `textContent`, never `innerHTML`
 *
 * Every string reaching these renderers is host data: an event title, a resource
 * name, a badge from a datasource. Assigning it to `innerHTML` would make any
 * record containing markup an injection vector, and sanitising on the render
 * path would cost more than building the two or three nodes a bar actually
 * needs. `textContent` is both safer and faster - it skips the HTML parser
 * entirely.
 *
 * ## Degradation is a first-class case, not a fallback
 *
 * A month view of a year of data produces bars a few pixels wide. Text in a
 * 20px bar is not small, it is *absent* - clipped to two or three glyphs that
 * read as noise. So every renderer checks {@link SchedulerEventRenderParams.width}
 * and drops to a single mark below {@link NARROW_BAR_PX}, which stays meaningful
 * because colour and shape survive at any width where the bar is visible at all.
 *
 * ## Styling
 *
 * No renderer writes a style property. Appearance comes from the classes below,
 * which resolve `--pg-*` tokens in the scheduler stylesheet, so a mode or
 * variant change repaints every bar with no re-render. The one exception is
 * genuinely continuous data - a progress ratio - which is published as the CSS
 * custom property `--pg-scheduler-progress` for the sheet to consume. That is
 * the same seam the grid itself uses for `--pg-scroll-x`: a variable is a datum
 * the theme interprets, not a hardcoded rule that overrides it.
 */

/**
 * Width below which a bar shows only its mark.
 *
 * 40px is roughly four glyphs plus the bar's own 12px of horizontal padding -
 * the point where a label stops being short and starts being wrong.
 */
export const NARROW_BAR_PX = 40;

/** Width below which secondary content (subtitle, percentage, counter) is dropped. */
const COMPACT_BAR_PX = 120;

/** Root class every built-in renderer's output carries. */
const CONTENT_CLASS = 'pg-scheduler-bar__content';

/** Signature the built-ins narrow {@link SchedulerEventRenderer} to. */
type BuiltInEventRenderer = (params: SchedulerEventRenderParams) => HTMLElement;

/**
 * Creates an element with a class, in one call.
 *
 * Trivial, but this file would otherwise repeat the two-line create/assign pair
 * around forty times, and each repetition is a place to mistype a class name.
 */
function el(tag: 'span' | 'div', className: string): HTMLElement {
  const node = document.createElement(tag);
  node.className = className;
  return node;
}

/**
 * The content root, tagged with the renderer that produced it.
 *
 * The modifier class is what lets one stylesheet rule reach every progress bar
 * without the renderer knowing any CSS, and what lets a host restyle a single
 * built-in without replacing it.
 */
function contentRoot(variant: string): HTMLElement {
  const root = el('span', `${CONTENT_CLASS} ${CONTENT_CLASS}--${variant}`);
  return root;
}

/**
 * A decorative mark: dot, diamond, priority flag.
 *
 * Always `aria-hidden`. The mark encodes something the label already states in
 * words, so announcing it would make a screen reader repeat every event twice.
 */
function mark(variant: string, modifier?: string): HTMLElement {
  const node = el('span', modifier
    ? `pg-scheduler-bar__${variant} pg-scheduler-bar__${variant}--${modifier}`
    : `pg-scheduler-bar__${variant}`);
  node.setAttribute('aria-hidden', 'true');
  return node;
}

/**
 * The bar's primary text.
 *
 * Falls back through title, then subtitle, then id, because an event with no
 * title is a data problem the user needs to *see* - rendering an empty bar hides
 * it, and rendering the id at least gives them something to search for.
 */
function labelOf(event: SchedulerEvent): string {
  if (typeof event.title === 'string' && event.title.length > 0) return event.title;
  if (typeof event.subtitle === 'string' && event.subtitle.length > 0) return event.subtitle;
  return event.id;
}

/** The label element, or `null` when the bar is too narrow to carry one. */
function labelFor(params: SchedulerEventRenderParams): HTMLElement | null {
  if (params.width < NARROW_BAR_PX) return null;
  const node = el('span', 'pg-scheduler-bar__label');
  node.textContent = labelOf(params.event);
  return node;
}

/**
 * Reads a string field off an event's open index signature.
 *
 * Host data is `unknown` by construction, and a number that happens to be in a
 * `status` field should still render. Anything else - object, null, undefined -
 * yields `undefined` rather than `"[object Object]"`.
 */
function readText(source: Readonly<Record<string, unknown>>, key: string): string | undefined {
  const value = source[key];
  if (typeof value === 'string') return value.length > 0 ? value : undefined;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return undefined;
}

/** The first defined string among `keys`, for fields hosts spell several ways. */
function readFirstText(
  source: Readonly<Record<string, unknown>> | undefined,
  keys: readonly string[],
): string | undefined {
  if (!source) return undefined;
  for (const key of keys) {
    const value = readText(source, key);
    if (value !== undefined) return value;
  }
  return undefined;
}

/**
 * Normalises a progress field to `0..1`.
 *
 * Accepts both conventions because both are common in the wild, and disambiguates
 * on magnitude: a value above 1 can only have been a percentage, since a ratio
 * cannot exceed 1. Out-of-range input is clamped rather than rejected, because a
 * bar that silently vanishes is a worse bug report than one that reads 100%.
 */
function readProgress(event: SchedulerEvent): number {
  const raw = event['progress'] ?? event['percent'] ?? event['completion'];
  const value = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(value)) return 0;
  const ratio = value > 1 ? value / 100 : value;
  return ratio < 0 ? 0 : ratio > 1 ? 1 : ratio;
}

/**
 * Lower-cases and hyphenates a host token so it is safe in a class name.
 *
 * Priorities and statuses arrive as `"In Progress"`, `"HIGH"`, `"on_hold"`. A
 * class name cannot contain a space, so an unsanitised value would silently
 * produce two classes and match neither rule.
 */
function slug(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/** Initials for the avatar, from a display name or, failing that, an id. */
function initialsOf(resource: SchedulerResource | undefined, event: SchedulerEvent): string {
  const name =
    readFirstText(resource, ['name', 'title', 'label', 'displayName', 'fullName'])
    ?? readFirstText(event, ['assignee', 'owner', 'user'])
    ?? resource?.id
    ?? event.resourceId;

  const words = name.split(/[\s._-]+/).filter((part) => part.length > 0);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

/**
 * Whole days from now until `t`, rounded toward zero.
 *
 * Deliberately arithmetic rather than calendar-aware: a deadline countdown is
 * "how much time is left", which is a duration, not a count of midnights
 * crossed. Using the calendar here would make a deadline four hours away read as
 * "1 day" merely because it falls after midnight.
 */
function daysUntil(t: number, now: number): number {
  return Math.trunc((t - now) / 86_400_000);
}

// -- Built-in renderers ------------------------------------------------------

/**
 * A status dot plus the title.
 *
 * The default for workflow data. The dot carries the state as a modifier class
 * so the palette lives in the stylesheet, which is what lets a host add a
 * `--blocked` state by writing one CSS rule instead of a renderer.
 */
const renderStatus: BuiltInEventRenderer = (params) => {
  const root = contentRoot('status');
  const status = readFirstText(params.event, ['status', 'state', 'phase']);

  const dot = mark('dot', status ? slug(status) : undefined);
  if (status) dot.dataset['status'] = status;
  root.appendChild(dot);

  const label = labelFor(params);
  if (label) root.appendChild(label);

  return root;
};

/**
 * Title plus a trailing pill.
 *
 * The badge falls back to the event type, so this renderer is useful on data
 * that carries no badge field at all - a mixed timeline where every bar states
 * what kind of thing it is.
 *
 * When the bar is narrow the badge wins and the title is dropped: a two-glyph
 * count or code survives clipping, and a title does not.
 */
const renderBadge: BuiltInEventRenderer = (params) => {
  const root = contentRoot('badge');
  const text = readFirstText(params.event, ['badge', 'code', 'count', 'type']);

  const label = labelFor(params);
  if (label) root.appendChild(label);

  if (text !== undefined) {
    const badge = el('span', 'pg-scheduler-bar__badge');
    badge.textContent = text;
    root.appendChild(badge);
  }

  return root;
};

/**
 * A compact pill with an optional second line.
 *
 * The subtitle appears only above {@link COMPACT_BAR_PX}, because two clipped
 * strings communicate less than one whole one.
 */
const renderChip: BuiltInEventRenderer = (params) => {
  const root = contentRoot('chip');

  if (params.width < NARROW_BAR_PX) {
    root.appendChild(mark('dot'));
    return root;
  }

  const text = el('span', 'pg-scheduler-bar__text');
  const label = el('span', 'pg-scheduler-bar__label');
  label.textContent = labelOf(params.event);
  text.appendChild(label);

  const subtitle = readText(params.event, 'subtitle');
  if (subtitle !== undefined && params.width >= COMPACT_BAR_PX) {
    const sub = el('span', 'pg-scheduler-bar__subtitle');
    sub.textContent = subtitle;
    text.appendChild(sub);
  }

  root.appendChild(text);
  return root;
};

/**
 * Resource initials plus the title.
 *
 * For schedules read across resources - an unassigned pool, a shared room - where
 * "who" matters more than "what". Initials rather than an image because a bar is
 * ~18px tall and a per-bar image request would be hundreds of requests on a
 * dense frame; a host that wants avatars registers a renderer that sets a
 * background image from a sprite.
 */
const renderAvatar: BuiltInEventRenderer = (params) => {
  const root = contentRoot('avatar');

  const avatar = el('span', 'pg-scheduler-bar__avatar');
  avatar.textContent = initialsOf(params.resource, params.event);
  avatar.setAttribute('aria-hidden', 'true');
  root.appendChild(avatar);

  const label = labelFor(params);
  if (label) root.appendChild(label);

  return root;
};

/**
 * A completion bar behind the title.
 *
 * The ratio is published as `--pg-scheduler-progress`, a percentage string, so
 * the fill's width is a stylesheet concern and the renderer writes no geometry.
 * `role="progressbar"` with the ARIA value triple is what makes the completion
 * audible - the visual fill alone conveys nothing to a screen reader.
 */
const renderProgress: BuiltInEventRenderer = (params) => {
  const root = contentRoot('progress');
  const ratio = readProgress(params.event);
  const percent = Math.round(ratio * 100);

  const track = el('span', 'pg-scheduler-bar__progress');
  track.style.setProperty('--pg-scheduler-progress', `${percent}%`);
  track.setAttribute('role', 'progressbar');
  track.setAttribute('aria-valuemin', '0');
  track.setAttribute('aria-valuemax', '100');
  track.setAttribute('aria-valuenow', String(percent));
  track.appendChild(el('span', 'pg-scheduler-bar__progress-fill'));
  root.appendChild(track);

  if (params.width < NARROW_BAR_PX) return root;

  const label = el('span', 'pg-scheduler-bar__label');
  label.textContent = labelOf(params.event);
  root.appendChild(label);

  if (params.width >= COMPACT_BAR_PX) {
    const value = el('span', 'pg-scheduler-bar__value');
    value.textContent = `${percent}%`;
    root.appendChild(value);
  }

  return root;
};

/**
 * A priority flag plus the title.
 *
 * Numeric priorities are mapped to the same four names as textual ones, so
 * `priority: 1` and `priority: 'critical'` render identically. That matters
 * because the two conventions routinely appear in one dataset after a migration,
 * and a timeline that colours them differently reads as corrupted data.
 */
const renderPriority: BuiltInEventRenderer = (params) => {
  const root = contentRoot('priority');
  const raw = params.event['priority'] ?? params.event['severity'] ?? params.event['urgency'];

  let level: string | undefined;
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    level = raw <= 1 ? 'critical' : raw === 2 ? 'high' : raw === 3 ? 'medium' : 'low';
  } else if (typeof raw === 'string' && raw.length > 0) {
    level = slug(raw);
  }

  const flag = mark('priority', level);
  if (level) flag.dataset['priority'] = level;
  root.appendChild(flag);

  const label = labelFor(params);
  if (label) root.appendChild(label);

  return root;
};

/**
 * A diamond marker with the title beside it.
 *
 * Milestones are instants, so their bars are almost always at the layout's
 * minimum width - which is why this renderer keeps its mark at every size and
 * treats the label as the optional part, the inverse of the others.
 */
const renderMilestone: BuiltInEventRenderer = (params) => {
  const root = contentRoot('milestone');
  root.appendChild(mark('marker', 'milestone'));

  // A zero-duration bar is a few pixels wide, so the label is allowed to
  // overflow the bar's own box; the stylesheet pins it beside the diamond.
  if (params.width >= NARROW_BAR_PX || params.event.end - params.event.start === 0) {
    const label = el('span', 'pg-scheduler-bar__label');
    label.textContent = labelOf(params.event);
    root.appendChild(label);
  }

  return root;
};

/**
 * A deadline marker, the title, and a live countdown.
 *
 * The countdown is derived at render time from `event.end`, so it stays honest
 * across a long-lived page without the host having to re-write the data. Overdue
 * is reported as a modifier class rather than a colour, keeping the "how late is
 * too late" judgement in the theme where a host can change it.
 */
const renderDeadline: BuiltInEventRenderer = (params) => {
  const root = contentRoot('deadline');
  const remaining = daysUntil(params.event.end, Date.now());
  const overdue = remaining < 0;

  root.appendChild(mark('marker', overdue ? 'overdue' : 'deadline'));

  if (params.width < NARROW_BAR_PX) return root;

  const label = el('span', 'pg-scheduler-bar__label');
  label.textContent = labelOf(params.event);
  root.appendChild(label);

  if (params.width >= COMPACT_BAR_PX) {
    const badge = el('span', `pg-scheduler-bar__badge pg-scheduler-bar__badge--${overdue ? 'overdue' : 'due'}`);
    badge.textContent = overdue ? `${-remaining}d over` : `${remaining}d`;
    root.appendChild(badge);
  }

  return root;
};

/**
 * The renderers shipped with the scheduler, by name.
 *
 * Exported as data rather than hidden behind {@link getEventRenderer} so a host
 * can compose one - wrapping `progress` to add a tooltip, say - without
 * reimplementing it, and so a documentation page can enumerate them.
 */
export const BUILT_IN_EVENT_RENDERERS: Readonly<Record<string, SchedulerEventRenderer>> = {
  status: renderStatus,
  badge: renderBadge,
  chip: renderChip,
  avatar: renderAvatar,
  progress: renderProgress,
  priority: renderPriority,
  milestone: renderMilestone,
  deadline: renderDeadline,
};

/**
 * The live registry, seeded from the built-ins.
 *
 * Module-level, therefore shared by every scheduler on the page. That is
 * intentional and matches the grid's icon registry: a renderer is a
 * *capability*, and registering one per grid instance would mean a host with two
 * schedulers registering everything twice.
 */
const EVENT_RENDERERS = new Map<string, SchedulerEventRenderer>(
  Object.entries(BUILT_IN_EVENT_RENDERERS),
);

/**
 * Registers a renderer under `name`, replacing any previous one.
 *
 * Replacement is allowed on purpose: overriding `status` with a house style is
 * the common case, and a registry that refused would force every host into a
 * parallel naming scheme. Passing a built-in name and later wanting the original
 * back is served by {@link BUILT_IN_EVENT_RENDERERS}, which is never mutated.
 */
export function registerEventRenderer(name: string, renderer: SchedulerEventRenderer): void {
  EVENT_RENDERERS.set(name, renderer);
}

/**
 * Looks up a renderer by name.
 *
 * Returns `undefined` rather than throwing or substituting a default, because
 * the caller - the bar renderer - already has a default and a throw on the
 * render path would take down a frame over a typo in config.
 */
export function getEventRenderer(name: string): SchedulerEventRenderer | undefined {
  return EVENT_RENDERERS.get(name);
}

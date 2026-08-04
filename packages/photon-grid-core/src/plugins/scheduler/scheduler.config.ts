import type { SchedulerEvent, SchedulerResource } from './data/scheduler.types';
import type { TimeRange, TimeUnit, WeekStart } from './time/calendar';
import type { SlotWidthMode, TimelineViewName } from './time/timeline-engine';

/**
 * Everything the scheduler renders and every hook it offers.
 *
 * Nothing here is hard-coded in the plugin: colours come from theme tokens,
 * event appearance comes from the type registry, and every interaction can be
 * vetoed or replaced. Defaults are merged so a minimal config is viable —
 * `{ resources, events }` alone produces a working month view.
 */
export interface SchedulerConfig {
  /** Rows of the scheduler. Also used to derive the grid's row data if the host does not supply it. */
  readonly resources?: readonly SchedulerResource[];
  /** Events, stored separately from resources and joined by `resourceId`. */
  readonly events?: readonly SchedulerEvent[];

  /** Named view preset. Ignored when {@link timeline} is given. @default 'month' */
  readonly view?: TimelineViewName;
  /** The span the timeline covers. @default the current month */
  readonly range?: TimeRange;
  /** Full timeline config, for views the presets do not cover. Overrides {@link view}. */
  readonly timeline?: {
    readonly unit: TimeUnit;
    readonly step: number;
    readonly headerBands?: ReadonlyArray<{ unit: TimeUnit; step: number }>;
  };

  /** Width of one timeline slot, in pixels. @default 40 */
  readonly slotWidth?: number;
  /**
   * Floor on slot width, applied after {@link slotWidth} and after zooming.
   *
   * A slot narrower than its own label is not communicating anything, so this
   * is the knob that keeps a month view readable rather than a smear of
   * one-character columns.
   * @default 0
   */
  readonly minSlotWidth?: number;
  /**
   * Floor on the rendered width of an event bar, in pixels.
   *
   * An 8-hour shift inside a 200px day slot is 66px wide, which is not
   * enough for its own label -- so short events render at this width and
   * overlap their neighbours rather than becoming unreadable slivers.
   * Lane stacking still separates them vertically.
   * @default 3
   */
  readonly minEventWidth?: number;
  /** @default 'equal' */
  readonly slotWidthMode?: SlotWidthMode;
  /** @default 1 (Monday) */
  readonly weekStartsOn?: WeekStart;

  /**
   * Maps a grid row to a resource id, for hosts whose row data is not shaped
   * like a resource. Return `null` for rows that are not resources — group
   * headers, detail rows, summaries.
   * @default `row.data.id`
   */
  readonly resourceIdOf?: (rowData: Record<string, unknown>) => string | null;

  /** Per-type appearance and behaviour. Merged over {@link DEFAULT_EVENT_TYPES}. */
  readonly eventTypes?: Readonly<Record<string, SchedulerEventTypeConfig>>;

  /** Appearance applied to every event, under its type's own config. */
  readonly eventDefaults?: SchedulerEventTypeConfig;

  /** Vertical inset inside a resource row. @default 2 */
  readonly rowPaddingY?: number;
  /** Gap between stacked lanes. @default 2 */
  readonly laneGap?: number;

  /** Interaction switches. */
  readonly selectable?: boolean | SchedulerSelectionConfig;
  readonly draggable?: boolean | SchedulerDragConfig;
  readonly resizable?: boolean | SchedulerResizeConfig;

  /** Non-working day/hour shading. */
  readonly nonWorking?: SchedulerNonWorkingConfig;

  /** Show a marker at the current time. @default true */
  readonly showNowMarker?: boolean;

  /** Lifecycle hooks. Returning `false` from a `before*` hook vetoes the action. */
  readonly onBeforeMove?: (e: SchedulerMoveIntent) => boolean | void;
  readonly onAfterMove?: (e: SchedulerMoveIntent) => void;
  readonly onBeforeResize?: (e: SchedulerResizeIntent) => boolean | void;
  readonly onAfterResize?: (e: SchedulerResizeIntent) => void;
  readonly onBeforeCreate?: (e: SchedulerEvent) => boolean | void;
  readonly onAfterCreate?: (e: SchedulerEvent) => void;
  readonly onBeforeDelete?: (e: SchedulerEvent) => boolean | void;
  readonly onAfterDelete?: (e: SchedulerEvent) => void;
  readonly onSelectionChanged?: (events: readonly SchedulerEvent[]) => void;
  readonly onEventClick?: (event: SchedulerEvent, native: MouseEvent) => void;
  readonly onEventDoubleClick?: (event: SchedulerEvent, native: MouseEvent) => void;
}

/**
 * Appearance and behaviour for one event type.
 *
 * Every colour field is a CSS value, so a host can pass a literal, but the
 * built-in types all pass `var(--pg-...)` tokens — which is why the scheduler
 * follows a theme change without re-rendering.
 */
export interface SchedulerEventTypeConfig {
  /** Icon name, resolved through the grid's icon registry. */
  readonly icon?: string;
  readonly background?: string;
  readonly borderColor?: string;
  readonly textColor?: string;
  readonly opacity?: number;
  readonly radius?: string;
  readonly padding?: string;
  readonly fontWeight?: string;
  /** Extra class on the bar element, for host CSS. */
  readonly cssClass?: string;
  /** Tooltip text, or a function of the event. */
  readonly tooltip?: string | ((event: SchedulerEvent) => string);
  /** Short label in the corner of the bar. */
  readonly badge?: string | ((event: SchedulerEvent) => string | null);
  /** Bars of this type cannot be moved. */
  readonly locked?: boolean;
  /** Replaces the default bar content. See {@link SchedulerEventRenderer}. */
  readonly renderer?: SchedulerEventRenderer;
}

/** What a custom event renderer receives. */
export interface SchedulerEventRenderParams {
  readonly event: SchedulerEvent;
  readonly resource: SchedulerResource | undefined;
  /** The bar element. Renderers fill it; they do not position it. */
  readonly el: HTMLElement;
  readonly selected: boolean;
  /** Bar width in pixels, so a renderer can degrade gracefully when narrow. */
  readonly width: number;
  readonly height: number;
}

/**
 * A custom event renderer.
 *
 * Function and HTML-string forms are handled here; framework components go
 * through the wrapper packages' factories, which adapt them to
 * {@link SchedulerEventComponent}.
 */
export type SchedulerEventRenderer =
  | ((params: SchedulerEventRenderParams) => HTMLElement | string | void)
  | SchedulerEventComponentConstructor;

/**
 * Lifecycle contract for a framework-backed event renderer.
 *
 * Mirrors the core's `DetailComponent` rather than the cell-renderer contract,
 * deliberately: a cell renderer is a pure "produce output for these params"
 * function with no teardown, but an event bar is long-lived, moves, resizes and
 * must be able to release a React root or an Angular view. `refresh` returning
 * `true` means "handled in place", so the framework reconciles instead of the
 * scheduler tearing the component down and rebuilding it.
 */
export interface SchedulerEventComponent {
  init?(params: SchedulerEventRenderParams): HTMLElement | string | void;
  getElement?(): HTMLElement | null;
  refresh?(params: SchedulerEventRenderParams): boolean | void;
  destroy?(): void;
}

export type SchedulerEventComponentConstructor = new () => SchedulerEventComponent;

export interface SchedulerSelectionConfig {
  readonly enabled?: boolean;
  /** @default 'multiple' */
  readonly mode?: 'single' | 'multiple';
  /** Show a checkbox on each bar. @default false */
  readonly checkboxes?: boolean;
}

export interface SchedulerDragConfig {
  readonly enabled?: boolean;
  /** Snap moves to slot boundaries. @default true */
  readonly snap?: boolean;
  /** Allow dragging between resources. @default true */
  readonly crossResource?: boolean;
  /** Reject a move that would overlap an existing event. @default false */
  readonly preventOverlap?: boolean;
  /**
   * When `false`, the scheduler runs the drag and its preview but never mutates
   * — the move surfaces as a *request* for the host to persist and confirm.
   * Mirrors the grid's managed/unmanaged row-drag contract.
   * @default true
   */
  readonly managed?: boolean;
}

export interface SchedulerResizeConfig {
  readonly enabled?: boolean;
  readonly snap?: boolean;
  /** Smallest duration a resize may produce, in ms. @default one slot */
  readonly minDuration?: number;
  readonly managed?: boolean;
}

/** Weekend/off-hours shading. */
export interface SchedulerNonWorkingConfig {
  /** Day indices treated as non-working. @default [0, 6] (Sun, Sat) */
  readonly weekendDays?: readonly number[];
  /** Specific dates (any time within the day) treated as holidays. */
  readonly holidays?: readonly number[];
  /** @default true */
  readonly shade?: boolean;
}

/** A proposed move, passed to the before/after hooks. */
export interface SchedulerMoveIntent {
  readonly event: SchedulerEvent;
  readonly fromResourceId: string;
  readonly toResourceId: string;
  readonly fromStart: number;
  readonly toStart: number;
  /** Duration is preserved by a move, so this is `toStart + duration`. */
  readonly toEnd: number;
  /** `false` when the host owns persistence — see {@link SchedulerDragConfig.managed}. */
  readonly managed: boolean;
}

/** A proposed resize. */
export interface SchedulerResizeIntent {
  readonly event: SchedulerEvent;
  readonly edge: 'start' | 'end';
  readonly fromStart: number;
  readonly fromEnd: number;
  readonly toStart: number;
  readonly toEnd: number;
  readonly managed: boolean;
}

/**
 * Built-in event types.
 *
 * Every colour resolves a theme token with a sensible fallback, so these follow
 * mode and variant changes without the scheduler knowing a theme exists. A host
 * overrides one by name and keeps the rest.
 */
export const DEFAULT_EVENT_TYPES: Readonly<Record<string, SchedulerEventTypeConfig>> = {
  vacation: { icon: 'sparkle', background: 'var(--pg-colors-info)', textColor: 'var(--pg-colors-on-primary)' },
  sick: { icon: 'warning', background: 'var(--pg-colors-danger)', textColor: 'var(--pg-colors-on-primary)' },
  holiday: { icon: 'check', background: 'var(--pg-colors-success)', textColor: 'var(--pg-colors-on-primary)', locked: true },
  publicHoliday: { icon: 'check', background: 'var(--pg-colors-success)', textColor: 'var(--pg-colors-on-primary)', locked: true },
  weekend: { background: 'var(--pg-colors-background-alt)', textColor: 'var(--pg-colors-text-secondary)', locked: true },
  workingDay: { background: 'var(--pg-colors-primary-soft)', textColor: 'var(--pg-colors-text-primary)' },
  shift: { icon: 'refresh', background: 'var(--pg-colors-primary)', textColor: 'var(--pg-colors-on-primary)' },
  nightShift: { icon: 'eye', background: 'var(--pg-colors-text-primary)', textColor: 'var(--pg-colors-surface)' },
  meeting: { icon: 'group', background: 'var(--pg-colors-primary-hover)', textColor: 'var(--pg-colors-on-primary)' },
  maintenance: { icon: 'settings', background: 'var(--pg-colors-warning)', textColor: 'var(--pg-colors-on-primary)' },
  production: { icon: 'chart', background: 'var(--pg-colors-primary-active)', textColor: 'var(--pg-colors-on-primary)' },
  reservation: { icon: 'pin', background: 'var(--pg-colors-info)', textColor: 'var(--pg-colors-on-primary)' },
  booking: { icon: 'check', background: 'var(--pg-colors-info)', textColor: 'var(--pg-colors-on-primary)' },
  overtime: { icon: 'add', background: 'var(--pg-colors-warning)', textColor: 'var(--pg-colors-on-primary)' },
  training: { icon: 'edit', background: 'var(--pg-colors-primary-light)', textColor: 'var(--pg-colors-text-primary)' },
  leave: { icon: 'close', background: 'var(--pg-colors-text-disabled)', textColor: 'var(--pg-colors-surface)' },
  task: { icon: 'check', background: 'var(--pg-colors-primary)', textColor: 'var(--pg-colors-on-primary)' },
  deadline: { icon: 'warning', background: 'var(--pg-colors-danger)', textColor: 'var(--pg-colors-on-primary)' },
  milestone: { icon: 'sparkle', background: 'var(--pg-colors-primary-active)', textColor: 'var(--pg-colors-on-primary)' },
};

/** Config with every default filled in. */
export interface ResolvedSchedulerConfig {
  readonly slotWidth: number;
  readonly minSlotWidth: number;
  readonly minEventWidth: number;
  readonly slotWidthMode: SlotWidthMode;
  readonly weekStartsOn: WeekStart;
  readonly rowPaddingY: number;
  readonly laneGap: number;
  readonly eventTypes: Readonly<Record<string, SchedulerEventTypeConfig>>;
  readonly eventDefaults: SchedulerEventTypeConfig;
  readonly selection: Required<SchedulerSelectionConfig>;
  readonly drag: Required<SchedulerDragConfig>;
  readonly resize: Required<SchedulerResizeConfig>;
  readonly nonWorking: Required<SchedulerNonWorkingConfig>;
  readonly showNowMarker: boolean;
  readonly resourceIdOf: (rowData: Record<string, unknown>) => string | null;
}

/** Normalises a boolean-or-object switch into its object form. */
function resolveSwitch<T extends object>(
  value: boolean | T | undefined,
  defaults: Required<T>,
  defaultEnabled: boolean,
): Required<T> {
  if (value === undefined) return { ...defaults, enabled: defaultEnabled } as Required<T>;
  if (typeof value === 'boolean') return { ...defaults, enabled: value } as Required<T>;
  return { ...defaults, ...value } as Required<T>;
}

/** Fills in every default, so the rest of the plugin never writes `?? fallback`. */
export function resolveSchedulerConfig(config: SchedulerConfig): ResolvedSchedulerConfig {
  return {
    slotWidth: Math.max(config.slotWidth ?? 40, config.minSlotWidth ?? 0),
    minSlotWidth: config.minSlotWidth ?? 0,
    minEventWidth: config.minEventWidth ?? 3,
    slotWidthMode: config.slotWidthMode ?? 'equal',
    weekStartsOn: config.weekStartsOn ?? 1,
    rowPaddingY: config.rowPaddingY ?? 2,
    laneGap: config.laneGap ?? 2,
    // Host types layer over the built-ins by name, so overriding `vacation`
    // leaves the other eighteen intact.
    eventTypes: { ...DEFAULT_EVENT_TYPES, ...config.eventTypes },
    eventDefaults: config.eventDefaults ?? {},
    selection: resolveSwitch(config.selectable, { enabled: true, mode: 'multiple', checkboxes: false }, true),
    drag: resolveSwitch(
      config.draggable,
      { enabled: true, snap: true, crossResource: true, preventOverlap: false, managed: true },
      true,
    ),
    resize: resolveSwitch(
      config.resizable,
      { enabled: true, snap: true, minDuration: 0, managed: true },
      true,
    ),
    nonWorking: {
      weekendDays: config.nonWorking?.weekendDays ?? [0, 6],
      holidays: config.nonWorking?.holidays ?? [],
      shade: config.nonWorking?.shade ?? true,
    },
    showNowMarker: config.showNowMarker ?? true,
    resourceIdOf:
      config.resourceIdOf
      ?? ((rowData) => {
        const id = rowData['id'];
        return typeof id === 'string' ? id : typeof id === 'number' ? String(id) : null;
      }),
  };
}

/**
 * Photon Scheduler — timeline plugin for Photon Grid.
 *
 * Imported through its own subpath so it stays out of the default module graph:
 *
 * ```ts
 * import { SchedulerPlugin } from 'photon-grid-core/plugins/scheduler';
 * ```
 *
 * A host that never writes that import pays nothing — not the code, not the
 * ~9 KB stylesheet, not the event index. Core never imports anything from here;
 * the only coupling is the `GridPlugin` contract, which is types-only.
 *
 * @packageDocumentation
 */

// -- Plugin -------------------------------------------------------------------
export { SchedulerPlugin } from './scheduler-plugin';

// -- Configuration ------------------------------------------------------------
export { resolveSchedulerConfig, DEFAULT_EVENT_TYPES } from './scheduler.config';
export type {
  SchedulerConfig,
  ResolvedSchedulerConfig,
  SchedulerEventTypeConfig,
  SchedulerEventRenderer,
  SchedulerEventRenderParams,
  SchedulerEventComponent,
  SchedulerEventComponentConstructor,
  SchedulerSelectionConfig,
  SchedulerDragConfig,
  SchedulerResizeConfig,
  SchedulerNonWorkingConfig,
  SchedulerMoveIntent,
  SchedulerResizeIntent,
} from './scheduler.config';

// -- Data model ---------------------------------------------------------------
export { EventIndex } from './data/event-index';
export type { SchedulerEvent, SchedulerResource } from './data/scheduler.types';

// -- Time ---------------------------------------------------------------------
// The calendar primitives are exported because a host building its own event
// data needs the same DST-correct arithmetic the timeline uses -- computing a
// shift boundary with `t + 86400000` is exactly the bug this module exists to
// prevent.
export {
  startOf,
  add,
  diffIn,
  ticksBetween,
  daysInMonth,
  hasOffsetChange,
  MINUTE_MS,
  HOUR_MS,
} from './time/calendar';
export type { TimeUnit, TimeRange, WeekStart, CalendarOptions } from './time/calendar';

export {
  buildTimeline,
  buildTimelineFromView,
  TIMELINE_PRESETS,
} from './time/timeline-engine';
export type {
  Timeline,
  TimelineConfig,
  TimelineViewName,
  SlotWidthMode,
  HeaderBand,
  HeaderCell,
  ResolvedHeaderBand,
} from './time/timeline-engine';

export {
  UniformAxis,
  PrefixAxis,
  buildPrefixAxis,
  visibleSlotWindow,
  visibleTimeRange,
} from './time/slot-axis';
export type { SlotAxis, SlotWindow } from './time/slot-axis';

// -- Layout -------------------------------------------------------------------
// Pure functions, exported so a host can unit-test its own assumptions about
// stacking and geometry without standing up a grid.
export { layoutLanes } from './layout/lane-layout';
export type { LaneInput, LanePlacement } from './layout/lane-layout';
export { computeBarLayout, createBarLayoutScratch } from './layout/bar-layout';
export type {
  BarPlacement,
  BarLayoutOptions,
  BarLayoutResult,
  BarLayoutScratch,
} from './layout/bar-layout';

// -- Rendering ----------------------------------------------------------------
export { EventBarRenderer } from './render/event-bar-renderer';
export { SchedulerHeader } from './render/scheduler-header';
export {
  BUILT_IN_EVENT_RENDERERS,
  registerEventRenderer,
  getEventRenderer,
} from './render/event-renderers';

// -- Services -----------------------------------------------------------------
export { EventSelectionService } from './services/event-selection-service';
export { EventDragService } from './services/event-drag-service';
export { EventResizeService } from './services/event-resize-service';
export { SchedulerKeyboardService } from './services/scheduler-keyboard-service';

// -- API and events -----------------------------------------------------------
export { SchedulerApi } from './api/scheduler-api';
export type { SchedulerApiHooks } from './api/scheduler-api';
export { SchedulerEventName } from './scheduler-runtime';
export type { SchedulerRuntime, SchedulerModule } from './scheduler-runtime';
export type {
  SchedulerEventPayloadMap,
  SchedulerEventsChangedPayload,
  SchedulerSelectionChangedPayload,
  SchedulerEventClickedPayload,
  SchedulerMovePayload,
  SchedulerResizePayload,
  SchedulerCreatePayload,
  SchedulerDeletePayload,
  SchedulerViewChangedPayload,
} from './events/scheduler-events';

// -- Theme --------------------------------------------------------------------
export {
  schedulerCss,
  injectSchedulerStyles,
  removeSchedulerStyles,
} from './theme/scheduler-styles';

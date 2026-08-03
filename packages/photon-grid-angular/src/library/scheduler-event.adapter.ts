import {
    ApplicationRef,
    ComponentRef,
    EmbeddedViewRef,
    EnvironmentInjector,
    TemplateRef,
    createComponent,
} from '@angular/core';
import type { Type } from '@angular/core';

import type {
    SchedulerEventComponent,
    SchedulerEventComponentConstructor,
    SchedulerEventRenderParams,
} from 'photon-grid-core';

/**
 * The locals an `<ng-template>` event renderer is given.
 *
 * `$implicit` is the whole params object, so `let-params` works, and the three
 * fields a bar template actually reads are lifted to their own locals because
 * `let-event` reads considerably better in a template than `params.event` does.
 */
export interface SchedulerEventTemplateContext {
    readonly $implicit: SchedulerEventRenderParams;
    readonly params: SchedulerEventRenderParams;
    readonly event: SchedulerEventRenderParams['event'];
    readonly resource: SchedulerEventRenderParams['resource'];
    readonly selected: boolean;
}

/**
 * Angular factories for scheduler event bars.
 *
 * ## Why these mirror the detail renderers, not the cell renderers
 *
 * A cell renderer is a pure "produce output for these params" call with no
 * teardown hook, which is why `RendererAdapter` has to watch the DOM with a
 * `MutationObserver` to know when to destroy what it mounted. An event bar is
 * different in kind: the core's `SchedulerEventComponent` contract has real
 * `init` / `refresh` / `destroy` hooks, because a bar is long-lived - it moves,
 * resizes and re-selects while staying the same component instance.
 *
 * So these factories follow `createComponentDetailRenderer` and
 * `createTemplateDetailRenderer` exactly: create once, attach to
 * `ApplicationRef`, update in place on refresh, and detach plus destroy on
 * teardown. `refresh` returns `true` to mean "handled in place", which is what
 * stops the scheduler from tearing the component down and rebuilding it on every
 * drag frame - and with it any focus, scroll position or component state inside
 * the bar.
 *
 * ## Why `attachView` is not optional
 *
 * Attaching is what makes the view participate in normal change detection - zone
 * triggers, the async pipe, event bindings. Detaching in `destroy` is equally
 * load-bearing: a view merely removed from the DOM is still registered with
 * `ApplicationRef` and would be change-detected forever, which on a virtualized
 * timeline means a leak that grows with every scroll.
 *
 * ## Why free functions rather than `RendererAdapter` methods
 *
 * The scheduler is an optional plugin behind its own subpath entry. Putting
 * these on the adapter would make every `<photon-grid>` - including the ones
 * that never render a timeline - carry the import.
 */

/**
 * Wraps an Angular `@Component` in a core `SchedulerEventComponent` class.
 *
 * The returned class is constructed by the scheduler with **no arguments**, so
 * the component type and the Angular services it needs are captured in this
 * closure rather than injected - the same reason the detail factories capture
 * their adapter.
 *
 * Inputs `params`, `event`, `resource` and `selected` are set before the first
 * change-detection pass, so the component's template never renders a frame
 * against undefined inputs.
 *
 * @param component - The component type to mount inside each bar.
 * @param injector - Environment injector the component is created in, normally
 *   the one the host `<photon-grid>` was created with.
 * @param appRef - Used to attach and detach the host view. See the note on
 *   change detection above.
 */
export function createAngularSchedulerEventRenderer(
    component: Type<unknown>,
    injector: EnvironmentInjector,
    appRef: ApplicationRef,
): SchedulerEventComponentConstructor {
    return class AngularSchedulerEventRenderer implements SchedulerEventComponent {
        private ref?: ComponentRef<unknown>;

        init(params: SchedulerEventRenderParams): HTMLElement {
            const ref = createComponent(component, { environmentInjector: injector });

            applyEventInputs(ref, params);
            appRef.attachView(ref.hostView);
            ref.changeDetectorRef.detectChanges();

            this.ref = ref;
            return ref.location.nativeElement as HTMLElement;
        }

        getElement(): HTMLElement | null {
            return this.ref ? (this.ref.location.nativeElement as HTMLElement) : null;
        }

        refresh(params: SchedulerEventRenderParams): boolean {
            if (!this.ref) {
                return false;
            }
            applyEventInputs(this.ref, params);
            this.ref.changeDetectorRef.detectChanges();
            return true;
        }

        destroy(): void {
            if (!this.ref) {
                return;
            }
            appRef.detachView(this.ref.hostView);
            this.ref.destroy();
            this.ref = undefined;
        }
    };
}

/**
 * Wraps an `<ng-template>` in a core `SchedulerEventComponent` class.
 *
 * A class rather than a plain `(params) => HTMLElement` function because only
 * the class form gets `destroy()`, and an embedded view that is merely detached
 * from the DOM stays attached to `ApplicationRef`.
 *
 * `refresh` returns `true`: the context exposes its fields through live
 * accessors onto the latest params, so a change-detection pass *is* the whole
 * update. Recreating the view on every frame of a drag would throw away
 * everything inside the template for no benefit.
 *
 * @param tpl - The template to instantiate per bar.
 * @param appRef - Used to attach and detach the embedded view.
 */
export function createTemplateSchedulerEventRenderer(
    tpl: TemplateRef<unknown>,
    appRef: ApplicationRef,
): SchedulerEventComponentConstructor {
    const template = tpl as TemplateRef<SchedulerEventTemplateContext>;

    return class TemplateSchedulerEventRenderer implements SchedulerEventComponent {
        private viewRef?: EmbeddedViewRef<SchedulerEventTemplateContext>;
        private host?: HTMLElement;
        /**
         * The latest params, read back through the context's accessors. Held in
         * a field rather than baked into the context so `refresh` updates every
         * local at once without rebuilding the object.
         */
        private params?: SchedulerEventRenderParams;

        init(params: SchedulerEventRenderParams): HTMLElement {
            this.params = params;

            const viewRef = template.createEmbeddedView(
                buildTemplateContext(() => this.params as SchedulerEventRenderParams),
            );

            appRef.attachView(viewRef);
            viewRef.detectChanges();
            this.viewRef = viewRef;

            // A template may have several root nodes, or text-only content, so
            // it gets a single host element the scheduler can position and
            // recycle as one thing.
            const host = document.createElement('span');
            host.className = 'photon-grid__scheduler-event-host';
            host.append(...viewRef.rootNodes);
            this.host = host;
            return host;
        }

        getElement(): HTMLElement | null {
            return this.host ?? null;
        }

        refresh(params: SchedulerEventRenderParams): boolean {
            if (!this.viewRef) {
                return false;
            }
            this.params = params;
            this.viewRef.detectChanges();
            return true;
        }

        destroy(): void {
            if (!this.viewRef) {
                return;
            }
            appRef.detachView(this.viewRef);
            this.viewRef.destroy();
            this.viewRef = undefined;
            this.host = undefined;
            this.params = undefined;
        }
    };
}

/**
 * Feeds the four bar inputs into a component.
 *
 * `event`, `resource` and `selected` are passed separately from `params` even
 * though they are all reachable through it, so a component can declare exactly
 * the inputs it uses and stay out of change detection for the rest - a bar that
 * only shows a title should not re-render because the bar got two pixels wider.
 */
function applyEventInputs(ref: ComponentRef<unknown>, params: SchedulerEventRenderParams): void {
    setComponentInput(ref, 'params', params);
    setComponentInput(ref, 'event', params.event);
    setComponentInput(ref, 'resource', params.resource);
    setComponentInput(ref, 'selected', params.selected);
}

/**
 * Sets an input, falling back to a direct property write.
 *
 * `setInput` throws when the component declares no such input, which is the
 * normal case here - most bar components want `event` and nothing else. The
 * fallback keeps that from being an error while still supporting components that
 * declare all four.
 */
function setComponentInput(ref: ComponentRef<unknown>, key: string, value: unknown): void {
    try {
        ref.setInput(key, value);
        return;
    } catch {
        const instance = ref.instance as Record<string, unknown>;
        instance[key] = value;
    }
}

/**
 * Builds the template locals as accessors onto the current params.
 *
 * Accessors rather than a snapshot for the same reason the detail context uses
 * them: a `let-selected` binding must reflect the selection as it changes, and
 * rebuilding the context object on every frame would allocate per bar per frame
 * on the drag path.
 */
function buildTemplateContext(
    current: () => SchedulerEventRenderParams,
): SchedulerEventTemplateContext {
    const context = {} as SchedulerEventTemplateContext;

    Object.defineProperties(context, {
        $implicit: { get: () => current(), enumerable: true },
        params: { get: () => current(), enumerable: true },
        event: { get: () => current().event, enumerable: true },
        resource: { get: () => current().resource, enumerable: true },
        selected: { get: () => current().selected, enumerable: true },
    });

    return context;
}

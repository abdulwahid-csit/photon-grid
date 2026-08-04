import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DragFrameScheduler } from '../../src/drag-drop/drag-frame-scheduler';
import { installDragDom, type DragDomHarness } from './drag-dom-harness';

/**
 * The scheduler is the subsystem's primary lever: it is what turns a 125–1000 Hz
 * pointer stream into one unit of work per painted frame. These tests pin the
 * two properties every drag path depends on — that a burst collapses to a single
 * callback carrying the *newest* sample, and that `pointerup` can force the
 * queued sample out before drop logic runs.
 */
describe('DragFrameScheduler', () => {
  let dom: DragDomHarness;

  beforeEach(() => { dom = installDragDom(); });
  afterEach(() => { dom.restore(); });

  it('collapses a burst of samples into one callback with the newest values', () => {
    const calls: Array<[number, number]> = [];
    const scheduler = new DragFrameScheduler((x, y) => calls.push([x, y]));

    // Sixteen events inside one frame — roughly what a 1000 Hz mouse delivers
    // against a 60 Hz display.
    for (let i = 1; i <= 16; i++) scheduler.sample(i * 10, i);

    expect(calls).toHaveLength(0);   // nothing runs synchronously
    expect(dom.pendingFrames()).toBe(1);

    dom.runFrames();

    expect(calls).toEqual([[160, 16]]);
  });

  it('runs once per frame across successive frames', () => {
    const calls: Array<[number, number]> = [];
    const scheduler = new DragFrameScheduler((x, y) => calls.push([x, y]));

    scheduler.sample(1, 1);
    scheduler.sample(2, 2);
    dom.runFrames();

    scheduler.sample(3, 3);
    scheduler.sample(4, 4);
    dom.runFrames();

    expect(calls).toEqual([[2, 2], [4, 4]]);
  });

  it('does not schedule a frame when nothing has been sampled', () => {
    const calls: number[] = [];
    const scheduler = new DragFrameScheduler(() => calls.push(1));

    expect(dom.pendingFrames()).toBe(0);
    dom.runFrames();
    expect(calls).toHaveLength(0);
  });

  it('flushNow applies a queued sample synchronously and cancels the frame', () => {
    const calls: Array<[number, number]> = [];
    const scheduler = new DragFrameScheduler((x, y) => calls.push([x, y]));

    scheduler.sample(7, 8);
    expect(calls).toHaveLength(0);

    scheduler.flushNow();

    expect(calls).toEqual([[7, 8]]);
    expect(dom.pendingFrames()).toBe(0);

    // The cancelled frame must not deliver the same sample a second time.
    dom.runFrames();
    expect(calls).toHaveLength(1);
  });

  it('flushNow is a no-op when nothing is queued', () => {
    const calls: number[] = [];
    const scheduler = new DragFrameScheduler(() => calls.push(1));

    scheduler.flushNow();
    scheduler.sample(1, 1);
    scheduler.flushNow();
    scheduler.flushNow();   // second flush has nothing left to deliver

    expect(calls).toHaveLength(1);
  });

  it('cancel discards the queued sample without delivering it', () => {
    const calls: number[] = [];
    const scheduler = new DragFrameScheduler(() => calls.push(1));

    scheduler.sample(5, 5);
    scheduler.cancel();

    expect(dom.pendingFrames()).toBe(0);
    dom.runFrames();
    scheduler.flushNow();

    expect(calls).toHaveLength(0);
  });

  it('exposes the newest sample before it is delivered', () => {
    const scheduler = new DragFrameScheduler(() => {});

    scheduler.sample(11, 22);
    expect(scheduler.lastX).toBe(11);
    expect(scheduler.lastY).toBe(22);
    expect(scheduler.isPending).toBe(true);

    dom.runFrames();
    expect(scheduler.isPending).toBe(false);
  });

  it('reset clears the retained coordinates so a new gesture starts clean', () => {
    const scheduler = new DragFrameScheduler(() => {});

    scheduler.sample(99, 99);
    scheduler.reset();

    expect(scheduler.lastX).toBe(0);
    expect(scheduler.lastY).toBe(0);
    expect(scheduler.isPending).toBe(false);
  });

  it('a callback that samples again schedules exactly one further frame', () => {
    let depth = 0;
    const scheduler: DragFrameScheduler = new DragFrameScheduler(() => {
      depth++;
      if (depth === 1) scheduler.sample(2, 2);   // e.g. an auto-scroll re-evaluation
    });

    scheduler.sample(1, 1);
    dom.runFrames();
    expect(depth).toBe(1);
    expect(dom.pendingFrames()).toBe(1);

    dom.runFrames();
    expect(depth).toBe(2);
    expect(dom.pendingFrames()).toBe(0);
  });
});

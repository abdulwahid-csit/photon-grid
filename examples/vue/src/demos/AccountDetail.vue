<script setup>
/**
 * The custom detail renderer for the Master/Detail demo.
 *
 * Passed straight into `masterDetail.renderer`: the Vue wrapper recognises a
 * component object and wraps it in a core `DetailComponent` that owns its own
 * app instance, so the panel's watchers and lifecycle hooks are properly torn
 * down when the row collapses.
 *
 * `ctx` is the core `DetailContext`, so `emit` / `collapse` / `updateHeight`
 * are callable straight from the markup. `props` is whatever
 * `masterDetail.props(ctx)` returned, re-evaluated on every `ctx.refresh()`.
 */
const props = defineProps({
  /** Core detail context: `emit`, `collapse`, `refresh`, `updateHeight`. */
  ctx: { type: Object, required: true },
  /** The master row's data. */
  data: { type: Object, required: true },
  /** Derived props from `masterDetail.props(ctx)`. */
  props: { type: Object, default: () => ({}) },
});

const orderCount = () => Number(props.props?.orderCount ?? 0);
</script>

<template>
  <section class="md-detail">
    <h2 class="md-detail__title">Custom Detail Renderer</h2>
    <p class="md-detail__meta">
      {{ data.account }} · {{ orderCount() }} orders · rendered by a Vue component, not a nested grid
    </p>
    <div class="md-detail__actions">
      <button type="button" class="demo__btn" @click="ctx.emit('save', data)">Save</button>
      <button type="button" class="demo__btn demo__btn--ghost" @click="ctx.emit('export', data)">Export</button>
      <button type="button" class="demo__btn demo__btn--ghost" @click="ctx.collapse()">Collapse</button>
    </div>
  </section>
</template>

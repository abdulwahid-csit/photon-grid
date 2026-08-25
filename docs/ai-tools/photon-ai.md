---
title: "Photon AI"
description: "Photon AI — the grid's built-in natural-language command bar. Runs fully offline out of the box, or connect any LLM (Gemini, OpenAI, Anthropic, or a custom endpoint) to drive sorting, filtering, grouping, column management, and more."
---

# Photon AI

**Photon AI** is a natural-language command bar built into Photon Grid. Users
type plain English — *"sort salary descending"*, *"filter status to active"*,
*"group by department and pin it left"* — and the grid performs the action.

It runs in one of two interchangeable modes, chosen entirely by configuration:

| Mode | Back-end | Network | When to use |
|------|----------|---------|-------------|
| **Deterministic** *(default)* | Built-in offline rule-based interpreter | None | Zero-dependency, private, instant. Understands the built-in command catalog below. |
| **Generative** | Any LLM you configure (Gemini, OpenAI, Anthropic, or custom) | Yes | Free-form phrasing, reasoning, and conversational replies. |

Both modes share the **same command pipeline** — a natural-language request is
turned into structured commands that execute against the grid's public
`GridApi`. Switching from offline to a hosted model never changes how you call
Photon AI or what it can do; it only changes how the text is interpreted.

:::info Opt-in
Photon AI is inert until you enable it. Nothing runs, and no network request is
ever made, unless you set `photonAI.enabled` — and no model is contacted unless
you also supply a `provider`.
:::

## Enable Photon AI

Add a `photonAI` block to your grid options. With just `enabled: true` you get
the fully-offline deterministic command bar — no API key, no network.

<FrameworkTabs>
<TabItem value="vanilla" label="Vanilla JS">

```js
new PhotonGrid.GridCore(document.getElementById("grid"), {
  columns,
  data: rowData,
  photonAI: {
    enabled: true,
    placeholder: "Ask Photon AI…",
    defaultOpen: false
  }
});
```

</TabItem>
<TabItem value="react" label="React">

```tsx
import { PhotonGrid } from 'photon-grid-react';

export function App() {
  return (
    <div style={{ width: '100%', height: 500 }}>
      <PhotonGrid
        columns={columns}
        dataSet={rowData}
        options={{
          photonAI: {
            enabled: true,
            placeholder: 'Ask Photon AI…',
            defaultOpen: false,
          },
        }}
      />
    </div>
  );
}
```

</TabItem>
<TabItem value="angular" label="Angular">

```ts
import { Component } from '@angular/core';
import { PhotonGridComponent } from 'photon-grid-angular';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [PhotonGridComponent],
  template: `
    <div style="width: 100%; height: 500px;">
      <photon-grid [columns]="columns" [dataSet]="rowData" [options]="options"></photon-grid>
    </div>
  `,
})
export class AppComponent {
  columns = columns;
  rowData = rowData;
  options = {
    photonAI: {
      enabled: true,
      placeholder: 'Ask Photon AI…',
      defaultOpen: false,
    },
  };
}
```

</TabItem>
<TabItem value="vue" label="Vue">

```vue
<script setup lang="ts">
import { PhotonGrid } from 'photon-grid-vue';

const options = {
  photonAI: {
    enabled: true,
    placeholder: 'Ask Photon AI…',
    defaultOpen: false,
  },
};
</script>

<template>
  <div style="width: 100%; height: 500px;">
    <PhotonGrid :columns="columns" :dataSet="rowData" :options="options" />
  </div>
</template>
```

</TabItem>
</FrameworkTabs>

### `photonAI` options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enabled` | `boolean` | `false` | **Required to turn Photon AI on.** Everything is inert until this is `true`. |
| `placeholder` | `string` | `"Ask Photon AI..."` | Placeholder text in the empty command input. |
| `defaultOpen` | `boolean` | `false` | Whether the panel starts open when the grid mounts. |
| `provider` | `PhotonAIProviderConfig` | — | Opt-in generative back-end. Omit to stay fully offline (deterministic). See [Connect any AI model](#connect-any-ai-model). |

## What Photon AI can do

Every request maps to one or more **commands** that run against the grid. The
deterministic interpreter understands the built-in catalog below out of the box,
and a generative provider is given this exact catalog as its capability list —
so both modes drive the same set of grid actions.

### Sorting

| Command | Example phrases |
|---------|-----------------|
| Sort ascending | *"sort name ascending"*, *"sort salary asc"* |
| Sort descending | *"sort salary descending"*, *"order price high to low"* |
| Clear sort | *"clear sorting"*, *"remove sort"* |

### Filtering

| Command | Example phrases |
|---------|-----------------|
| Apply filter | *"filter status to active"*, *"salary greater than 5000"*, *"name contains john"*, *"date before 2024"* |
| Clear filters | *"clear all filters"*, *"remove filters"* |

Operators such as *greater than*, *less than*, *between*, *before*, *after*, and
*contains* are detected from the phrasing and coerced to the target column's data
type. Dropdown/enum columns are matched against their real allowed values.

### Column pinning

| Command | Example phrases |
|---------|-----------------|
| Pin left | *"pin price and income to the left"* |
| Pin right | *"pin status to the right"* |
| Unpin | *"unpin status, income and year"* |
| Unpin all | *"unpin every column"* |
| Pin half | *"pin half the columns left and half right"* |

### Column visibility

| Command | Example phrases |
|---------|-----------------|
| Hide column | *"hide the email column"* |
| Show column | *"show salary"* |
| Hide all columns | *"hide all columns"* (columns marked `alwaysVisible` are kept) |
| Show all columns | *"show every column"* |

### Column reordering

| Command | Example phrases |
|---------|-----------------|
| Move to start | *"move country column to the start"* |
| Move to end | *"move id to the end"* |

### Row grouping

| Command | Example phrases |
|---------|-----------------|
| Group by | *"group by department and status"* |
| Ungroup | *"clear grouping"* |
| Expand / collapse all groups | *"expand all groups"*, *"collapse all groups"* |
| Expand / collapse a row | *"expand row 3"*, *"collapse row 3"* |

### Selection & clipboard

| Command | Example phrases |
|---------|-----------------|
| Select a row | *"select row 5"* |
| Select all rows | *"select all rows"* |
| Select a row range | *"select rows 5 to 12"* |
| Select rows where… | *"select rows where salary over 80000"* |
| Select a column | *"select the salary column"* |
| Select all cells | *"select all cells"* |
| Copy / cut all cells | *"copy all cells"*, *"cut all cells"* |
| Clear selection | *"clear selection"* |

### Info & help

Read-only questions that report the grid's current state:

| Command | Example phrases |
|---------|-----------------|
| Row count | *"how many rows?"* |
| Column count | *"how many columns?"* |
| Selection info | *"what's selected?"* |
| Filter / sort / pin / group info | *"what filters are active?"*, *"what am I sorted by?"* |
| Hidden columns info | *"which columns are hidden?"* |
| Help | *"help"*, *"what can you do?"* — lists every command Photon AI understands |

## Connect any AI model

To switch from the offline interpreter to a generative model, add a `provider`
to your `photonAI` config. The **API key and endpoint live entirely in your app**
— Photon AI never hard-codes either and reads them from this config at request
time. Photon builds the grid context (columns, capabilities, current state) and
the system instruction; the provider returns structured actions that run through
the same command executor.

Hosted providers ship with a preset (endpoint, default model, auth scheme, and
request/response wire format), so you usually only supply an `apiKey`.

<FrameworkTabs>
<TabItem value="vanilla" label="Vanilla JS">

```js
new PhotonGrid.GridCore(document.getElementById("grid"), {
  columns,
  data: rowData,
  photonAI: {
    enabled: true,
    provider: {
      type: "gemini",           // "gemini" | "openai" | "anthropic" | "custom"
      apiKey: "YOUR_API_KEY",
      // model: "gemini-2.5-flash",   // optional — sensible default per provider
      temperature: 0
    }
  }
});
```

</TabItem>
<TabItem value="react" label="React">

```tsx
import { PhotonGrid } from 'photon-grid-react';

export function App() {
  return (
    <div style={{ width: '100%', height: 500 }}>
      <PhotonGrid
        columns={columns}
        dataSet={rowData}
        options={{
          photonAI: {
            enabled: true,
            provider: {
              type: 'gemini', // 'gemini' | 'openai' | 'anthropic' | 'custom'
              apiKey: process.env.NEXT_PUBLIC_PHOTON_AI_KEY,
              temperature: 0,
            },
          },
        }}
      />
    </div>
  );
}
```

</TabItem>
<TabItem value="angular" label="Angular">

```ts
import { Component } from '@angular/core';
import { PhotonGridComponent } from 'photon-grid-angular';
import { environment } from '../environments/environment';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [PhotonGridComponent],
  template: `
    <div style="width: 100%; height: 500px;">
      <photon-grid [columns]="columns" [dataSet]="rowData" [options]="options"></photon-grid>
    </div>
  `,
})
export class AppComponent {
  columns = columns;
  rowData = rowData;
  options = {
    photonAI: {
      enabled: true,
      provider: {
        type: 'gemini', // 'gemini' | 'openai' | 'anthropic' | 'custom'
        apiKey: environment.photonAiKey,
        temperature: 0,
      },
    },
  };
}
```

</TabItem>
<TabItem value="vue" label="Vue">

```vue
<script setup lang="ts">
import { PhotonGrid } from 'photon-grid-vue';

const options = {
  photonAI: {
    enabled: true,
    provider: {
      type: 'gemini', // 'gemini' | 'openai' | 'anthropic' | 'custom'
      apiKey: import.meta.env.VITE_PHOTON_AI_KEY,
      temperature: 0,
    },
  },
};
</script>

<template>
  <div style="width: 100%; height: 500px;">
    <PhotonGrid :columns="columns" :dataSet="rowData" :options="options" />
  </div>
</template>
```

</TabItem>
</FrameworkTabs>

:::warning API keys in the browser
For hosted providers the key is sent from the browser, so use one you are
comfortable exposing client-side (restricted by allowed origins / referrer). For
stricter secrecy, proxy requests through your own backend and point the provider
at that proxy — either by overriding `apiUrl`, or with a `custom` provider (see
below).
:::

### Provider presets

The `provider.type` selects a built-in preset. The only differences between the
hosted presets are the endpoint, default model, and auth header — everything
else (grid context, system instruction, command execution) is identical. The
`provider` object plugs into the `photonAI` config shown in the tabs above.

<Tabs>
<TabItem value="gemini" label="Gemini">

```js
provider: {
  type: "gemini",
  apiKey: "YOUR_GEMINI_KEY"
  // default model: "gemini-2.5-flash"
  // auth: appended as ?key=...
}
```

</TabItem>
<TabItem value="openai" label="OpenAI">

```js
provider: {
  type: "openai",
  apiKey: "YOUR_OPENAI_KEY"
  // default model: "gpt-4o-mini"
  // auth: Authorization: Bearer ...
  // OpenAI-compatible endpoints work too — override `apiUrl`.
}
```

</TabItem>
<TabItem value="anthropic" label="Anthropic">

```js
provider: {
  type: "anthropic",
  apiKey: "YOUR_ANTHROPIC_KEY"
  // default model: "claude-haiku-4-5-20251001"
  // auth: x-api-key ...
}
```

</TabItem>
</Tabs>

### Provider options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `type` | `'gemini' \| 'openai' \| 'anthropic' \| 'custom'` | `'gemini'` | Which preset to use (endpoint, default model, auth, wire format). |
| `apiKey` | `string` | — | Provider API key, applied with the provider's auth scheme. Never logged or persisted. Optional for `custom` setups that auth via `headers`. |
| `model` | `string` | provider default | Model id to invoke. Defaults to the provider's recommended fast model. |
| `apiUrl` | `string` | preset endpoint | Override the REST endpoint. **Required** for `custom`. May contain a `{model}` placeholder. |
| `headers` | `Record<string, string>` | — | Extra HTTP headers merged into every request (win over preset auth headers). Use for a proxy token or org id. |
| `systemInstruction` | `string` | — | Extra domain guidance appended to Photon AI's built-in instruction (house rules, product vocabulary). |
| `temperature` | `number` | `0` | Sampling temperature. Lower is more deterministic — recommended for command interpretation. |
| `requestTimeoutMs` | `number` | `30000` | Abort the request if the provider hasn't responded within this many ms. |
| `requestTransformer` | `(req) => unknown` | preset | Fully override how the request body is built. **Required** for `custom`. |
| `responseTransformer` | `(res) => PhotonAIResponse` | preset | Fully override how the raw response is parsed. **Required** for `custom`. |

### Custom provider (any endpoint)

Point Photon AI at **any** JSON HTTP endpoint — a self-hosted model, an internal
gateway, or your own backend proxy — with `type: "custom"`. You supply the
`apiUrl` and two transformers: one that shapes the outgoing request from
Photon's neutral request object, and one that parses the response back into
`{ actions, reply }`.

```js
photonAI: {
  enabled: true,
  provider: {
    type: "custom",
    apiUrl: "https://your-backend.example.com/grid-ai",
    headers: { Authorization: "Bearer <proxy-token>" },

    // Shape the outgoing request body from Photon's neutral request.
    requestTransformer: (request) => ({
      system: request.systemInstruction,
      prompt: request.userCommand,
      grid: request.gridContext,       // columns, capabilities, live state
      model: request.model,
      temperature: request.temperature
    }),

    // Parse your endpoint's response into Photon's structured shape.
    responseTransformer: (raw) => ({
      // Each action: { type: "<command key>", params: { ... } }
      actions: raw.actions ?? [],
      reply: raw.reply ?? ""
    })
  }
}
```

The `request.gridContext` handed to your transformer contains everything a model
needs to answer accurately, and nothing it doesn't:

- **`columns`** — for each column: `colId`, `header`, `field`, `type`, whether it
  is `sortable` / `filterable` / `groupable`, its `pinned` side, `visible` flag,
  and the allowed `options` for dropdown/enum columns.
- **`capabilities`** — the exact catalog of actions the model may emit (mirrored
  from the live command registry, so it can never drift from what the grid can do).
- **`state`** — a snapshot: total & visible row counts, active sort, active
  filters, grouped columns, and selected-row count.

Your `responseTransformer` must return `{ actions, reply }`, where each action is
`{ type, params }` using a command `type` from the capability catalog (e.g.
`"sortDescending"` with `params: { colId: "salary" }`). Photon validates and runs
each action through the same executor the offline interpreter uses.

## Programmatic API

You can drive Photon AI from code — for tests, a custom trigger button, or voice
input — with the same pipeline the panel uses. The grid API is available on the
`GridCore` instance (`grid.api`) or via the `onReady` option in the wrappers.

<FrameworkTabs>
<TabItem value="vanilla" label="Vanilla JS">

```js
const grid = new PhotonGrid.GridCore(document.getElementById("grid"), {
  columns,
  data: rowData,
  photonAI: { enabled: true }
});

// Deterministic / synchronous — returns a PhotonCommandResult.
const result = grid.api.submitAICommand("sort salary descending");
console.log(result.success, result.message);

// Async — uses the configured generative provider when present.
const asyncResult = await grid.api.submitAICommandAsync("show me the top earners");
console.log(asyncResult.message);
```

</TabItem>
<TabItem value="react" label="React">

```tsx
import { PhotonGrid } from 'photon-grid-react';

export function App() {
  let api: any;

  return (
    <div style={{ width: '100%', height: 500 }}>
      <PhotonGrid
        columns={columns}
        dataSet={rowData}
        options={{
          photonAI: { enabled: true },
          onReady: (gridApi) => {
            api = gridApi;
            const result = api.submitAICommand('sort salary descending');
            console.log(result.success, result.message);
          },
        }}
      />
    </div>
  );
}
```

</TabItem>
<TabItem value="angular" label="Angular">

```ts
import { Component } from '@angular/core';
import { PhotonGridComponent } from 'photon-grid-angular';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [PhotonGridComponent],
  template: `
    <div style="width: 100%; height: 500px;">
      <photon-grid [columns]="columns" [dataSet]="rowData" [options]="options"></photon-grid>
    </div>
  `,
})
export class AppComponent {
  private api: any;
  columns = columns;
  rowData = rowData;
  options = {
    photonAI: { enabled: true },
    onReady: (gridApi: any) => {
      this.api = gridApi;
      const result = this.api.submitAICommand('sort salary descending');
      console.log(result.success, result.message);
    },
  };
}
```

</TabItem>
<TabItem value="vue" label="Vue">

```vue
<script setup lang="ts">
import { PhotonGrid } from 'photon-grid-vue';

let api: any;

const options = {
  photonAI: { enabled: true },
  onReady: (gridApi: any) => {
    api = gridApi;
    const result = api.submitAICommand('sort salary descending');
    console.log(result.success, result.message);
  },
};
</script>

<template>
  <div style="width: 100%; height: 500px;">
    <PhotonGrid :columns="columns" :dataSet="rowData" :options="options" />
  </div>
</template>
```

</TabItem>
</FrameworkTabs>

Both methods **always resolve and never throw** — a failure comes back as
`{ success: false, message }`. `submitAICommand` runs the deterministic pipeline;
`submitAICommandAsync` uses the configured generative provider when one is
present, otherwise falls back to the deterministic result.

`PhotonCommandResult` shape:

| Field | Type | Description |
|-------|------|-------------|
| `success` | `boolean` | Whether the request parsed, resolved, and executed. |
| `message` | `string` | Human-readable summary (e.g. *"Sorted Salary descending."*). |
| `command` | `PhotonCommand` | The executed command `{ type, params }`, when successful. |

## How it works

1. **Normalize** — the raw text is lower-cased, tokenized, and stemmed.
2. **Interpret** —
   - *Deterministic:* tokens are matched against the intent registry; the
     best-matching intent wins.
   - *Generative:* the grid context + system instruction + user text are sent to
     your provider, which returns structured actions.
3. **Resolve** — column names and values in the request are resolved against the
   grid's *current* columns (fuzzy-matched, type-coerced).
4. **Execute** — each resulting command runs through the shared `CommandExecutor`
   against the public `GridApi`.
5. **Reply** — a short confirmation (or the model's conversational reply) is
   shown in the panel.

Because both modes end at the same executor, anything the deterministic
interpreter can do, a generative provider can do too — and vice-versa.

## Error handling

Generative requests fail gracefully and surface an actionable message in the
panel rather than a stack trace. Failures are categorized: network, HTTP,
rate-limit (429), auth (401/403), blocked (safety), invalid-response, and
timeout. The programmatic API reflects the same failure as
`{ success: false, message }`.

## See also

- [Configuration options](../getting-started/configuration-options.md) — the full `GridOptions` reference.
- [AI Theme Builder](./ai-theme-builder.md)
- [AI Docs Assistant](./ai-docs-assistant.md)

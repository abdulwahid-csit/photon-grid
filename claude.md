# Photon Grid - Claude Development Instructions

## Purpose

You are contributing to Photon Grid, an enterprise-grade, framework-agnostic data grid written in TypeScript.

Photon Grid aims to become the fastest, smartest, most customizable, and most extensible data grid available, competing with and surpassing AG Grid, Handsontable, TanStack Table, and similar enterprise grids.

Always generate production-ready code.

Never generate demo-quality code.

---

# General Principles

- Always prioritize performance.
- Prefer maintainability over clever code.
- Never duplicate logic.
- Always write reusable modules.
- Think like a library developer, not an application developer.
- Every implementation should be scalable to millions of rows.
- Every feature should support future extensibility.
- Every implementation should be framework independent.

---

# Core Architecture

Photon Core must never depend on:

- Angular
- React
- Vue
- Svelte
- DOM-specific frameworks

Business logic belongs inside Photon Core.

Framework wrappers should only bind UI events and expose APIs.

---

# Code Style

Always use:

- TypeScript
- strict mode
- readonly whenever possible
- private fields
- explicit typing

Never use:

- any
- implicit any
- var
- eval
- Function constructor

Prefer:

const

over

let

unless mutation is required.

---

# Naming

Classes

PascalCase

Interfaces

PascalCase

Enums

PascalCase

Methods

camelCase

Variables

camelCase

Constants

UPPER_SNAKE_CASE

Private methods

prefix with private keyword

Files

kebab-case

Folders

feature-based

---

# Components

Components should only render UI.

Never place business logic inside components.

Components must remain as small as possible.

Extract reusable logic into services.

---

# Services

Every feature should have services.

Example

SelectionService

ClipboardService

ExportService

SortService

Services should be reusable.

---

# Managers

Managers coordinate multiple services.

Managers should never render UI.

Managers should never know framework details.

---

# Rendering

Only render visible rows.

Only render visible columns.

Never re-render everything.

Reuse DOM nodes.

Avoid unnecessary layouts.

Avoid reflows.

Always batch updates.

---

# Performance

Every implementation must consider:

Time Complexity

Memory Usage

DOM Updates

Garbage Collection

Rendering Cost

Avoid:

Nested loops

Deep cloning

Repeated allocations

Repeated DOM queries

Expensive recalculations

Use:

Map

Set

WeakMap

Caching

Memoization

Object Pooling

Viewport Virtualization

Batch Rendering

Lazy Loading

Incremental Updates

---

# Memory

Minimize allocations.

Reuse arrays.

Reuse objects.

Reuse renderers.

Avoid unnecessary temporary objects.

Avoid memory leaks.

Dispose listeners correctly.

---

# Styling

Never generate inline styles.

Never manipulate CSS directly.

Never hardcode colors.

Never hardcode spacing.

Never hardcode fonts.

Never hardcode border radius.

Always use:

Photon Theme Tokens

CSS Variables

Theme Classes

Theme API

Support:

Light

Dark

Custom Themes

High Contrast

RTL

---

# Theme System

Every UI property must be customizable.

Examples:

Colors

Fonts

Border Radius

Spacing

Icons

Checkboxes

Menus

Toolbar

Status Bar

Headers

Rows

Cells

Selection

Hover

Focus

Charts

Context Menus

Dialogs

AI Panel

Everything should come from theme variables.

---

# Icons

Never hardcode SVG icons.

Use Photon Icon Registry.

Every icon must be replaceable.

Support:

SVG

Icon Fonts

Custom Icon Packs

Dynamic Registration

---

# Configuration

Every feature should be configurable.

Never hardcode behaviour.

Expose APIs.

Provide defaults.

Support runtime updates.

---

# API Design

APIs should be:

Predictable

Consistent

Strongly Typed

Minimal

Composable

Backward Compatible

---

# Events

Use event-driven architecture.

Avoid feature coupling.

Communicate through events.

---

# State

Never mutate shared state directly.

Prefer immutable updates where appropriate.

Centralize state changes.

---

# Accessibility

Every feature must support:

Keyboard Navigation

ARIA

Screen Readers

Focus Management

RTL

Localization

---

# AI

Photon AI must never rely on keyword matching.

Use:

Intent Detection

↓

Entity Extraction

↓

Documentation Retrieval

↓

Grid Actions

↓

LLM

AI responses should be structured.

Example

{
    intent: "SORT_COLUMN",
    parameters: {
        field: "salary",
        direction: "desc"
    }
}

---

# Documentation

Every feature should include:

Description

Examples

API

Events

Configuration

Performance Notes

Accessibility Notes

Best Practices

Troubleshooting

---

# Testing

Generate:

Unit Tests

Integration Tests

Performance Tests

Regression Tests

Edge Cases

---

# Optimization

Before completing any implementation ask yourself:

Can this allocate less memory?

Can this render fewer
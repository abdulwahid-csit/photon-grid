/**
 * Identifies one customizable rendering concern on a column.
 *
 * Used internally wherever a slot needs to be looked up generically (e.g.
 * {@link resolveColumnRenderer}) instead of by a hardcoded property access,
 * so new slots can be added without touching every call site.
 */
export var RendererSlot;
(function (RendererSlot) {
    RendererSlot["Display"] = "display";
    RendererSlot["Editor"] = "editor";
    RendererSlot["Option"] = "option";
    RendererSlot["Filter"] = "filter";
    RendererSlot["Tooltip"] = "tooltip";
    RendererSlot["Group"] = "group";
    RendererSlot["Header"] = "header";
    RendererSlot["Summary"] = "summary";
})(RendererSlot || (RendererSlot = {}));
//# sourceMappingURL=renderer.types.js.map
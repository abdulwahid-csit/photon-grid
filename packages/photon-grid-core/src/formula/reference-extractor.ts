/**
 * Walks an {@link AstNode} tree and collects every cell/range reference it
 * reads — the formula's *direct precedents*. The calculation engine (Phase 4)
 * uses this to build dependency-graph edges; the copy/fill logic (Phase 5) uses
 * the same traversal to offset relative references.
 *
 * The walk is iterative (an explicit stack) rather than recursive to avoid deep
 * call stacks on large nested formulas, per Photon Grid's "avoid recursion where
 * possible" rule.
 *
 * @packageDocumentation
 */

import { AstNode, AstNodeType } from './parser/ast.types';
import type { Reference } from './reference/reference.types';

/**
 * Collects all references from an AST.
 *
 * @param root - The formula's root AST node.
 * @returns Every {@link Reference} the formula reads, in traversal order
 *          (duplicates preserved; callers dedupe if needed).
 */
export function extractReferences(root: AstNode): Reference[] {
  const refs: Reference[] = [];
  const stack: AstNode[] = [root];

  while (stack.length > 0) {
    const node = stack.pop() as AstNode;
    switch (node.type) {
      case AstNodeType.CellRef:
        refs.push(node.ref);
        break;
      case AstNodeType.RangeRef:
        refs.push(node.ref);
        break;
      case AstNodeType.Unary:
        stack.push(node.operand);
        break;
      case AstNodeType.Binary:
        stack.push(node.left, node.right);
        break;
      case AstNodeType.Function:
        for (let i = 0; i < node.args.length; i++) stack.push(node.args[i]);
        break;
      // Literals and bare names contribute no cell/range references here.
      // (Named ranges are resolved to references separately, at eval time.)
      default:
        break;
    }
  }
  return refs;
}

/**
 * `true` when the AST contains at least one call to a function named in
 * `volatileNames` (upper-cased). Used to flag volatile formula cells.
 *
 * @param root          - The formula's root AST node.
 * @param volatileNames - Set of upper-cased volatile function names.
 */
export function containsVolatileFunction(root: AstNode, volatileNames: ReadonlySet<string>): boolean {
  const stack: AstNode[] = [root];
  while (stack.length > 0) {
    const node = stack.pop() as AstNode;
    switch (node.type) {
      case AstNodeType.Function:
        if (volatileNames.has(node.name.toUpperCase())) return true;
        for (let i = 0; i < node.args.length; i++) stack.push(node.args[i]);
        break;
      case AstNodeType.Unary:
        stack.push(node.operand);
        break;
      case AstNodeType.Binary:
        stack.push(node.left, node.right);
        break;
      default:
        break;
    }
  }
  return false;
}

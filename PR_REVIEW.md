## PR Review: Add C4 and ArchiMate Diagram Support (#34)

### Summary
This PR adds two new enterprise architecture diagram types — C4 Model and ArchiMate 3.2 — to the beautiful-mermaid library. It includes full parse→layout→render (SVG + ASCII) pipelines for both, plus 10 sample diagrams and integration into the existing infrastructure.

**+3,503 lines across 15 files. 2 commits.**

---

### Architecture & Design — Strengths

1. **Consistent module structure.** Both diagram types follow the established `parser → layout → renderer → types` pattern used by the existing sequence, class, and ER modules. This makes the codebase predictable and easy to navigate.

2. **Clean type system.** The type definitions in `c4/types.ts` and `archimate/types.ts` are well-structured, with clear separation between parsed and positioned types. Union types for element kinds, relationship types, and layers are thorough and match their respective specs.

3. **Reuse of shared infrastructure.** Both layouts reuse `dagre-adapter.ts` helpers (`centerToTopLeft`, `snapToOrthogonal`, `clipEndpointsToNodes`), `styles.ts` font metrics, and the theme system (`svgOpenTag`, `buildStyleBlock`). This avoids reinventing existing utilities.

4. **ArchiMate layer coloring.** The use of `color-mix(in srgb, ...)` with CSS custom properties for layer tints is a nice approach — it keeps the colors theme-aware without hardcoding dark/light variants.

---

### Issues & Suggestions

#### 1. No tests for the new diagram types
**Severity: High**

The existing codebase has dedicated test files for every supported diagram type (`parser.test.ts`, `er-parser.test.ts`, `class-parser.test.ts`, `sequence-parser.test.ts`, `er-integration.test.ts`, `class-integration.test.ts`, `sequence-integration.test.ts`). This PR adds two complex parsers with no corresponding test coverage.

At minimum, the following should be tested:
- **C4 parser:** Element parsing (all `_Ext` variants, technology args), boundary nesting, relationship directions (`Rel_D`, `BiRel`), edge cases (empty boundaries, missing arguments)
- **ArchiMate parser:** Layer block switching, element declaration formats (`type alias`, `type "Label" as alias`, `type "Label"`), relationship parsing (`-->|type|` vs `-->`), layer context reset on non-indented lines
- **Integration tests:** End-to-end `renderMermaid()` calls for both C4 and ArchiMate to verify SVG output is well-formed

#### 2. C4 parser: `line === '}'` strict equality is fragile
**Severity: Medium**
**File:** `src/c4/parser.ts`

```typescript
if (line === '}') {
  boundaryStack.pop()
  continue
}
```

The lines are not trimmed before comparison. While earlier diagram types receive pre-trimmed lines from the `renderMermaid` entry point, if `parseC4` is called directly via the exported API (`export { parseC4 }`), untrimmed lines with leading whitespace will fail to match closing braces. The element/boundary matchers use `line.match(...)` which handles whitespace via regex, but the `}` check does not.

**Suggestion:** Use `const trimmed = line.trim()` consistently, or use `line.trim() === '}'`.

#### 3. C4 parser: `boundaryStack.pop()` without depth check
**Severity: Low**
**File:** `src/c4/parser.ts`

If the input has a stray `}` without a matching boundary opening, `boundaryStack.pop()` on an empty array returns `undefined` silently. This won't crash, but it's a silent error. Consider adding a guard.

#### 4. ArchiMate parser: layer context reset heuristic is dead code
**Severity: Medium**
**File:** `src/archimate/parser.ts`

```typescript
if (currentLayer && !raw.match(/^\s/) && !layerMatch) {
  currentLayer = null
  ...
}
```

The parser uses indentation (non-whitespace-prefixed lines) to detect when we've "left" a layer block. But in the `renderMermaid` pipeline, **all lines are pre-trimmed** (`text.split('\n').map(l => l.trim())`), so indentation information is lost by the time `parseArchimate` receives them. The indentation-based reset logic is dead code in the normal pipeline.

**Suggestion:** Either preserve indentation by not trimming before passing to `parseArchimate`, or remove the dead indentation check and rely solely on layer headers.

#### 5. Duplicated utility functions
**Severity: Low**

`midpoint()`, `flattenBoundaries()`, and `escapeXml()` are duplicated across multiple files:
- `midpoint`: `c4/renderer.ts` and `archimate/renderer.ts` (identical)
- `flattenBoundaries`: `c4/layout.ts` and `c4/renderer.ts` (identical)
- `escapeXml`: `c4/renderer.ts` and `archimate/renderer.ts` (identical)

These could be extracted to shared utility modules.

#### 6. `renderRelationshipMarkers` is a no-op
**Severity: Low**
**File:** `src/archimate/renderer.ts`

This function always returns empty string but is called in a loop. Either add a TODO comment or remove the dead code.

#### 7. Unnecessary `async` and unused `_options` parameter
**Severity: Low**
**Files:** `src/c4/layout.ts`, `src/archimate/layout.ts`

Both layout functions are `async` with no `await`, and accept unused `_options`. The code comments acknowledge this, but it's still unnecessary overhead.

#### 8. ArchiMate ASCII: `LAYER_LABELS` truncates "Implementation & Migration"
**Severity: Very Low**
**File:** `src/ascii/archimate-diagram.ts`

The ASCII renderer uses `'Implementation'` while the SVG renderer uses `'Implementation & Migration'`.

---

### Overall Assessment

Well-structured PR that follows established codebase patterns. Code quality is consistent, type safety is maintained, and both SVG and ASCII rendering paths are implemented. The main gap is the **absence of tests** — every other diagram type has parser and integration tests.

**Recommendation:** Add parser and integration tests for both C4 and ArchiMate before merge.

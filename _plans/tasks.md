# Refactor Tasks Checklist

Generated from refactor_plan_1.md. Check off as completed.

## Phase 1: Delete Dead Code (5 tasks)
- [x] Task #1: P1-C1 - Remove unused mapUtilities functions
- [x] Task #2: P1-C2 - Remove legacy country detection functions
- [x] Task #3: P1-C3 - Delete unused service files
- [x] Task #4: P1-C4 - Remove remaining dead code
- [x] Task #5: P1-C5 - Remove debug tooling (testCountryDetection + performanceLogger)

## Phase 2: Extract Shared Components (4 tasks)
- [x] Task #6: P2-C6 - Extract BookCard component
- [x] Task #7: P2-C7 - Extract BookList component
- [x] Task #8: P2-C8 - Refactor DesktopSidebar to use BookList
- [x] Task #9: P2-C9 - Refactor MobileBottomSheet to use BookList

## Phase 3: Introduce React Context (5 tasks)
- [x] Task #10: P3-C10 - Create BooksContext
- [x] Task #11: P3-C11 - Create ThemeContext
- [x] Task #12: P3-C12 - Create EnrichmentContext
- [x] Task #13: P3-C13 - Migrate page.tsx to use Contexts
- [x] Task #14: P3-C14 - Migrate child components to consume Contexts

## Phase 4: Restructure Enrichment Pipeline (3 tasks)
- [x] Task #15: P4-C15+16 - Implement incremental author resolution
- [x] Task #16: P4-C17 - Run cover loading in parallel with author resolution
- [x] Task #17: P4-C18 - Add UX for incremental loading

## Phase 5: Consolidate MapLibreMap (2 tasks)
- [x] Task #18: P5-C19 - Consolidate MapLibreMap useEffect hooks
- [x] Task #19: P5-C20+21 - Memoize heatmap + add React.memo

## Phase 6: Consolidate Service Files (1 task)
- [x] Task #20: P6-C22+23 - Consolidate service files

## Phase 7: Structural Cleanup (1 task)
- [ ] Task #21: P7-C24+25+26 - Structural cleanup

## Phase 8: Testability Foundation (1 task)
- [ ] Task #22: P8-C27+28 - Testability foundation + performance measurement

---

## Summary
**Total: 22 tasks**
- Phase 1: 5 (zero-risk, delete dead code)
- Phase 2: 4 (extract components, eliminate duplication)
- Phase 3: 5 (introduce Context for state management)
- Phase 4: 3 (incremental loading pipeline - big perf win)
- Phase 5: 2 (optimize MapLibreMap)
- Phase 6: 1 (consolidate services)
- Phase 7: 1 (cleanup)
- Phase 8: 1 (testability setup)

**Model strategy:**
- Phase 1: Haiku (fast & cheap)
- Phases 2-3, 5-8: Sonnet (moderate complexity)
- Phase 4: Opus (highest complexity - concurrency, UX)

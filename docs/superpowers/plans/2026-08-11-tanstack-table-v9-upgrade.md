# TanStack Table V9 Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `react-table` v7 with native `@tanstack/react-table` v9 while preserving Coop's shared table behavior, then stack the existing React 19 upgrade above the supported table dependency.

**Architecture:** Keep one reviewable table branch with two implementation checkpoints: native v7-to-v8 migration, then native v8-to-v9 migration. Centralize v9's feature object and feature-dependent type aliases in the shared table directory, while keeping the wrapper's public behavior and consumer data shape unchanged. After the lower branch is independently verified, use `gh stack` to rebase the existing React 19 branch above it.

**Tech Stack:** React 18.2 and 19.2, TypeScript 5.9, Vite 7, Vitest, React Testing Library, TanStack Table 8.21.3 and 9.1.2, npm 11, Node 24, `gh stack`.

## Global Constraints

- Work only in `/Users/tao/dev/roost/coop/.worktrees/react-19-upgrade`.
- Use Node 24 as required by `.nvmrc`; the verified local runtime is Node 24.18.0 with npm 11.16.0.
- Keep `upgrade/tanstack-table-v9` as one branch based on `main`; v8 is an internal commit, not a separate branch or pull request.
- Target `@tanstack/react-table` 8.21.3 for the intermediate checkpoint and 9.1.2 for the final table branch.
- Remove both `react-table` and `@types/react-table`; v9 includes its own types and declares React `>=18`.
- Use the native v8 and v9 APIs. Do not use `useLegacyTable`, `stockFeatures`, atoms, `table.Subscribe`, or `createTableHook`.
- Register only column filtering, column faceting, and row sorting in v9, with their required filtered, faceted, and sorted row models.
- Preserve the current display-row shape: accessor fields contain rendered/display values while `row.original.values` retains raw values used by custom sorting, filtering, links, selection callbacks, and collapsed rendering.
- Preserve pending filter values until Save, removable active-filter chips, sort icons/direction, row links, display-index selection highlighting, and collapsed-row rendering. Intentionally adopt native order-independent faceting: selectable options match all other filters while excluding the column's own filter.
- Keep `Table` generic in one row-data type shared by `data`, `columns`, `onSelectRow`, `rowLinkTo`, and `renderCollapsedCell`. Unfiltered rows need not contain `values`; custom raw filter/sort helpers require `values: Record<string, unknown>`.
- Never hand-edit or hand-merge `client/package-lock.json`; generate it with npm. Resolve any lock conflict by choosing one complete side, then run `npm install`.
- Never use `--legacy-peer-deps`, `--force`, or a package override to conceal an incompatibility.
- Do not edit either generated GraphQL file.
- Treat the baseline five audit findings (two moderate and three high) as pre-existing; do not introduce additional findings.
- `@tanstack/react-table`, `@tanstack/table-core`, and `@tanstack/react-store` use the MIT license, compatible with Coop's Apache-2.0 license.
- Do not push branches or open pull requests without explicit user approval.
- Add `Co-Authored-By: Amp` to agent-authored commits.

## File Map

### Shared table implementation

- Create: `client/src/webpages/dashboard/components/table/Table.test.tsx` — behavior-level regression coverage that survives both major migrations.
- Create in Task 3 only: `client/src/webpages/dashboard/components/table/tableFeatures.ts` — v9 feature registration and feature-dependent shared type aliases.
- Modify: `client/src/webpages/dashboard/components/table/Table.tsx` — table instance, markup, sorting handlers, row/cell rendering, links, local selection, and collapsed mode.
- Modify: `client/src/webpages/dashboard/components/table/TableFilter.tsx` — pending filter menu, active chips, per-column metadata, and faceted rows.
- Modify: `client/src/webpages/dashboard/components/table/filters.tsx` — custom filter predicates and filter-renderer prop types.
- Modify: `client/src/webpages/dashboard/components/table/sort.tsx` — custom sorting types while preserving raw-value comparisons.

### Table consumers

Convert legacy column keys and imports only where present in:

- `client/src/webpages/dashboard/actions/ActionsDashboard.tsx`
- `client/src/webpages/dashboard/banks/hash/HashBanksDashboard.tsx`
- `client/src/webpages/dashboard/banks/location/LocationBanksDashboard.tsx`
- `client/src/webpages/dashboard/banks/text/TextBanksDashboard.tsx`
- `client/src/webpages/dashboard/investigation/ItemInvestigationRuleResults.tsx`
- `client/src/webpages/dashboard/item_types/ItemTypesDashboard.tsx`
- `client/src/webpages/dashboard/items/ItemActionHistory.tsx`
- `client/src/webpages/dashboard/mrt/manual_review_job/MergedReportsComponent.tsx`
- `client/src/webpages/dashboard/mrt/manual_review_job/v2/user/ManualReviewJobCurrentJobsComponent.tsx`
- `client/src/webpages/dashboard/mrt/ManualReviewDecisionsTable.tsx`
- `client/src/webpages/dashboard/mrt/ManualReviewQueueJobsPreview.tsx`
- `client/src/webpages/dashboard/mrt/ManualReviewQueuesDashboard.tsx`
- `client/src/webpages/dashboard/mrt/ManualReviewRecentDecisions.tsx`
- `client/src/webpages/dashboard/ncmec/NcmecReportsDashboard.tsx`
- `client/src/webpages/dashboard/rules/dashboard/ReportingRulesDashboard.tsx`
- `client/src/webpages/dashboard/rules/dashboard/RulesDashboard.tsx`
- `client/src/webpages/dashboard/rules/info/insights/ReportingRuleInsightsSamplesTable.tsx`
- `client/src/webpages/dashboard/rules/info/insights/RuleInsightsSamplesTable.tsx`
- `client/src/webpages/dashboard/userStrikes/PolicyScoresTab.tsx`
- `client/src/webpages/dashboard/userStrikes/StrikeAnalyticsTab.tsx`
- `client/src/webpages/dashboard/userStrikes/StrikeEnabledActionsTab.tsx`
- `client/src/webpages/settings/ManageUsers.tsx`

### Manifests and stacked-branch documentation

- Modify: `client/package.json`
- Modify: `client/package-lock.json`
- Modify after restacking: `docs/superpowers/specs/2026-08-10-react-19-upgrade-design.md`
- Modify after restacking: `docs/superpowers/plans/2026-08-10-react-19-upgrade.md`

---

### Task 1: Characterize the shared v7 table behavior

**Files:**

- Create: `client/src/webpages/dashboard/components/table/Table.test.tsx`

**Interfaces:**

- Consumes: the main-branch `Table` props, React 18.2, `react-table` 7.8.0, React Testing Library, and `MemoryRouter`.
- Produces: behavior-level tests that remain unchanged across Tasks 2 and 3.

- [ ] **Step 1: Confirm the untouched client baseline**

Run from `client`:

```bash
node --version
npm ci
npm run test:prepush
npm audit --json > /tmp/coop-table-v7-audit.json || audit_status=$?
test "${audit_status:-0}" -le 1
node -e "const a=require('/tmp/coop-table-v7-audit.json'); if(a.metadata.vulnerabilities.total !== 5) process.exit(1)"
git status --short
```

Expected: Node reports `v24.18.0`; 32 test files pass with 204 passing and 2 skipped tests; the audit JSON parses and records 2 moderate and 3 high findings; `npm ci` does not modify either manifest.

- [ ] **Step 2: Add a render and sorting characterization test**

Create `Table.test.tsx` using `render`, `screen`, `within`, and `fireEvent` from React Testing Library plus `MemoryRouter`. Use stable columns and rows shaped like current consumers:

```tsx
const columns = [
  {
    Header: 'Name',
    accessor: 'name',
    sortType: stringSort,
  },
  {
    Header: 'Status',
    accessor: 'status',
    canSort: false,
  },
];

const data = [
  {
    name: <span>Rendered Zulu</span>,
    status: 'Open',
    values: { id: 'z', name: 'Zulu', status: 'Open' },
  },
  {
    name: <span>Rendered Alpha</span>,
    status: 'Closed',
    values: { id: 'a', name: 'Alpha', status: 'Closed' },
  },
  {
    name: <span>Rendered Alpine</span>,
    status: 'Open',
    values: { id: 'alpine', name: 'Alpine', status: 'Open' },
  },
];
```

Assert that headers and all rendered labels appear, the first Name click orders the labels by raw names as Alpha, Alpine, Zulu, the second reverses that raw order, and clicking Status does not change the order. This proves cells render accessor values while `stringSort` reads `row.original.values`.

- [ ] **Step 3: Run the focused test and correct only test assumptions**

```bash
npx vitest run src/webpages/dashboard/components/table/Table.test.tsx --passWithNoTests
```

Expected: the new sorting test passes against unmodified v7 production code. If a role or accessible name differs, inspect the rendered DOM and correct the test query; do not alter production behavior.

- [ ] **Step 4: Add filter-menu opt-in and Save-boundary characterization**

First render accessor columns without filter renderers and assert that no Filter button appears.

Then add Name and Status filters using the existing v7 definitions:

```tsx
Filter: (props: ColumnProps) =>
  DefaultColumnFilter({
    columnProps: props,
    accessor: 'name',
    placeholder: 'Filter names',
  }),
filter: 'text',
```

The test must:

1. Open the Filter menu.
2. Stage Name `alp` and Status `Closed` and prove all three rows remain visible before Save.
3. Click Save and prove only Rendered Alpha remains.
4. Assert both active chips appear.
5. Reopen the menu, clear Status, and click Save; prove Rendered Alpha and Rendered Alpine remain and the Status chip disappears.
6. Click the Name chip's existing close icon and prove all rows return.

These assertions prove multiple staged values apply atomically on Save, a cleared staged value removes a committed filter through Save, and text filtering uses the raw name instead of the rendered label.

- [ ] **Step 5: Add links, row selection, and collapsed-mode characterization**

Add one test that passes `rowLinkTo={(row) => `/rows/${row.original.values.id}`}` and a `vi.fn()` `onSelectRow`. Assert the cell links include `/rows/a`, `/rows/alpine`, and `/rows/z` hrefs, clicking a row invokes the callback with the matching raw ID, and the selected row receives the current indigo selected class.

Add one collapsed-mode test with:

```tsx
isCollapsed
collapsedColumnTitle="Summary"
renderCollapsedCell={(row) => `Collapsed ${row.original.values.name}`}
```

Assert only the Summary header and one collapsed cell per row render instead of the normal Status cells.

- [ ] **Step 6: Verify and commit the characterization boundary**

```bash
npx vitest run src/webpages/dashboard/components/table/Table.test.tsx --passWithNoTests
npm run test:prepush
git diff --check
git add client/src/webpages/dashboard/components/table/Table.test.tsx
git commit -m "Test shared table behavior

Co-Authored-By: Amp"
```

Expected: the focused file and complete baseline suite pass; only the new test file is committed.

---

### Task 2: Migrate react-table v7 to native TanStack Table v8

**Files:**

- Modify: `client/package.json`
- Modify: `client/package-lock.json`
- Modify: all shared table implementation and consumer files listed in the File Map.
- Test: `client/src/webpages/dashboard/components/table/Table.test.tsx`

**Interfaces:**

- Consumes: Task 1's unchanged behavior tests and consumer rows whose display fields coexist with raw `values`.
- Produces: `TableRow<TData>` and `TableColumnDef<TData, TValue>` aliases exported from `Table.tsx`, native v8 column definitions, and a fully verified v8 checkpoint.

- [ ] **Step 1: Replace the packages through npm**

Run from `client`:

```bash
npm uninstall react-table @types/react-table
npm install @tanstack/react-table@8.21.3
```

Expected: `react-table` and `@types/react-table` disappear from `package.json`; `@tanstack/react-table` appears under dependencies as `^8.21.3`; npm completes without peer-resolution flags.

- [ ] **Step 2: Run lint to capture the intentional RED boundary**

```bash
npm run lint 2>&1 | tee /tmp/coop-table-v8-before-migration.log
```

Expected: TypeScript fails because v7 imports no longer resolve. Preserve the log; do not add suppressions.

- [ ] **Step 3: Convert custom filters to v8 predicates**

In `filters.tsx`, replace v7 `Row` and `UseFiltersColumnProps` types with v8 `FilterFn`, `Row`, and `RowData` types. Keep `ColumnProps` application-owned and independent of a TanStack column instance because existing renderers only need faceted source rows and pending-state callbacks:

```tsx
export type ColumnProps<TData extends RowData = Record<string, any>> = {
  preFilteredRows: readonly Pick<Row<TData>, 'original'>[];
  setUnsavedFilterValue: (value: any) => void;
  unsavedFilterValue: any;
  onSave: () => void;
};
```

Register `text`, `includes`, `range`, and `dateRange` as v8 `FilterFn` predicates. Convert the old row-array return shape:

```tsx
text: (row, columnId, filterValue) => {
  if (filterValue == null || filterValue.length === 0) return true;
  const rowValue = row.original.values[columnId];
  return rowValue != null
    ? String(rowValue).toLowerCase().includes(String(filterValue).toLowerCase())
    : false;
},
```

Apply the same one-row predicate conversion to the other three functions while preserving their existing inclusive comparisons and `row.original.values[columnId]` source. Add the minimal v8 `FilterFns` module augmentation needed for the four existing string keys; it will be removed in Task 3.

- [ ] **Step 4: Convert custom sorting types without changing comparisons**

In `sort.tsx`, replace v7 `IdType` and `Row` with v8 `Row<TData>` and `columnId: string`. Remove the unused descending arguments because v8 applies direction outside the comparator. Continue reading formatted/raw comparison values from `row.original.values[columnId]`; `dateSort` must continue reading its named raw field directly from `row.original`.

- [ ] **Step 5: Convert the shared table instance and markup**

In `Table.tsx`, make the component generic in one `TData extends Record<string, any>` and use that same type for its columns, data, selection callback, link callback, and collapsed renderer. Do not require `values` at this general boundary; only raw filter/sort helper types require it. Then:

1. Export app-facing `TableRow`, `TableColumnDef`, and row-data aliases so consumers do not import TanStack internals directly.
2. Replace `useTable(..., useFilters, useSortBy)` with `useReactTable` configured with `getCoreRowModel`, `getFilteredRowModel`, `getFacetedRowModel`, and `getSortedRowModel` plus the custom `filterFns` registry.
3. Replace `headerGroups`/`rows` properties with `table.getHeaderGroups()` and `table.getRowModel().rows`.
4. Remove `prepareRow` and every v7 DOM-prop getter.
5. Add explicit stable keys from `headerGroup.id`, `header.id`, `row.id`, and `cell.id`.
6. Render header and cell definitions through `flexRender`.
7. Replace header sort props/state with `column.getToggleSortingHandler()`, `column.getCanSort()`, and `column.getIsSorted()`.
8. Render body cells from `row.getVisibleCells()`.
9. Preserve the existing wrappers, CSS classes, links, display-index selection state, and collapsed branch.

Do not adopt TanStack row selection. Do not replace raw `row.original.values` reads with `row.getValue()` when the accessor contains a rendered React node rather than the raw sortable/filterable value.

- [ ] **Step 6: Convert `TableFilter` to v8 column APIs**

Pass only leaf columns that both `getCanFilter()` and define `column.columnDef.meta?.filter` to `TableFilter`. Accessor columns are filterable by default in TanStack, so `getCanFilter()` alone must never expose an empty menu. Use that same filtered list for menu visibility, active chips, Save lookup, and removal. Replace v7 fields and methods as follows:

```text
column.Header       → string label from column.columnDef.header
column.Filter       → filter renderer in column.columnDef.meta
column.filter       → getCanFilter() plus application filter metadata
column.filterValue  → column.getFilterValue()
column.setFilter()  → column.setFilterValue()
preFilteredRows     → column.getFacetedRowModel().flatRows
```

Retain the unsaved-value object and Save loop. The filter metadata must carry the existing renderer, and each renderer must receive faceted source rows plus the existing pending-state callbacks. Do not apply filter values as users type.

- [ ] **Step 7: Add native faceting regression coverage**

Extend `Table.test.tsx` with a custom filter renderer that exposes the raw values found in its `preFilteredRows`. Commit filters on two other columns, then prove both narrow the renderer's options. Commit a filter on the probed column and prove its own alternatives remain. Render accessor labels that differ from their raw values and assert the exposed options use `row.original.values`. This deliberately locks in native, order-independent faceting instead of v7's insertion-order option source.

- [ ] **Step 8: Convert all consumer column definitions and type imports**

Apply these mappings in every consumer listed in the File Map:

```text
Header:        → header:
accessor:      → accessorKey:
Filter: fn     → meta: { filter: fn }
filter:        → filterFn:
sortType:      → sortingFn:
canSort:       → enableSorting:
sortDescFirst: → sortDescFirst: (unchanged)
```

Replace each direct `Row`/`Column` import from `react-table` with the exported `TableRow`/`TableColumnDef` aliases from the shared `Table` module. Preserve every accessor string, renderer body, raw value lookup, callback, and column order. Remove only `@ts-ignore` comments made obsolete by the new shared types; do not add new suppressions.

- [ ] **Step 9: Use checks to find incomplete mechanical conversions**

```bash
npm run lint
rg -n "from ['\"]react-table['\"]|@types/react-table|\"react-table\"" src package.json package-lock.json || true
rg -n '^\s+(Header|accessor|Filter|filter|sortType|canSort):' src/webpages --glob '*.tsx' || true
```

Expected: lint exits 0 and both searches print no v7 imports or legacy column keys in shared table consumers. Do not rename unrelated object properties outside table column arrays merely to satisfy the second search; inspect every match.

- [ ] **Step 10: Verify behavior, clean install, build, and audit at v8**

```bash
npm ci
npm run lint
npx vitest run src/webpages/dashboard/components/table/Table.test.tsx --passWithNoTests
npm run test:prepush
npm run build
npm ls @tanstack/react-table react react-dom --all
npm audit --json > /tmp/coop-table-v8-audit.json || audit_status=$?
test "${audit_status:-0}" -le 1
node -e "const a=require('/tmp/coop-table-v8-audit.json'); if(a.metadata.vulnerabilities.total > 5) process.exit(1)"
git diff --check
```

Expected: clean install, lint, focused tests, the complete suite, build, and dependency tree pass in that order. The audit JSON parses and findings do not exceed the five-finding baseline. Exactly v8.21.3 is installed from the lockfile, and no `react-table` package remains.

- [ ] **Step 11: Guard generated files and commit the v8 implementation checkpoint**

```bash
git diff --exit-code -- client/src/graphql/generated.ts server/graphql/generated.ts
git add client/package.json client/package-lock.json \
  client/src/webpages/dashboard client/src/webpages/settings/ManageUsers.tsx
git diff --cached --exit-code -- \
  client/src/graphql/generated.ts server/graphql/generated.ts
git commit -m "Migrate client tables to TanStack Table v8

Co-Authored-By: Amp"
```

Expected: one cohesive implementation commit after the test commit; no generated GraphQL file is staged.

---

### Task 3: Migrate the native v8 implementation to native v9

**Files:**

- Create: `client/src/webpages/dashboard/components/table/tableFeatures.ts`
- Modify: `client/package.json`
- Modify: `client/package-lock.json`
- Modify: `client/src/webpages/dashboard/components/table/Table.tsx`
- Modify: `client/src/webpages/dashboard/components/table/TableFilter.tsx`
- Modify: `client/src/webpages/dashboard/components/table/filters.tsx`
- Modify: `client/src/webpages/dashboard/components/table/sort.tsx`
- Modify only where TypeScript requires `sortingFn` renames: consumer files listed in the File Map.
- Test: `client/src/webpages/dashboard/components/table/Table.test.tsx`

**Interfaces:**

- Consumes: the verified native v8 checkpoint and its stable `TableRow`/`TableColumnDef` consumer boundary.
- Produces: an explicit v9 feature object, feature-dependent shared type aliases, native v9 table setup, and a clean React-18-compatible lower branch.

- [ ] **Step 1: Upgrade the package to stable v9 through npm**

```bash
cd client
npm install @tanstack/react-table@9.1.2
npm view @tanstack/react-table@9.1.2 license peerDependencies engines --json
```

Expected: `package.json` records `^9.1.2`; metadata reports MIT, React `>=18`, and Node `>=20`; npm uses no peer bypass.

- [ ] **Step 2: Capture the v9 RED boundary**

```bash
npm run lint 2>&1 | tee /tmp/coop-table-v9-before-migration.log
```

Expected: TypeScript reports the v9 hook, feature, sorting-name, and generic changes. Preserve the output and do not use the legacy export.

- [ ] **Step 3: Create the explicit feature and type module**

Create `tableFeatures.ts` using these runtime imports:

```tsx
import {
  columnFacetingFeature,
  columnFilteringFeature,
  createFacetedRowModel,
  createFilteredRowModel,
  createSortedRowModel,
  metaHelper,
  rowSortingFeature,
  tableFeatures,
} from '@tanstack/react-table';
```

Before defining the feature object, declare a record-shaped `TableData`, a structural `FacetedRow<TData> = { original: TData }`, and filter-renderer props containing only faceted rows plus the existing pending-value and Save callbacks. `TableColumnMeta` may reference those structural props but must not reference `TableFeatures`, `TableRow`, or `TableColumn`; this prevents a self-referential `typeof features` metadata cycle.

Define one static feature object containing, in prerequisite order:

```tsx
export const features = tableFeatures({
  columnFilteringFeature,
  columnFacetingFeature,
  rowSortingFeature,
  filteredRowModel: createFilteredRowModel(),
  facetedRowModel: createFacetedRowModel(),
  sortedRowModel: createSortedRowModel(),
  filterFns: getFilterTypes(),
  columnMeta: metaHelper<TableColumnMeta>(),
});
```

`getFilterTypes()` must return one literal object with the exact `text`, `includes`, `range`, and `dateRange` keys so those names become the inferred filter registry. Do not add a core row-model factory. After defining `features`, export `TableFeatures = typeof features` and aliases with v9's feature-first generic order:

```tsx
export type TableRow<TData extends TableData = TableData> = Row<
  TableFeatures,
  TData
>;
export type TableColumnDef<
  TData extends TableData = TableData,
  TValue = unknown,
> = ColumnDef<TableFeatures, TData, TValue>;
export type TableColumn<
  TData extends TableData = TableData,
  TValue = unknown,
> = Column<TableFeatures, TData, TValue>;
```

Keep filter predicate declarations structurally typed against only the filtering feature, or allow contextual inference when `getFilterTypes()` is registered. The general `TableData` type does not require `values`; the raw filter/sort helpers use a narrower type requiring `values: Record<string, unknown>`.

- [ ] **Step 4: Convert the shared implementation to v9 setup**

In `Table.tsx`, import `features` and the shared aliases, then replace:

```text
useReactTable(...)       → useTable({ features, columns, data })
get*RowModel options     → remove; they now live in features
sortingFn on columns     → sortFn
```

Re-export the same app-facing aliases from `Table.tsx` so consumer import paths remain stable. Keep all v8 markup and `flexRender` behavior. Invoke row, cell, column, and header methods on their instances; do not destructure or pass prototype-backed methods as bare callbacks.

- [ ] **Step 5: Convert filter and sort types to v9 generics**

Remove v8's global `FilterFns` augmentation. Register named filters only in `features.filterFns`, so `filterFn: 'text' | 'includes' | 'range' | 'dateRange'` is inferred from that registry.

Use v9's signatures:

```tsx
FilterFn<TFeatures, TData>;
SortFn<TFeatures, TData>;
Row<TFeatures, TData>;
Column<TFeatures, TData, TValue>;
```

Rename every column `sortingFn` to `sortFn`. Keep custom sort functions passed directly in column definitions; no sort registry is needed. Continue using `column.getFacetedRowModel().flatRows` for select options.

- [ ] **Step 6: Prove no compatibility API or stale syntax remains**

```bash
npm run lint
rg -n "useReactTable|useLegacyTable|stockFeatures|sortingFn|from ['\"]react-table['\"]|@types/react-table|\"react-table\"" src package.json package-lock.json || true
rg -n "getState\(\)|onStateChange" src/webpages/dashboard/components/table || true
```

Expected: lint exits 0; searches print no stale package, hook, compatibility API, v8 sorting key, or removed v9 state API. Inspect any string matches before changing them.

- [ ] **Step 7: Verify the complete v9 lower branch**

```bash
npm ci
npm run lint
npx vitest run src/webpages/dashboard/components/table/Table.test.tsx --passWithNoTests
npm run test:prepush
npm run build
npm ls @tanstack/react-table @tanstack/table-core @tanstack/react-store react react-dom --all
npm audit --json > /tmp/coop-table-v9-audit.json || audit_status=$?
test "${audit_status:-0}" -le 1
node -e "const a=require('/tmp/coop-table-v9-audit.json'); if(a.metadata.vulnerabilities.total > 5) process.exit(1)"
git diff --check
git diff --exit-code -- client/src/graphql/generated.ts server/graphql/generated.ts
```

Expected: clean install, lint, focused and complete tests, build, and dependency tree pass in that order; one v9.1.2 table installation is present; React remains 18.2.0; the audit JSON parses and does not exceed baseline; generated-file diff is empty.

- [ ] **Step 8: Guard generated files and commit the final table implementation**

```bash
git add client/package.json client/package-lock.json \
  client/src/webpages/dashboard client/src/webpages/settings/ManageUsers.tsx
git diff --cached --exit-code -- \
  client/src/graphql/generated.ts server/graphql/generated.ts
git commit -m "Upgrade TanStack Table to v9

Co-Authored-By: Amp"
```

Expected: the branch history retains separate characterization, v8, and v9 commits while its total diff targets only v9.

---

### Task 4: Restack and reverify the React 19 upgrade

**Files:**

- Modify as conflicts require: `client/package.json`
- Regenerate: `client/package-lock.json`
- Modify: `docs/superpowers/specs/2026-08-10-react-19-upgrade-design.md`
- Modify: `docs/superpowers/plans/2026-08-10-react-19-upgrade.md`

**Interfaces:**

- Consumes: the independently reviewed `upgrade/tanstack-table-v9` branch and the complete existing React 19 range `main..b4413a2a`.
- Produces: a local `gh stack` chain `main ← upgrade/tanstack-table-v9 ← upgrade/react-19` whose top installs React 19 and TanStack Table v9 without peer exceptions.

- [ ] **Step 1: Confirm both branches and preserve the pre-restack head**

```bash
git status --short --branch
test "$(git rev-parse upgrade/react-19)" = \
  b4413a2a2be1872014f6eb07a8749406d3a27e39
test "$(git merge-base upgrade/tanstack-table-v9 upgrade/react-19)" = \
  "$(git rev-parse main)"
git branch backup/react-19-before-tanstack upgrade/react-19
git show-ref --verify refs/heads/upgrade/tanstack-table-v9
git show-ref --verify refs/heads/upgrade/react-19
```

Expected: the table branch is clean; both branches exist; the local backup branch points to the original React head. The backup is a safety reference, not a new stack layer.

- [ ] **Step 2: Register the two existing branches as one non-interactive stack**

Run from the clean table branch:

```bash
gh stack unstack --local
gh stack init --base main upgrade/tanstack-table-v9 upgrade/react-19
gh stack view --json
gh stack rebase --no-trunk
```

Expected: `gh stack` checks out `upgrade/react-19` and rebases it above the table branch. If it exits 3, continue with Step 3. Do not push or submit.

- [ ] **Step 3: Resolve rebase conflicts without hand-merging the lockfile**

For source or `package.json` conflicts, inspect the current patch and preserve both the v9 dependency and the React commit's intended changes:

```bash
git rebase --show-current-patch
git status --short
```

For every `client/package-lock.json` conflict, inspect stages 2 and 3, select one complete side with `git checkout --ours` or `git checkout --theirs`, stage it, and continue. Prefer the side representing the React commit being replayed so the prior reviewed React resolutions survive; verify the side rather than relying on rebase terminology. Never edit conflict hunks inside the lockfile.

```bash
git add --update
test -z "$(git diff --name-only --diff-filter=U)"
gh stack rebase --continue
```

Repeat until complete. After the final commit is replayed, run from `client`:

```bash
npm install
```

Expected: npm regenerates one consistent final lock from a `package.json` containing React 19.2.8, React DOM 19.2.8, and `@tanstack/react-table` `^9.1.2`, with no `react-table` or `@types/react-table` entries.

If conflict resolution cannot preserve both branch intents, run `gh stack rebase --abort` to restore the pre-rebase branches and report BLOCKED rather than improvising a new migration.

- [ ] **Step 4: Compare the replayed React range before adding integration changes**

```bash
git range-diff \
  main...backup/react-19-before-tanstack \
  upgrade/tanstack-table-v9...upgrade/react-19
```

Expected: every original React commit has a replayed counterpart. Differences are limited to conflict resolutions required to retain TanStack Table v9 and remove the obsolete v7 package. Investigate any dropped commit or unrelated source change before proceeding.

- [ ] **Step 5: Update React migration documentation for the new prerequisite**

In the React design and plan:

- replace the `react-table` peer exception with a statement that the supported TanStack Table v9 migration is the lower stack layer;
- remove expectations that npm warns or `npm ls` fails for `react-table`;
- require ordinary `npm ci` and a valid TanStack/React tree; and
- preserve all already-executed React 18.3, compatibility dependency, codemod, source-fix, and verification requirements.

Commit only the integration lockfile/document changes that remain after the rebase:

```bash
git add client/package.json client/package-lock.json \
  docs/superpowers/specs/2026-08-10-react-19-upgrade-design.md \
  docs/superpowers/plans/2026-08-10-react-19-upgrade.md
git commit -m "Stack React 19 on TanStack Table v9

Co-Authored-By: Amp"
```

- [ ] **Step 6: Verify the combined React 19 top branch**

Run from `client`:

```bash
npm ci
npm ls react react-dom @types/react @types/react-dom @tanstack/react-table @tanstack/table-core @tanstack/react-store --all
npm run lint
npm run test:prepush 2>&1 | tee /tmp/coop-react-19-tanstack-v9-tests.log
! rg 'ReactDOM\.render is no longer supported|outdated JSX transform' /tmp/coop-react-19-tanstack-v9-tests.log
npm run build
npm audit --json > /tmp/coop-react-19-tanstack-v9-audit.json || audit_status=$?
test "${audit_status:-0}" -le 1
node -e "const a=require('/tmp/coop-react-19-tanstack-v9-audit.json'); if(a.metadata.vulnerabilities.total > 5) process.exit(1)"
```

Expected: clean install and dependency tree pass with one React 19.2.8 and one TanStack Table 9.1.2; lint, all tests, and build pass; prohibited React migration warnings are absent; audit does not exceed two moderate and three high findings.

- [ ] **Step 7: Verify repository and stack integrity**

Run from the worktree root:

```bash
git diff --check main...upgrade/tanstack-table-v9
git diff --check upgrade/tanstack-table-v9...upgrade/react-19
git diff main...upgrade/react-19 -- client/src/graphql/generated.ts server/graphql/generated.ts
gh stack view --json
git status --short --branch
```

Expected: diff checks pass; generated-file diff is empty; JSON shows `main ← upgrade/tanstack-table-v9 ← upgrade/react-19` with no branch needing rebase; the worktree is clean. Do not run `gh stack push` or `gh stack submit`.

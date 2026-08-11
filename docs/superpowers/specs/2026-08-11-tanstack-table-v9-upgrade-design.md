# TanStack Table V9 Upgrade Design

## Goal

Replace the Coop client's unsupported `react-table` v7 dependency with the
latest stable `@tanstack/react-table` v9 release while preserving existing
table behavior under React 18. This removes the final peer-dependency blocker
before the React 19 upgrade is stacked on top.

The migration follows both the
[v7-to-v8 guide](https://tanstack.com/table/v8/docs/guide/migrating) and the
[v8-to-v9 React guide](https://tanstack.com/table/latest/docs/framework/react/guide/migrating).
The target is `@tanstack/react-table` 9.1.2, the npm `latest` release when this
design was written.

## Branch and Commit Structure

The table migration will be one reviewable branch, `upgrade/tanstack-table-v9`,
based on `main`. It will retain two implementation checkpoints:

1. Migrate `react-table` v7 to the native TanStack Table v8 API and verify it.
2. Migrate that implementation from v8 to the native v9 API and verify it.

The v8 checkpoint is an internal commit, not a separate pull request. The
existing `upgrade/react-19` branch will be rebased onto the completed table
branch and registered above it with `gh stack`, producing this review stack:

```text
main
└── upgrade/tanstack-table-v9
    └── upgrade/react-19
```

No branch or pull request will expose v8 as the intended final dependency.

## Scope

The table branch is limited to the `client` package and migration
documentation. It will:

- Add focused regression tests for the shared table before changing its
  implementation.
- Remove `react-table` and its separate `@types/react-table` package.
- Install `@tanstack/react-table` 8.21.3 for the first implementation
  checkpoint, then upgrade it to 9.1.2.
- Migrate the shared table renderer, filter menu, custom filters, custom sort
  functions, column definitions, and all exported table types.
- Preserve existing row rendering, sorting, filtering, links, local row
  selection, and collapsed-table behavior.
- Regenerate `client/package-lock.json` only through npm.

The branch will not redesign tables, add pagination, adopt TanStack's row
selection feature, add new v9 table features, or refactor unrelated dashboard
components.

## Existing Application Contract

`client/src/webpages/dashboard/components/table/Table.tsx` is a shared,
headless table wrapper used by 26 call sites. It currently enables v7's filter
and sort plugins and owns the following application behavior:

- Headers toggle sorting and display ascending, descending, or unsorted icons.
- A filter menu keeps values pending until Save, displays committed filters as
  removable chips, and derives select options from rows before the column's own
  filter is applied.
- Custom filters implement case-insensitive text matching, overlapping list
  matching, inclusive numeric ranges, and inclusive date ranges.
- Custom sort functions cover strings, formatted integers, booleans, enum
  precedence, and unformatted dates from the original row.
- `rowLinkTo` wraps cell contents in React Router links.
- `onSelectRow` highlights the selected display row and reports its TanStack
  row object.
- Collapsed mode renders one application-supplied cell per row instead of the
  normal visible cells.

The migration will preserve these contracts rather than replace them with new
TanStack features.

## V7 to V8 Checkpoint

The first implementation checkpoint will use the native v8 API:

- `useTable` becomes `useReactTable`.
- `Column` becomes `ColumnDef`, and column definitions use `header`,
  `accessorKey`, `cell`, `filterFn`, `sortingFn`, and `enableSorting`.
- Plugin hooks become explicit core, filtered, faceted, and sorted row models.
- V7 row-array filter functions become v8 row predicates.
- V7 render and DOM-prop helpers become explicit keys, handlers, and
  `flexRender` calls.
- `prepareRow` is removed, and body rows/cells come from the current row model.
- Application filter-renderer metadata is typed and retained on column
  definitions.

Faceting is included because the filter menu needs the equivalent of v7's
per-column `preFilteredRows` when deriving selectable values.

## V8 to V9 Checkpoint

The second checkpoint will use v9's native API, not the deprecated
`useLegacyTable` compatibility hook:

- `useReactTable` becomes `useTable`.
- Filtering, column faceting, sorting, their row-model factories, and custom
  filter function registrations move into an explicit `tableFeatures` object.
- The core row model remains implicit, as required by v9.
- `sortingFn` becomes `sortFn`.
- Shared types receive the v9 feature generic derived from the feature object.
- Application column metadata uses v9's per-table metadata typing rather than
  adding global type declarations.
- Row, cell, column, and header methods remain invoked on their owning objects
  so prototype-backed v9 methods retain their `this` context.

The implementation will use v9's default full-state subscription. It will not
adopt atoms, `table.Subscribe`, `createTableHook`, `stockFeatures`, or optional
rendering helpers because those changes are not needed to preserve behavior.

## Testing Strategy

Before changing dependencies, focused tests will exercise the shared wrapper's
observable behavior under v7:

- render headers and cells;
- sort a column in both directions;
- stage, save, display, and remove a filter;
- render row links and invoke row selection;
- render collapsed rows; and
- preserve custom filter and sorting function semantics where component tests
  do not directly cover them.

The same focused tests must pass at the v8 and v9 checkpoints. Each checkpoint
must also pass the complete client test suite, lint/type checks, and production
build. The final v9 state must pass a clean `npm ci` and `npm ls` without an
invalid React peer.

## Dependency and Security Controls

`@tanstack/react-table` 9.1.2 is MIT-licensed, requires Node 20 or newer, and
declares React 18 or newer as its peer. Those constraints are compatible with
Coop's Apache-2.0 license, Node 24 runtime, React 18 migration base, and React 19
stack target.

The npm audit result will be compared at each dependency checkpoint. The
migration must not add a known vulnerability or use `--force`,
`--legacy-peer-deps`, a package override, a hand-edited lockfile, or a
deprecated compatibility API to conceal an incompatibility.

## React 19 Restacking

After the v9 branch passes its own review, `upgrade/react-19` will be restacked
above it with the non-interactive `gh stack` workflow. The React branch's
documentation will be updated to treat TanStack Table v9 as a prerequisite and
remove the obsolete `react-table` exception.

Any lockfile conflict will be resolved by selecting one complete lockfile side
and running `npm install` from the final merged `package.json`; lockfile conflict
markers will never be hand-merged. The combined top branch must then pass clean
install, dependency-tree, lint, test, build, audit, generated-file, and diff
checks before it is considered complete.

No branches or pull requests will be pushed without explicit user approval.

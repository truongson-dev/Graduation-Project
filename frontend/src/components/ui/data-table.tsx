import * as React from 'react';
import {
  columnFacetingFeature,
  columnFilteringFeature,
  columnVisibilityFeature,
  createColumnHelper,
  createFacetedRowModel,
  createFacetedUniqueValues,
  createFilteredRowModel,
  createPaginatedRowModel,
  createSortedRowModel,
  filterFn_arrHas,
  filterFn_includesString,
  globalFilteringFeature,
  rowPaginationFeature,
  rowSelectionFeature,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_text,
  tableFeatures,
  useTable,
  type Column,
  type ColumnDef,
  type ColumnFiltersState,
  type ColumnVisibilityState,
  type RowData,
  type RowSelectionState,
  type SortingState,
} from '@tanstack/react-table';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/core/utils/cn';
import {
  ArrowDown,
  ArrowUp,
  ChevronsUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  SlidersHorizontal,
  PlusCircle,
  X,
  Search,
} from 'lucide-react';

export const dataTableFeatures = tableFeatures({
  columnFilteringFeature,
  columnVisibilityFeature,
  columnFacetingFeature,
  globalFilteringFeature,
  rowPaginationFeature,
  rowSelectionFeature,
  rowSortingFeature,
  filteredRowModel: createFilteredRowModel(),
  paginatedRowModel: createPaginatedRowModel(),
  sortedRowModel: createSortedRowModel(),
  facetedRowModel: createFacetedRowModel(),
  facetedUniqueValues: createFacetedUniqueValues(),
  filterFns: {
    includesString: filterFn_includesString,
    arrHas: filterFn_arrHas,
  },
  sortFns: {
    alphanumeric: sortFn_alphanumeric,
    text: sortFn_text,
  },
});

export type DataTableFeatures = typeof dataTableFeatures;

export function createDataTableColumnHelper<TData extends RowData>() {
  return createColumnHelper<DataTableFeatures, TData>();
}

/* -------------------------------------------------------------------------------------------------
 * DataTableColumnHeader: Sortable Header Component
 * -----------------------------------------------------------------------------------------------*/
export interface DataTableColumnHeaderProps
  extends React.HTMLAttributes<HTMLDivElement> {
  column: any;
  title: string;
  icon?: React.ComponentType<{ className?: string }>;
}

export function DataTableColumnHeader({
  column,
  title,
  icon: HeaderIcon,
  className,
}: DataTableColumnHeaderProps) {
  const isCentered = className?.includes('justify-center');

  if (!column.getCanSort()) {
    return (
      <div className={cn('inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider', className)}>
        {HeaderIcon && <HeaderIcon className="size-3.5 text-slate-400 shrink-0" />}
        <span>{title}</span>
      </div>
    );
  }

  const isSorted = column.getIsSorted();

  return (
    <div className={cn('flex items-center space-x-2', className)}>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => column.toggleSorting(isSorted === 'asc')}
        className={cn(
          'h-8 data-[state=open]:bg-accent text-xs font-semibold uppercase tracking-wider text-slate-500 hover:text-slate-800 cursor-pointer inline-flex items-center gap-1.5',
          isCentered ? 'mx-auto' : '-ml-3'
        )}
      >
        {HeaderIcon && <HeaderIcon className="size-3.5 text-slate-400 shrink-0" />}
        <span>{title}</span>
        {isSorted === 'desc' ? (
          <ArrowDown className="size-3.5 text-blue-600 shrink-0" />
        ) : isSorted === 'asc' ? (
          <ArrowUp className="size-3.5 text-blue-600 shrink-0" />
        ) : (
          <ChevronsUpDown className="size-3.5 text-slate-400 shrink-0" />
        )}
      </Button>
    </div>
  );
}

/* -------------------------------------------------------------------------------------------------
 * DataTableViewOptions: Column Visibility Toggle Dropdown
 * -----------------------------------------------------------------------------------------------*/
export interface DataTableViewOptionsProps {
  table: any;
}

export function DataTableViewOptions({ table }: DataTableViewOptionsProps) {
  const columns = table
    .getAllColumns()
    .filter((column: any) => typeof column.accessorFn !== 'undefined' && column.getCanHide());

  if (columns.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 shadow-2xs hover:bg-slate-50 cursor-pointer"
          >
            <SlidersHorizontal className="size-3.5 text-slate-500" />
            <span>Hiển thị</span>
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-44 bg-white p-1 shadow-md border border-slate-200 rounded-xl">
        <DropdownMenuLabel className="px-2 py-1.5 text-xs font-semibold text-slate-500">
          Tùy chọn cột
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="my-1 border-t border-slate-100" />
        {columns.map((column: any) => {
          const title =
            column.columnDef?.meta?.title ||
            (typeof column.columnDef.header === 'string' ? column.columnDef.header : column.id);
          return (
            <DropdownMenuCheckboxItem
              key={column.id}
              className="text-xs capitalize py-1.5 px-2 rounded-lg cursor-pointer"
              checked={column.getIsVisible()}
              onCheckedChange={(value) => column.toggleVisibility(!!value)}
            >
              {title}
            </DropdownMenuCheckboxItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* -------------------------------------------------------------------------------------------------
 * DataTableFacetedFilter: Popover Multi-select Filter
 * -----------------------------------------------------------------------------------------------*/
export interface FacetedFilterOption {
  label: string;
  value: string;
  icon?: React.ComponentType<{ className?: string }>;
}

export interface DataTableFacetedFilterProps {
  column?: any;
  title?: string;
  options: FacetedFilterOption[];
}

export function DataTableFacetedFilter({
  column,
  title,
  options,
}: DataTableFacetedFilterProps) {
  const facets = column?.getFacetedUniqueValues();
  const selectedValues = new Set(column?.getFilterValue() as string[]);

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className="h-8 border-dashed border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 shadow-2xs hover:bg-slate-50 cursor-pointer"
          >
            <PlusCircle className="size-3.5 text-slate-500" />
            <span>{title}</span>
            {selectedValues?.size > 0 && (
              <>
                <span className="mx-1 h-3.5 w-px bg-slate-200" />
                <Badge
                  variant="secondary"
                  className="rounded-sm px-1.5 py-0 text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 tabular-nums"
                >
                  {selectedValues.size} đã chọn
                </Badge>
              </>
            )}
          </Button>
        }
      />
      <PopoverContent className="w-56 p-1.5 rounded-xl border border-slate-200 bg-white shadow-lg" align="start">
        <div className="space-y-1">
          {options.map((option) => {
            const isSelected = selectedValues.has(option.value);
            const count = facets?.get ? facets.get(option.value) : undefined;
            return (
              <button
                type="button"
                key={option.value}
                onClick={() => {
                  if (isSelected) {
                    selectedValues.delete(option.value);
                  } else {
                    selectedValues.add(option.value);
                  }
                  const filterValues = Array.from(selectedValues);
                  column?.setFilterValue(filterValues.length ? filterValues : undefined);
                }}
                className={cn(
                  'flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-left cursor-pointer transition-colors',
                  isSelected ? 'bg-blue-50 text-blue-900 font-semibold' : 'text-slate-700 hover:bg-slate-100'
                )}
              >
                <div
                  className={cn(
                    'flex size-4 items-center justify-center rounded-[4px] border',
                    isSelected
                      ? 'border-blue-600 bg-blue-600 text-white'
                      : 'border-slate-300 bg-white'
                  )}
                >
                  {isSelected && <span className="size-2 rounded-xs bg-white" />}
                </div>
                {option.icon && (
                  <option.icon className="size-3.5 text-slate-400 shrink-0" />
                )}
                <span className="flex-1 truncate">{option.label}</span>
                {typeof count === 'number' && (
                  <span className="ml-auto font-mono text-[11px] text-slate-400 tabular-nums">
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {selectedValues.size > 0 && (
          <div className="mt-1.5 pt-1.5 border-t border-slate-100">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => column?.setFilterValue(undefined)}
              className="w-full justify-center text-xs h-7 text-slate-500 hover:text-slate-800 cursor-pointer"
            >
              Xóa bộ lọc
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

/* -------------------------------------------------------------------------------------------------
 * DataTablePagination: Bottom Controls (matching Image 2)
 * -----------------------------------------------------------------------------------------------*/
export interface DataTablePaginationProps {
  table: any;
  pageSizeOptions?: number[];
  enableRowSelection?: boolean;
}

export function DataTablePagination({
  table,
  pageSizeOptions = [5, 10, 20, 50],
  enableRowSelection = false,
}: DataTablePaginationProps) {
  const selectedCount = table.getFilteredSelectedRowModel().rows.length;
  const totalCount = table.getFilteredRowModel().rows.length;
  const pageIndex = table.state.pagination?.pageIndex ?? 0;
  const pageSize = table.state.pagination?.pageSize ?? 10;
  const pageCount = table.getPageCount() || 1;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-slate-100 bg-slate-50/50 text-xs text-slate-600">
      <div className="text-slate-500">
        {enableRowSelection ? (
          <>
            <strong className="font-semibold text-slate-800">{selectedCount}</strong> trên{' '}
            <strong className="font-semibold text-slate-800">{totalCount}</strong> hàng được chọn.
          </>
        ) : (
          <>
            Tổng số <strong className="font-semibold text-slate-800">{totalCount}</strong> hàng
          </>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-4 sm:gap-6">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-medium">Hàng mỗi trang</span>
          <select
            value={pageSize}
            onChange={(e) => table.setPageSize(Number(e.target.value))}
            className="h-8 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 shadow-2xs outline-none focus:border-blue-600"
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>

        <div className="font-medium text-slate-700">
          Trang <strong className="font-semibold text-slate-900">{pageIndex + 1}</strong> / {pageCount}
        </div>

        <div className="flex items-center space-x-1">
          <Button
            variant="outline"
            size="icon"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
            title="Trang đầu"
            aria-label="Trang đầu"
            className="size-8 rounded-lg border-slate-200 bg-white p-0 text-slate-600 shadow-2xs hover:bg-slate-50 disabled:opacity-40"
          >
            <ChevronsLeft className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            title="Trang trước"
            aria-label="Trang trước"
            className="size-8 rounded-lg border-slate-200 bg-white p-0 text-slate-600 shadow-2xs hover:bg-slate-50 disabled:opacity-40"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            title="Trang sau"
            aria-label="Trang sau"
            className="size-8 rounded-lg border-slate-200 bg-white p-0 text-slate-600 shadow-2xs hover:bg-slate-50 disabled:opacity-40"
          >
            <ChevronRight className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => table.setPageIndex(pageCount - 1)}
            disabled={!table.getCanNextPage()}
            title="Trang cuối"
            aria-label="Trang cuối"
            className="size-8 rounded-lg border-slate-200 bg-white p-0 text-slate-600 shadow-2xs hover:bg-slate-50 disabled:opacity-40"
          >
            <ChevronsRight className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------------------------------
 * DataTable Master Component
 * -----------------------------------------------------------------------------------------------*/
export interface DataTableProps<TData extends RowData> {
  columns: ColumnDef<DataTableFeatures, TData, any>[];
  data: TData[];
  isLoading?: boolean;
  loadingRowCount?: number;
  emptyState?: React.ReactNode;
  onRowClick?: (row: TData) => void;
  className?: string;
  pageSize?: number;
  pageSizeOptions?: number[];
  searchKey?: string;
  searchPlaceholder?: string;
  facetedFilters?: {
    columnId: string;
    title: string;
    options: FacetedFilterOption[];
  }[];
  header?: React.ReactNode;
  toolbarHeader?: React.ReactNode;
  enableRowSelection?: boolean;
  enableColumnVisibility?: boolean;
  enablePagination?: boolean;
}

export function DataTable<TData extends RowData>({
  columns,
  data,
  isLoading = false,
  loadingRowCount = 4,
  emptyState,
  onRowClick,
  className,
  pageSize = 10,
  pageSizeOptions = [5, 10, 20, 50],
  searchKey,
  searchPlaceholder = 'Tìm kiếm...',
  facetedFilters = [],
  header,
  toolbarHeader,
  enableRowSelection = false,
  enableColumnVisibility = true,
  enablePagination = true,
}: DataTableProps<TData>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<ColumnVisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});
  const [pagination, setPagination] = React.useState({ pageIndex: 0, pageSize });

  // Auto-inject select checkbox column if enableRowSelection is true and not already present
  const allColumns = React.useMemo(() => {
    if (!enableRowSelection) return columns;
    const hasSelection = columns.some((col) => col.id === 'select');
    if (hasSelection) return columns;

    const columnHelper = createDataTableColumnHelper<TData>();
    const selectColumn = columnHelper.display({
      id: 'select',
      header: ({ table }) => (
        <div className="flex items-center justify-center">
          <Checkbox
            checked={table.getIsAllPageRowsSelected()}
            indeterminate={table.getIsSomePageRowsSelected()}
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            aria-label="Chọn tất cả hàng"
          />
        </div>
      ),
      cell: ({ row }) => (
        <div className="flex items-center justify-center">
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Chọn hàng"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
    });

    return [selectColumn, ...columns];
  }, [columns, enableRowSelection]);

  const table = useTable({
    features: dataTableFeatures,
    data,
    columns: allColumns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onPaginationChange: setPagination,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      pagination,
    },
  });

  const isFiltered = (table.state?.columnFilters?.length ?? 0) > 0 || Boolean(searchKey && table.getColumn(searchKey)?.getFilterValue());
  const rows = table.getRowModel().rows;

  return (
    <div className={cn('w-full rounded-2xl border border-slate-200/80 bg-white shadow-xs overflow-hidden', className)}>
      {/* Top Card Header if provided */}
      {header && (
        <div className="p-5 border-b border-slate-100 bg-white">
          {header}
        </div>
      )}

      {/* Table Toolbar matching Image 2 */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 p-4 border-b border-slate-100 bg-white">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          {toolbarHeader}

          {searchKey && (
            <div className="relative w-full max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-slate-400 pointer-events-none" />
              <Input
                placeholder={searchPlaceholder}
                value={(table.getColumn(searchKey)?.getFilterValue() as string) ?? ''}
                onChange={(event) =>
                  table.getColumn(searchKey)?.setFilterValue(event.target.value)
                }
                className="h-8 pl-8 text-xs bg-slate-50/70 border-slate-200 focus-visible:bg-white"
              />
            </div>
          )}

          {facetedFilters.map((filter) => {
            const column = table.getColumn(filter.columnId);
            if (!column) return null;
            return (
              <DataTableFacetedFilter
                key={filter.columnId}
                column={column}
                title={filter.title}
                options={filter.options}
              />
            );
          })}

          {isFiltered && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                table.resetColumnFilters();
                if (searchKey) {
                  table.getColumn(searchKey)?.setFilterValue('');
                }
              }}
              className="h-8 px-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
            >
              Đặt lại
              <X className="ml-1.5 size-3.5" />
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {enableColumnVisibility && <DataTableViewOptions table={table} />}
        </div>
      </div>

      {/* Main Table Container */}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-slate-50/70 border-b border-slate-100">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent">
                {headerGroup.headers.map((headerItem) => (
                  <TableHead key={headerItem.id} className="h-10 px-4 align-middle font-semibold text-xs text-slate-500 tracking-wider uppercase">
                    {headerItem.isPlaceholder ? null : (
                      <table.FlexRender header={headerItem} />
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: loadingRowCount }).map((_, idx) => (
                <TableRow key={`skeleton-${idx}`}>
                  <TableCell colSpan={allColumns.length} className="py-4 px-4">
                    <Skeleton className="h-7 w-full rounded-md" />
                  </TableCell>
                </TableRow>
              ))
            ) : rows?.length ? (
              rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                  onClick={onRowClick ? () => onRowClick(row.original as TData) : undefined}
                  className={cn(
                    'transition-colors border-b border-slate-100 hover:bg-slate-50/80 data-[state=selected]:bg-blue-50/40',
                    onRowClick && 'cursor-pointer'
                  )}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="px-4 py-3.5 align-middle text-sm text-slate-700">
                      <table.FlexRender cell={cell} />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={allColumns.length} className="h-36 text-center text-slate-500">
                  {emptyState ?? 'Không tìm thấy dữ liệu'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Bottom Pagination matching Image 2 */}
      {enablePagination && (
        <DataTablePagination
          table={table}
          pageSizeOptions={pageSizeOptions}
          enableRowSelection={enableRowSelection}
        />
      )}
    </div>
  );
}

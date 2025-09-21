import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { FixedSizeList as List } from 'react-window';
import { clsx } from 'clsx';
import { TableColumn, TableState, VirtualizedTableProps } from '@/types';
import { Button, Card } from '@/components/ui';

// Sub-components
const TableHeader = <T,>({ 
  columns, 
  state, 
  onSort
}: {
  columns: TableColumn<T>[];
  state: TableState;
  onSort: (field: string) => void;
}) => {
  return (
    <div className="flex border-b border-gray-200 bg-gray-50 sticky top-0 z-10">
      {columns
        .filter(col => state.visibleColumns.includes(col.id as string))
        .map((column) => {
          const sortInfo = state.sorts.find(s => s.field === column.id);
          const isFiltered = state.filters.some(f => f.field === column.id);
          
          return (
            <div
              key={column.id as string}
              className={clsx(
                "flex flex-col px-4 py-2 border-r border-gray-200 min-w-0",
                column.sortable && "cursor-pointer hover:bg-gray-100"
              )}
              style={{ width: column.width || 150, minWidth: column.minWidth || 100 }}
              onClick={() => column.sortable && onSort(column.id as string)}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-900 truncate">{column.label}</span>
                <div className="flex items-center space-x-1">
                  {sortInfo && (
                    <span className="text-xs text-blue-600">
                      {sortInfo.direction === 'asc' ? '↑' : '↓'}
                      {sortInfo.priority && sortInfo.priority > 0 && (
                        <span className="ml-1">{sortInfo.priority + 1}</span>
                      )}
                    </span>
                  )}
                  {isFiltered && (
                    <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
    </div>
  );
};

const TableRow = <T,>({ 
  item, 
  columns, 
  state, 
  index, 
  style, 
  onClick, 
  onSelect,
  isSelected 
}: {
  item: T;
  columns: TableColumn<T>[];
  state: TableState;
  index: number;
  style: React.CSSProperties;
  onClick?: (item: T) => void;
  onSelect?: (id: string, selected: boolean) => void;
  isSelected: boolean;
}) => {
  const itemId = (item as any).id || index.toString();
  
  return (
    <div
      style={style}
      className={clsx(
        "flex border-b border-gray-100 hover:bg-gray-50 transition-colors",
        isSelected && "bg-blue-50",
        onClick && "cursor-pointer"
      )}
      onClick={() => onClick?.(item)}
    >
      {onSelect && (
        <div className="flex items-center px-4 py-2 border-r border-gray-200">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => onSelect(itemId, e.target.checked)}
            onClick={(e) => e.stopPropagation()}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
        </div>
      )}
      {columns
        .filter(col => state.visibleColumns.includes(col.id as string))
        .map((column) => {
          const value = (item as any)[column.id];
          const displayValue = column.render ? column.render(value, item) : value;
          
          return (
            <div
              key={column.id as string}
              className="flex items-center px-4 py-2 border-r border-gray-200 min-w-0"
              style={{ width: column.width || 150, minWidth: column.minWidth || 100 }}
            >
              <span className="text-sm text-gray-900 truncate">{displayValue}</span>
            </div>
          );
        })}
    </div>
  );
};

const TableControls = <T,>({
  state,
  onStateChange,
  totalItems,
  onExport,
  bulkActions,
  selectedItems
}: {
  state: TableState;
  onStateChange: (newState: TableState) => void;
  totalItems: number;
  onExport?: (format: 'csv' | 'excel', selectedRows?: T[]) => void;
  bulkActions?: VirtualizedTableProps<T>['bulkActions'];
  selectedItems: T[];
}) => {
  const totalPages = Math.ceil(totalItems / state.pageSize);
  
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
      <div className="flex items-center space-x-4">
        <div className="text-sm text-gray-700">
          Page {state.page + 1} of {totalPages} ({totalItems} total)
        </div>
        <select
          value={state.pageSize}
          onChange={(e) => onStateChange({
            ...state,
            pageSize: parseInt(e.target.value) as any,
            page: 0
          })}
          className="border border-gray-300 rounded px-2 py-1 text-sm"
        >
          <option value={10}>10 per page</option>
          <option value={25}>25 per page</option>
          <option value={50}>50 per page</option>
          <option value={100}>100 per page</option>
        </select>
        {state.selectedRows.length > 0 && (
          <div className="text-sm text-blue-700">
            {state.selectedRows.length} selected
          </div>
        )}
      </div>
      
      <div className="flex items-center space-x-2">
        {selectedItems.length > 0 && bulkActions && (
          <div className="flex items-center space-x-2 mr-4">
            {bulkActions.map((action) => (
              <Button
                key={action.id}
                size="sm"
                variant="secondary"
                disabled={action.disabled?.(selectedItems)}
                onClick={() => action.action(selectedItems)}
              >
                {action.icon && <span className="mr-1">{action.icon}</span>}
                {action.label}
              </Button>
            ))}
          </div>
        )}
        
        {onExport && (
          <div className="flex items-center space-x-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onExport('csv', selectedItems.length > 0 ? selectedItems : undefined)}
            >
              Export CSV
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onExport('excel', selectedItems.length > 0 ? selectedItems : undefined)}
            >
              Export Excel
            </Button>
          </div>
        )}
        
        <div className="flex items-center space-x-1">
          <Button
            size="sm"
            variant="ghost"
            disabled={state.page === 0}
            onClick={() => onStateChange({ ...state, page: 0 })}
          >
            ««
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={state.page === 0}
            onClick={() => onStateChange({ ...state, page: state.page - 1 })}
          >
            ‹
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={state.page >= totalPages - 1}
            onClick={() => onStateChange({ ...state, page: state.page + 1 })}
          >
            ›
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={state.page >= totalPages - 1}
            onClick={() => onStateChange({ ...state, page: totalPages - 1 })}
          >
            »»
          </Button>
        </div>
      </div>
    </div>
  );
};

const EmptyState = ({ message }: { message: string }) => (
  <div className="flex flex-col items-center justify-center py-12 text-gray-500">
    <div className="text-4xl mb-4">📋</div>
    <p className="text-lg">{message}</p>
  </div>
);

const LoadingState = () => (
  <div className="flex items-center justify-center py-12">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    <span className="ml-3 text-gray-600">Loading...</span>
  </div>
);

export function VirtualizedTable<T>({
  data,
  columns,
  loading = false,
  error,
  emptyMessage = "No data available",
  onStateChange,
  onRowClick,
  onRowSelect,
  onExport,
  bulkActions,
  rowHeight = 56,
  overscan = 5
}: VirtualizedTableProps<T>) {
  const [state, setState] = useState<TableState>({
    page: 0,
    pageSize: 25,
    filters: [],
    sorts: [],
    selectedRows: [],
    visibleColumns: columns.map(col => col.id as string),
    searchTerm: ''
  });

  const listRef = useRef<List>(null);

  // Notify parent of state changes
  useEffect(() => {
    onStateChange?.(state);
  }, [state, onStateChange]);

  // Data processing with filters, sorts, and pagination
  const processedData = useMemo(() => {
    let filtered = [...data];

    // Apply filters
    state.filters.forEach(filter => {
      filtered = filtered.filter(item => {
        const value = (item as any)[filter.field];
        switch (filter.operator) {
          case 'eq': return value === filter.value;
          case 'neq': return value !== filter.value;
          case 'contains': return String(value).toLowerCase().includes(String(filter.value).toLowerCase());
          case 'startsWith': return String(value).toLowerCase().startsWith(String(filter.value).toLowerCase());
          case 'endsWith': return String(value).toLowerCase().endsWith(String(filter.value).toLowerCase());
          case 'gt': return Number(value) > Number(filter.value);
          case 'gte': return Number(value) >= Number(filter.value);
          case 'lt': return Number(value) < Number(filter.value);
          case 'lte': return Number(value) <= Number(filter.value);
          case 'in': return Array.isArray(filter.value) && filter.value.includes(value);
          case 'between': 
            return Array.isArray(filter.value) && 
                   Number(value) >= Number(filter.value[0]) && 
                   Number(value) <= Number(filter.value[1]);
          default: return true;
        }
      });
    });

    // Apply search
    if (state.searchTerm) {
      const searchLower = state.searchTerm.toLowerCase();
      filtered = filtered.filter(item =>
        Object.values(item as any).some(value =>
          String(value).toLowerCase().includes(searchLower)
        )
      );
    }

    // Apply sorts
    if (state.sorts.length > 0) {
      filtered.sort((a, b) => {
        for (const sort of state.sorts.sort((x, y) => (x.priority || 0) - (y.priority || 0))) {
          const aVal = (a as any)[sort.field];
          const bVal = (b as any)[sort.field];
          const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
          if (comparison !== 0) {
            return sort.direction === 'asc' ? comparison : -comparison;
          }
        }
        return 0;
      });
    }

    return filtered;
  }, [data, state.filters, state.sorts, state.searchTerm]);

  // Paginated data
  const paginatedData = useMemo(() => {
    const startIndex = state.page * state.pageSize;
    return processedData.slice(startIndex, startIndex + state.pageSize);
  }, [processedData, state.page, state.pageSize]);

  // Selected items
  const selectedItems = useMemo(() => {
    return data.filter(item => state.selectedRows.includes((item as any).id || ''));
  }, [data, state.selectedRows]);

  // Event handlers
  const handleSort = useCallback((field: string) => {
    setState(prev => {
      const existingSort = prev.sorts.find(s => s.field === field);
      let newSorts;
      
      if (existingSort) {
        if (existingSort.direction === 'asc') {
          // Change to desc
          newSorts = prev.sorts.map(s => 
            s.field === field ? { ...s, direction: 'desc' as const } : s
          );
        } else {
          // Remove sort
          newSorts = prev.sorts.filter(s => s.field !== field);
        }
      } else {
        // Add new sort
        newSorts = [...prev.sorts, { field, direction: 'asc' as const, priority: prev.sorts.length }];
      }
      
      return { ...prev, sorts: newSorts, page: 0 };
    });
  }, []);

  const handleRowSelect = useCallback((id: string, selected: boolean) => {
    setState(prev => ({
      ...prev,
      selectedRows: selected 
        ? [...prev.selectedRows, id]
        : prev.selectedRows.filter(rid => rid !== id)
    }));
  }, []);

  // Row renderer for react-window
  const Row = useCallback(({ index, style }: { index: number; style: React.CSSProperties }) => {
    const item = paginatedData[index];
    const itemId = (item as any).id || index.toString();
    const isSelected = state.selectedRows.includes(itemId);

    return (
      <TableRow
        item={item}
        columns={columns}
        state={state}
        index={index}
        style={style}
        onClick={onRowClick}
        onSelect={onRowSelect ? handleRowSelect : undefined}
        isSelected={isSelected}
      />
    );
  }, [paginatedData, columns, state, onRowClick, onRowSelect, handleRowSelect]);

  if (loading) {
    return (
      <Card>
        <LoadingState />
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <div className="flex flex-col items-center justify-center py-12 text-red-500">
          <div className="text-4xl mb-4">⚠️</div>
          <p className="text-lg">{error}</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col h-full">
      <TableHeader
        columns={columns}
        state={state}
        onSort={handleSort}
      />
      
      {paginatedData.length === 0 ? (
        <EmptyState message={emptyMessage} />
      ) : (
        <div className="flex-1">
          <List
            ref={listRef}
            height={400} // Fixed height for virtualization
            width="100%" // Add required width property
            itemCount={paginatedData.length}
            itemSize={rowHeight}
            overscanCount={overscan}
            className="w-full"
          >
            {Row}
          </List>
        </div>
      )}
      
      <TableControls
        state={state}
        onStateChange={setState}
        totalItems={processedData.length}
        onExport={onExport}
        bulkActions={bulkActions}
        selectedItems={selectedItems}
      />
    </Card>
  );
}

export default VirtualizedTable;
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { DataTable, createDataTableColumnHelper } from './data-table';

afterEach(() => {
  cleanup();
});

type TestUser = {
  id: string;
  name: string;
  role: string;
};

const testData: TestUser[] = [
  { id: '1', name: 'Nguyen Van A', role: 'Student' },
  { id: '2', name: 'Tran Thi B', role: 'Teacher' },
];

describe('DataTable Reusable Component', () => {
  const columnHelper = createDataTableColumnHelper<TestUser>();
  const columns = columnHelper.columns([
    columnHelper.accessor('name', {
      header: 'Họ và tên',
      cell: ({ getValue }) => <span>{getValue() as string}</span>,
    }),
    columnHelper.accessor('role', {
      header: 'Vai trò',
      cell: ({ getValue }) => <span>{getValue() as string}</span>,
    }),
  ]);

  it('renders table headers and data rows correctly', () => {
    render(<DataTable columns={columns} data={testData} />);

    expect(screen.getByText('Họ và tên')).toBeTruthy();
    expect(screen.getByText('Vai trò')).toBeTruthy();
    expect(screen.getByText('Nguyen Van A')).toBeTruthy();
    expect(screen.getByText('Student')).toBeTruthy();
    expect(screen.getByText('Tran Thi B')).toBeTruthy();
    expect(screen.getByText('Teacher')).toBeTruthy();
  });

  it('renders custom emptyState when data is empty', () => {
    render(<DataTable columns={columns} data={[]} emptyState="Không có bản ghi nào" />);

    expect(screen.getByText('Không có bản ghi nào')).toBeTruthy();
  });

  it('renders loading skeletons when isLoading is true', () => {
    const { container } = render(<DataTable columns={columns} data={[]} isLoading={true} loadingRowCount={4} />);

    // Table rows with skeleton cells
    const skeletonCells = container.querySelectorAll('tbody td');
    expect(skeletonCells.length).toBe(4);
  });

  it('triggers onRowClick when a data row is clicked', () => {
    const handleRowClick = vi.fn();
    render(<DataTable columns={columns} data={testData} onRowClick={handleRowClick} />);

    const row = screen.getByText('Nguyen Van A');
    fireEvent.click(row);

    expect(handleRowClick).toHaveBeenCalledTimes(1);
    expect(handleRowClick).toHaveBeenCalledWith(testData[0]);
  });

  it('renders pagination controls and navigates between pages when pageSize is exceeded', () => {
    const largeData: TestUser[] = Array.from({ length: 15 }, (_, i) => ({
      id: `${i + 1}`,
      name: `User ${i + 1}`,
      role: 'Member',
    }));

    render(<DataTable columns={columns} data={largeData} pageSize={5} />);

    // Page 1 shows first 5
    expect(screen.getByText('User 1')).toBeTruthy();
    expect(screen.getByText('User 5')).toBeTruthy();
    expect(screen.queryByText('User 6')).toBeNull();

    // Click Next
    const nextButton = screen.getByRole('button', { name: /sau/i });
    fireEvent.click(nextButton);

    // Page 2 shows items 6 to 10
    expect(screen.getByText('User 6')).toBeTruthy();
    expect(screen.getByText('User 10')).toBeTruthy();
    expect(screen.queryByText('User 1')).toBeNull();
  });

  it('supports row selection checkboxes and displays selected row count', () => {
    render(<DataTable columns={columns} data={testData} enableRowSelection={true} />);

    // Initially 0 selected
    expect(
      screen.getByText((_, el) => el?.textContent?.trim() === '0 trên 2 hàng được chọn.')
    ).toBeTruthy();

    // Click select all checkbox in header
    const selectAllCheckbox = screen.getByRole('checkbox', { name: /Chọn tất cả hàng/i });
    fireEvent.click(selectAllCheckbox);

    // Should now report 2 rows selected
    expect(
      screen.getByText((_, el) => el?.textContent?.trim() === '2 trên 2 hàng được chọn.')
    ).toBeTruthy();
  });

  it('supports search input filtering and reset button', () => {
    render(
      <DataTable
        columns={columns}
        data={testData}
        searchKey="name"
        searchPlaceholder="Tìm theo tên..."
      />
    );

    const searchInput = screen.getByPlaceholderText('Tìm theo tên...');
    expect(searchInput).toBeTruthy();

    // Type Nguyen into search
    fireEvent.change(searchInput, { target: { value: 'Nguyen' } });

    // Should filter to Nguyen Van A only
    expect(screen.getByText('Nguyen Van A')).toBeTruthy();
    expect(screen.queryByText('Tran Thi B')).toBeNull();

    // Reset button should appear
    const resetButton = screen.getByRole('button', { name: /Đặt lại/i });
    expect(resetButton).toBeTruthy();

    // Click Reset
    fireEvent.click(resetButton);

    // Both should be visible again
    expect(screen.getByText('Nguyen Van A')).toBeTruthy();
    expect(screen.getByText('Tran Thi B')).toBeTruthy();
  });

  it('allows changing rows per page through pageSize selector', () => {
    const largeData: TestUser[] = Array.from({ length: 15 }, (_, i) => ({
      id: `${i + 1}`,
      name: `User ${i + 1}`,
      role: 'Member',
    }));

    render(
      <DataTable
        columns={columns}
        data={largeData}
        pageSize={5}
        pageSizeOptions={[5, 10, 20]}
      />
    );

    // Initially 5 rows visible
    expect(screen.queryByText('User 6')).toBeNull();

    // Change page size to 10
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: '10' } });

    // Now 10 rows visible
    expect(screen.getByText('User 6')).toBeTruthy();
    expect(screen.getByText('User 10')).toBeTruthy();
    expect(screen.queryByText('User 11')).toBeNull();
  });
});

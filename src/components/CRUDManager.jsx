import { useState, useEffect, useCallback } from 'react';
import Button from './Button';
import Table from './Table';
import Search from './Search';
import Filters from './Filters';
import Pagination from './Pagination';
import Modal from './Modal';
import Alert from './Alert';
import I from '../icon';
import PROVIDER from '../data-provider';

export default function CRUDManager({
  resource,
  columns,
  filterConfig = [],
  pageSizeOptions = [10, 20, 50, 100],
  title = '',
  showSearch = true,
  showFilters = false,
  searchPlaceholder = 'Search...',
  emptyText = 'No data found',
  createLabel = 'Create',
  onBeforeCreate,
  onCreate,
  onBeforeEdit,
  onEdit,
  onDelete,
  renderForm,
  formTitle = '',
  formSize = 'md',
  rowKey = 'id',
  defaultSortBy = 'createdAt',
  defaultSortDir = 'desc',
  canCreate = true,
  canEdit = true,
  canDelete = true,
}) {
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(pageSizeOptions[1] || 20);
  const [totalPages, setTotalPages] = useState(1);
  const [sortBy, setSortBy] = useState(defaultSortBy);
  const [sortDir, setSortDir] = useState(defaultSortDir);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query = { page, pageSize, sortBy, sortDir };
      if (search) query.search = search;
      if (Object.keys(filters).length > 0) query.filters = filters;
      const result = await PROVIDER.findMany(resource, query);
      setData(result.data);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [resource, page, pageSize, sortBy, sortDir, search, filters]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSort = (key) => {
    if (sortBy === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(key);
      setSortDir('asc');
    }
    setPage(1);
  };

  const handleSearch = (value) => {
    setSearch(value);
    setPage(1);
  };

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    setPage(1);
  };

  const handleClearFilters = () => {
    setFilters({});
    setPage(1);
  };

  const openCreate = () => {
    setEditingItem(null);
    setModalOpen(true);
  };

  const openEdit = (item) => {
    setEditingItem(item);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingItem(null);
  };

  const handleSubmit = async (formData) => {
    try {
      if (editingItem) {
        if (onBeforeEdit) { const r = onBeforeEdit(formData, editingItem); if (r === false) return; }
        await PROVIDER.update(resource, editingItem[rowKey], formData);
        onEdit?.(formData, editingItem);
      } else {
        if (onBeforeCreate) { const r = onBeforeCreate(formData); if (r === false) return; }
        await PROVIDER.create(resource, formData);
        onCreate?.(formData);
      }
      closeModal();
      fetchData();
    } catch (e) {
      setError(e.message);
    }
  };

  const handleDelete = async (id) => {
    try {
      await PROVIDER.delete(resource, id);
      onDelete?.(id);
      setDeleteConfirm(null);
      fetchData();
    } catch (e) {
      setError(e.message);
    }
  };

  const handleBulkDelete = async () => {
    try {
      for (const id of selectedIds) {
        await PROVIDER.delete(resource, id);
      }
      setSelectedIds([]);
      fetchData();
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div>
      {error && <Alert type="danger" className="mb">{error}</Alert>}

      <div className="crud-toolbar">
        <div className="crud-toolbar-left">
          {showSearch && (
            <Search
              value={search}
              onChange={setSearch}
              onSearch={handleSearch}
              placeholder={searchPlaceholder}
              className="min-w-280"
            />
          )}
        </div>
        <div className="crud-toolbar-right">
          {canCreate && (
            <Button icon={<I.Plus />} onClick={openCreate}>{createLabel}</Button>
          )}
          <Button variant="ghost" icon={<I.Refresh />} onClick={fetchData} />
        </div>
      </div>

      {showFilters && (
        <Filters
          filters={filterConfig}
          activeFilters={filters}
          onChange={handleFilterChange}
          onClear={handleClearFilters}
        />
      )}

      <Table
        columns={columns}
        data={data}
        loading={loading}
        sortBy={sortBy}
        sortDir={sortDir}
        onSort={handleSort}
        emptyText={emptyText}
        onRowClick={canEdit ? openEdit : undefined}
        selectedIds={selectedIds}
        onSelectAll={() => {
          if (selectedIds.length === data.length) setSelectedIds([]);
          else setSelectedIds(data.map(d => d[rowKey]));
        }}
        onSelectOne={(id) => {
          setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
          );
        }}
        actions={canDelete || canEdit}
      />

      {(total > 0 || selectedIds.length > 0) && (
        <div className="flex-between mt-8">
          <Pagination
            page={page}
            totalPages={totalPages}
            total={total}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
            pageSizeOptions={pageSizeOptions}
          />
          {selectedIds.length > 0 && canDelete && (
            <Button variant="danger" size="sm" icon={<I.Trash />} onClick={handleBulkDelete}>
              Delete {selectedIds.length} selected
            </Button>
          )}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editingItem ? `Edit ${formTitle || title}` : `Create ${formTitle || title}`}
        size={formSize}
      >
        {renderForm && renderForm({
          item: editingItem,
          onSubmit: handleSubmit,
          onCancel: closeModal,
          isEdit: !!editingItem,
        })}
      </Modal>

      <Modal
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Confirm Delete"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="danger" onClick={() => handleDelete(deleteConfirm)}>Delete</Button>
          </>
        }
      >
        <p>Are you sure you want to delete this item? This action cannot be undone.</p>
      </Modal>
    </div>
  );
}

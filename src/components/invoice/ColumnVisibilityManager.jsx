import Dropdown from '../ui/Dropdown.jsx';
import Icon from '../ui/Icon.jsx';
import PermissionGate from '../ui/PermissionGate.jsx';
import { INVOICE_TABLE_COLUMNS } from '../../constants/index.js';

const PERMISSION_MAP = {
  batch: null,
  warehouse: null,
  hsnSac: null,
};

export default function ColumnVisibilityManager({
  visibleKeys,
  onToggle,
  onSetKeys,
  trigger,
  allColumns,
}) {
  const cols = allColumns || INVOICE_TABLE_COLUMNS;
  const availableColumns = cols.filter((c) => !c.always);

  return (
    <Dropdown
      trigger={trigger || (
        <button className="inv-icon-btn" aria-label="Column settings">
          <Icon name="sliders-horizontal" size={14} />
        </button>
      )}
      align="right"
    >
      <div className="inv-column-manager">
        <div className="inv-column-manager__header">
          <Icon name="columns" size={14} />
          Active Columns
        </div>
        <div className="inv-column-manager__list">
          {availableColumns.map((col) => {
            const content = (
              <label
                key={col.key}
                className="inv-column-manager__item"
                data-testid={`col-toggle-${col.key}`}
              >
                <input
                  type="checkbox"
                  className="inv-column-manager__checkbox"
                  checked={visibleKeys.includes(col.key)}
                  onChange={() => onToggle(col.key)}
                />
                <span className="inv-column-manager__label">{col.label}</span>
              </label>
            );

            if (PERMISSION_MAP[col.key]) {
              return (
                <PermissionGate key={col.key} permission={PERMISSION_MAP[col.key]} fallback={null}>
                  {content}
                </PermissionGate>
              );
            }

            return content;
          })}
        </div>
      </div>
    </Dropdown>
  );
}

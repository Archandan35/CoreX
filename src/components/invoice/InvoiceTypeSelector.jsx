import { useState, useEffect } from 'react';
import Dropdown, { DropdownItem } from '../ui/Dropdown.jsx';
import Icon from '../ui/Icon.jsx';
import { invoiceService } from '../../services/invoice/index.js';

export default function InvoiceTypeSelector({ value, onChange }) {
  const [types, setTypes] = useState([]);

  useEffect(() => {
    invoiceService.listDocumentTypes()
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setTypes(list);
        if (!value && list.length > 0) {
          onChange(list[0]);
        }
      })
      .catch(() => {});
  }, []);

  if (types.length === 0) return null;

  const currentLabel = value || types[0] || 'Regular';

  return (
    <Dropdown
      trigger={
        <div className="inv-type-select">
          {currentLabel} <Icon name="chevron-down" size={14} />
        </div>
      }
    >
      {types.map((t) => (
        <DropdownItem key={t} onClick={() => onChange(t)}>{t}</DropdownItem>
      ))}
    </Dropdown>
  );
}

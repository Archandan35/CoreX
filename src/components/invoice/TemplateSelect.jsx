import { useEffect, useState } from 'react';
import { templateService } from '../../services/template/index.js';
import { select } from '../../components/ui';

export default function TemplateSelect({ onChange }) {
  const [templates, setTemplates] = useState([]);

  useEffect(() => {
    const load = async () => {
      const data = await templateService.list();
      setTemplates(data?.templates || []);
    };
    load();
  }, []);

  return (
    <div className="template-select">
      <label>Template</label>
      <select onChange={e => onChange(e.target.value)}>
        <option value="">-- default --</option>
        {templates.map(t => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>
    </div>
  );
}

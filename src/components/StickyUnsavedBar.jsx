import Button from '../components/ui/Button.jsx';
import { useUnsavedChanges } from '../hooks/useUnsavedChanges.js';

export default function StickyUnsavedBar({form, reset, onSave}) {
  const { dirty } = useUnsavedChanges(form, reset, false); // false => don't trigger auto reset
  if (!dirty) return null;
  return (
    <div className="sticky bottom-0 bg-white border-t p-2 flex justify-end gap-2" style={{zIndex: 1000}}>
      <Button variant="secondary" onClick={reset}>Reset</Button>
      <Button onClick={onSave}>Save Changes</Button>
    </div>
  );
}

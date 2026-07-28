import Modal from './Modal.jsx';
import Button from './Button.jsx';

export default function ConfirmDialog({ open, onClose, onConfirm, title = 'Confirm', message = 'Are you sure?', confirmText = 'Confirm', cancelText = 'Cancel', variant = 'danger', loading = false, extraText, onExtra, extraLoading }) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading || extraLoading}>{cancelText}</Button>
          {extraText && onExtra && (
            <Button variant="primary" onClick={onExtra} loading={extraLoading}>{extraText}</Button>
          )}
          <Button variant={variant} onClick={onConfirm} loading={loading}>{confirmText}</Button>
        </>
      }
    >
      <p className="confirm-dialog-message">{message}</p>
    </Modal>
  );
}

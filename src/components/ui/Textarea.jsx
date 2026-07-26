export default function Textarea({ className = '', ...props }) {
  return <textarea className={`form-input form-textarea ${className}`} {...props} />;
}

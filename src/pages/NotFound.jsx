import { useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import I from '../icon';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="error-state min-h-screen flex-col flex-center">
      <div className="error-state-icon"><I.Alert /></div>
      <h2 className="error-state-title">Page Not Found</h2>
      <p className="error-state-text">The page you're looking for doesn't exist or has been moved.</p>
      <Button onClick={() => navigate('/dashboard')}><I.ChevronLeft /> Back to Dashboard</Button>
    </div>
  );
}

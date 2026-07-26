import { StrictMode, Component } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import './css/index.css';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) {
    console.error('=== React Render Error ===');
    console.error(error);
    console.error('Component stack:', info.componentStack);
  }
  render() {
    if (this.state.error) {
      console.error('Render blocked by:', this.state.error);
      return null;
    }
    return this.props.children;
  }
}

window.addEventListener('error', (event) => {
  console.error('=== Unhandled runtime error ===');
  console.error('Message:', event.message);
  console.error('Source:', event.filename);
  console.error('Line:', event.lineno, 'Col:', event.colno);
  console.error('Error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('=== Unhandled Promise rejection ===');
  console.error('Reason:', event.reason);
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </BrowserRouter>
  </StrictMode>
);

import { lazy } from 'react';
const SetupWizard = lazy(() => import('./SetupWizard'));
export default function AdminSetup() {
  return <SetupWizard />;
}

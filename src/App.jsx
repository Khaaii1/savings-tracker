import { useSavingsPlan } from "./hooks/useSavingsPlan.js";
import SetupScreen from "./components/SetupScreen.jsx";
import Dashboard from "./components/Dashboard.jsx";

export default function App() {
  const tracker = useSavingsPlan();

  if (!tracker.plan.isSetUp) {
    return <SetupScreen onSetup={tracker.setup} />;
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand">
          <span className="brand-mark">Ledger</span>
        </div>
      </header>

      <Dashboard tracker={tracker} />

      <footer className="app-footer">
        <span>Saved locally in this browser.</span>
        <span>Built with React + Vite</span>
      </footer>
    </div>
  );
}

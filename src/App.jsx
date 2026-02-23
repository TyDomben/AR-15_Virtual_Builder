import { useEffect } from 'react';
import { useBuildStore } from './store/buildStore';
import BuildPanel, { ALL_PARTS } from './components/BuildPanel';
import ChecklistSidebar from './components/ChecklistSidebar';
import ATFFlag from './components/ATFFlag';
import ShareButton from './components/ShareButton';

export default function App() {
  const { compatibilityResults, resetBuild, loadBuildFromBase64 } = useBuildStore();

  // On mount: check URL fragment for shared build
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash) {
      loadBuildFromBase64(hash, ALL_PARTS);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-gray-900 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight">AR-15 Virtual Builder</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              Configure your build. Compatibility checked in real time.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={resetBuild}
              className="text-xs text-gray-400 hover:text-white transition-colors border border-gray-600 hover:border-gray-400 rounded px-3 py-1.5"
            >
              Reset Build
            </button>
            <ShareButton />
          </div>
        </div>
      </header>

      {/* Main layout */}
      <main className="max-w-7xl mx-auto px-4 py-6 flex gap-6">
        {/* Build panel — left/center, takes most space */}
        <div className="flex-1 min-w-0">
          {/* ATF Flags — shown above build when triggered */}
          {compatibilityResults.atfFlags.length > 0 && (
            <ATFFlag flags={compatibilityResults.atfFlags} />
          )}

          <BuildPanel />
        </div>

        {/* Sidebar — fixed width on the right */}
        <div className="w-72 shrink-0">
          <div className="sticky top-6">
            <ChecklistSidebar />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white mt-8 py-4">
        <div className="max-w-7xl mx-auto px-4 text-xs text-gray-400 text-center">
          AR-15 Virtual Builder — For informational and planning purposes only. Not legal advice.
          Laws vary by state and locality. Always consult a qualified attorney before building.
        </div>
      </footer>
    </div>
  );
}

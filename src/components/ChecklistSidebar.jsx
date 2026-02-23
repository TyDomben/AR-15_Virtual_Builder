/**
 * ChecklistSidebar.jsx
 * Live completeness checklist + warnings panel.
 * Shows: required slots filled/empty, hard blocks, soft warnings, info flags.
 */
import { useState } from 'react';
import { useBuildStore } from '../store/buildStore';
import slotsData from '../data/slots.json';

export default function ChecklistSidebar() {
  const { selectedParts, compatibilityResults, missingSlots, unlockedSlots } = useBuildStore();
  const { hardBlocks, softWarnings, infoFlags, atfFlags } = compatibilityResults;

  const totalRequired = slotsData.filter(
    (s) => s.is_required && (!s.is_conditional || unlockedSlots.includes(s.id))
  );
  const filledRequired = totalRequired.filter((s) => selectedParts[s.id]);
  const completionPct =
    totalRequired.length > 0
      ? Math.round((filledRequired.length / totalRequired.length) * 100)
      : 0;

  // Complete = all required filled, no hard blocks (ATF flags don't block completeness)
  const isComplete = missingSlots.length === 0 && hardBlocks.length === 0;

  return (
    <aside className="flex flex-col gap-4">
      {/* Build completeness */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-2">Build Completeness</h2>
        <div className="flex items-center gap-3 mb-2">
          <div className="flex-1 bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${
                completionPct === 100 ? 'bg-green-500' : 'bg-blue-500'
              }`}
              style={{ width: `${completionPct}%` }}
            />
          </div>
          <span className="text-sm font-semibold text-gray-700 shrink-0">
            {filledRequired.length}/{totalRequired.length}
          </span>
        </div>

        {isComplete && (
          <div className="rounded bg-green-100 px-3 py-2 text-xs text-green-800 font-medium">
            ✅ Build is complete and compatible!
          </div>
        )}

        {/* Missing required slots */}
        {missingSlots.length > 0 && (
          <div className="mt-2 space-y-1">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Missing Required Parts
            </p>
            {missingSlots.map((slot) => (
              <div key={slot.id} className="flex items-center gap-1.5 text-xs text-gray-600">
                <span className="text-red-400">○</span>
                {slot.display_name}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Compatibility issues */}
      {(hardBlocks.length > 0 || softWarnings.length > 0 || infoFlags.length > 0) && (
        <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
          <h2 className="text-sm font-semibold text-gray-700">Compatibility Alerts</h2>

          {/* Hard blocks */}
          {hardBlocks.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-red-600 uppercase tracking-wide">
                🔴 Hard Blocks ({hardBlocks.length})
              </p>
              {hardBlocks.map((block) => (
                <AlertItem key={block.rule_id} alert={block} level="hard" />
              ))}
            </div>
          )}

          {/* Soft warnings */}
          {softWarnings.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-yellow-600 uppercase tracking-wide">
                🟡 Warnings ({softWarnings.length})
              </p>
              {softWarnings.map((warn) => (
                <AlertItem key={warn.rule_id} alert={warn} level="soft" />
              ))}
            </div>
          )}

          {/* Info flags */}
          {infoFlags.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">
                🔵 Info ({infoFlags.length})
              </p>
              {infoFlags.map((info) => (
                <AlertItem key={info.rule_id} alert={info} level="info" />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Selected parts summary */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-2">Selected Parts</h2>
        <div className="space-y-1 max-h-96 overflow-y-auto">
          {slotsData.map((slot) => {
            const part = selectedParts[slot.id];
            if (!part) return null;
            return (
              <div key={slot.id} className="text-xs">
                <span className="text-gray-500">{slot.display_name}: </span>
                <span className="text-gray-900 font-medium">{part.brand} {part.name}</span>
              </div>
            );
          })}
          {Object.values(selectedParts).every((p) => !p) && (
            <p className="text-xs text-gray-400 italic">No parts selected yet.</p>
          )}
        </div>
      </div>
    </aside>
  );
}

function AlertItem({ alert, level }) {
  const [expanded, setExpanded] = useState(false);

  const colors = {
    hard: 'bg-red-50 border-red-200 text-red-800',
    soft: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
  };

  return (
    <div className={`rounded border px-3 py-2 text-xs ${colors[level]}`}>
      <button
        className="w-full text-left font-medium hover:opacity-80 transition-opacity"
        onClick={() => setExpanded((e) => !e)}
      >
        {alert.message_short} {expanded ? '▲' : '▼'}
      </button>
      {expanded && (
        <p className="mt-1 text-xs opacity-90 leading-relaxed">{alert.message_long}</p>
      )}
    </div>
  );
}

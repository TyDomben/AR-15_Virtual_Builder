/**
 * KitExpander.jsx
 * Renders a kit slot (LPK, buffer tube, BCG) with collapse/expand.
 * When collapsed, shows the kit-level selector.
 * When expanded, shows all sub-component slots.
 * If childSlots is empty (BCG in v1), always shows collapsed view only.
 */
import { useBuildStore } from '../store/buildStore';
import SlotSelector from './SlotSelector';

export default function KitExpander({ kitSlot, kitParts, childSlots, childPartsMap, unlockedSlots }) {
  const { expandedKits, toggleKitExpansion } = useBuildStore();
  const isExpanded = expandedKits[kitSlot.id] ?? false;
  const hasChildren = childSlots.length > 0;

  return (
    <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
      {/* Kit header row */}
      <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            {kitSlot.display_name}
          </span>
          <span className="text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded font-medium">
            KIT
          </span>
        </div>
        {hasChildren && (
          <button
            className="text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors flex items-center gap-1"
            onClick={() => toggleKitExpansion(kitSlot.id)}
          >
            {isExpanded ? (
              <>
                <span>▲</span>
                <span>Collapse</span>
              </>
            ) : (
              <>
                <span>▼</span>
                <span>Expand individual parts</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Collapsed: show kit-level selector */}
      {(!hasChildren || !isExpanded) && (
        <div className="p-2">
          <SlotSelector
            slot={kitSlot}
            parts={kitParts}
            isUnlocked={true}
            isKitChild={false}
          />
          {hasChildren && (
            <p className="text-xs text-gray-400 px-1 mt-1.5">
              Selecting the kit covers all sub-components as a unit. Expand to choose each part individually instead.
            </p>
          )}
        </div>
      )}

      {/* Expanded: show all sub-component slots */}
      {hasChildren && isExpanded && (
        <div className="p-2 space-y-2">
          <p className="text-xs text-gray-500 italic px-1">
            Individual parts selected. Kit defaults are overridden.
          </p>
          {childSlots.map((childSlot) => {
            const childParts = childPartsMap[childSlot.id] || [];
            const isUnlocked =
              !childSlot.is_conditional || unlockedSlots.includes(childSlot.id);
            return (
              <SlotSelector
                key={childSlot.id}
                slot={childSlot}
                parts={childParts}
                isUnlocked={isUnlocked}
                isKitChild={true}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

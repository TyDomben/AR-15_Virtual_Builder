/**
 * SlotSelector.jsx
 * Individual slot component with dropdown + search.
 * Compatible parts surfaced first; incompatible parts shown below a divider with reason.
 */
import { useState, useRef, useEffect, useMemo } from 'react';
import { useBuildStore } from '../store/buildStore';

export default function SlotSelector({ slot, parts, isUnlocked, isKitChild }) {
  const { selectedParts, selectPart, clearPart, compatibilityResults } = useBuildStore();
  const selected = selectedParts[slot.id];
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
        setSearch('');
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Find compatibility conflicts for this slot
  const slotConflicts = useMemo(() => {
    const allIssues = [
      ...compatibilityResults.hardBlocks,
      ...compatibilityResults.softWarnings,
    ];
    return allIssues.filter(
      (issue) => issue.slot_a === slot.id || issue.slot_b === slot.id
    );
  }, [compatibilityResults, slot.id]);

  const hasHardBlock = slotConflicts.some(
    (i) => compatibilityResults.hardBlocks.some((h) => h.rule_id === i.rule_id)
  );
  const hasSoftWarning =
    !hasHardBlock &&
    slotConflicts.some((i) =>
      compatibilityResults.softWarnings.some((s) => s.rule_id === i.rule_id)
    );

  // Categorize parts: compatible vs incompatible with current build
  const { compatible, incompatible } = useMemo(() => {
    const filtered = parts.filter((p) =>
      search === '' ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.brand.toLowerCase().includes(search.toLowerCase())
    );

    // For now, all parts are shown as compatible — smart filtering
    // would require per-part rule evaluation (Phase 2 enhancement).
    // We surface currently selected part's conflicts in the slot header.
    return { compatible: filtered, incompatible: [] };
  }, [parts, search]);

  // Locked conditional slot
  if (slot.is_conditional && !isUnlocked) {
    return (
      <div
        className={`rounded-lg border border-dashed border-gray-300 bg-gray-50 p-3 opacity-50 ${
          isKitChild ? 'ml-4' : ''
        }`}
      >
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">
          {slot.display_name}
        </p>
        <p className="text-xs text-gray-400 mt-1">
          {getUnlockHint(slot.id)}
        </p>
      </div>
    );
  }

  const borderColor = hasHardBlock
    ? 'border-red-400'
    : hasSoftWarning
    ? 'border-yellow-400'
    : selected
    ? 'border-green-400'
    : 'border-gray-200';

  const bgColor = hasHardBlock
    ? 'bg-red-50'
    : hasSoftWarning
    ? 'bg-yellow-50'
    : 'bg-white';

  return (
    <div className={`rounded-lg border ${borderColor} ${bgColor} ${isKitChild ? 'ml-4' : ''}`} ref={dropdownRef}>
      {/* Slot header */}
      <div
        className="flex items-center justify-between px-3 py-2 cursor-pointer select-none"
        onClick={() => setOpen((o) => !o)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              {slot.display_name}
            </span>
            {slot.is_required && !selected && (
              <span className="text-xs text-red-500 font-medium">Required</span>
            )}
            {slot.is_kit && (
              <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-medium">
                KIT
              </span>
            )}
          </div>
          {selected ? (
            <p className="text-sm font-medium text-gray-900 truncate mt-0.5">
              {selected.brand} — {selected.name}
            </p>
          ) : (
            <p className="text-sm text-gray-400 mt-0.5 italic">Select {slot.display_name}…</p>
          )}
        </div>

        <div className="flex items-center gap-2 ml-2 shrink-0">
          {/* Status indicator */}
          {hasHardBlock && <span className="text-sm">🔴</span>}
          {hasSoftWarning && <span className="text-sm">🟡</span>}
          {!hasHardBlock && !hasSoftWarning && selected && <span className="text-sm">✅</span>}

          {/* Clear button */}
          {selected && (
            <button
              className="text-xs text-gray-400 hover:text-red-500 transition-colors px-1"
              onClick={(e) => {
                e.stopPropagation();
                clearPart(slot.id);
              }}
              title="Clear selection"
            >
              ✕
            </button>
          )}

          {/* Chevron */}
          <span className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}>
            ▾
          </span>
        </div>
      </div>

      {/* Inline conflicts */}
      {slotConflicts.length > 0 && (
        <div className="px-3 pb-2 space-y-1">
          {slotConflicts.map((conflict) => {
            const isHard = compatibilityResults.hardBlocks.some(
              (h) => h.rule_id === conflict.rule_id
            );
            return (
              <p
                key={conflict.rule_id}
                className={`text-xs rounded px-2 py-1 ${
                  isHard
                    ? 'bg-red-100 text-red-700'
                    : 'bg-yellow-100 text-yellow-700'
                }`}
              >
                {isHard ? '🔴' : '🟡'} {conflict.message_short}
              </p>
            );
          })}
        </div>
      )}

      {/* Dropdown */}
      {open && (
        <div className="border-t border-gray-100">
          {/* Search */}
          <div className="px-3 py-2">
            <input
              type="text"
              className="w-full text-sm border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400"
              placeholder="Search parts…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          {/* Parts list */}
          <div className="max-h-72 overflow-y-auto">
            {compatible.length === 0 && (
              <p className="text-xs text-gray-400 px-3 py-2 italic">No parts found.</p>
            )}
            {compatible.map((part) => (
              <PartOption
                key={part.id}
                part={part}
                isSelected={selected?.id === part.id}
                onSelect={() => {
                  selectPart(slot.id, part);
                  setOpen(false);
                  setSearch('');
                }}
                slotId={slot.id}
              />
            ))}
            {incompatible.length > 0 && (
              <>
                <div className="px-3 py-1 border-t border-dashed border-gray-200 mt-1">
                  <p className="text-xs text-gray-400 font-medium">— Incompatible parts (shown for reference) —</p>
                </div>
                {incompatible.map((part) => (
                  <PartOption
                    key={part.id}
                    part={part}
                    isSelected={selected?.id === part.id}
                    onSelect={() => {
                      selectPart(slot.id, part);
                      setOpen(false);
                      setSearch('');
                    }}
                    slotId={slot.id}
                    isIncompatible
                    conflictReason={part._conflictReason}
                  />
                ))}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function PartOption({ part, isSelected, onSelect, isIncompatible, conflictReason }) {
  const attrs = part.attributes || {};
  const attrSummary = buildAttrSummary(attrs);

  return (
    <div
      className={`px-3 py-2 cursor-pointer hover:bg-blue-50 transition-colors ${
        isSelected ? 'bg-blue-100' : ''
      } ${isIncompatible ? 'opacity-60' : ''}`}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{part.name}</p>
          <p className="text-xs text-gray-500">{part.brand}</p>
          {attrSummary && (
            <p className="text-xs text-gray-400 mt-0.5">{attrSummary}</p>
          )}
          {isIncompatible && conflictReason && (
            <p className="text-xs text-red-600 mt-0.5">⚠ {conflictReason}</p>
          )}
        </div>
        {isSelected && <span className="text-blue-500 shrink-0">✓</span>}
      </div>
    </div>
  );
}

function buildAttrSummary(attrs) {
  const parts = [];
  if (attrs.caliber) parts.push(attrs.caliber);
  if (attrs.length_inches) parts.push(`${attrs.length_inches}"`);
  if (attrs.gas_system) parts.push(`${attrs.gas_system}-length`);
  if (attrs.twist_rate) parts.push(`1:${attrs.twist_rate.replace('1:', '')}`);
  if (attrs.weight_oz) parts.push(`${attrs.weight_oz}oz`);
  if (attrs.spec) parts.push(`${attrs.spec} spec`);
  if (attrs.mount_system) parts.push(attrs.mount_system);
  if (attrs.tube_spec) parts.push(`${attrs.tube_spec} tube`);
  if (attrs.type && !attrs.gas_system) parts.push(attrs.type);
  if (attrs.journal_size) parts.push(`${attrs.journal_size}" journal`);
  if (attrs.pull_weight_lbs) parts.push(`${attrs.pull_weight_lbs}lb pull`);
  return parts.slice(0, 4).join(' · ');
}

function getUnlockHint(slotId) {
  const hints = {
    'forward-assist': 'Unlocked when upper receiver has a forward assist port',
    'dust-cover': 'Unlocked when upper receiver has a dust cover port',
    'muzzle-device': 'Unlocked when barrel is threaded',
    'trigger-guard': 'Hidden when lower receiver has an integral trigger guard',
    'foregrip': 'Unlocked when handguard has an accessory rail',
    'light-laser': 'Unlocked when handguard has an accessory rail',
    'bipod': 'Unlocked when handguard has an accessory rail',
  };
  return hints[slotId] || 'Select required upstream parts to unlock';
}

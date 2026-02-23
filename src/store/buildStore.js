import { create } from 'zustand';
import { evaluateBuild, evaluateSlotUnlocks, getMissingRequiredSlots } from '../engine/compatibilityEngine';
import compatibilityRules from '../data/compatibility-rules.json';
import slotUnlocksData from '../data/slot-unlocks.json';
import slotsData from '../data/slots.json';

// All possible slots initialized to null
const INITIAL_PARTS = {
  'lower-receiver': null,
  'pistol-grip': null,
  'trigger-guard': null,
  'stock': null,
  'pistol-brace': null,
  'buffer-tube': null,
  'buffer': null,
  'buffer-spring': null,
  'lpk': null,
  'trigger': null,
  'hammer': null,
  'safety-selector': null,
  'magazine-release': null,
  'bolt-catch': null,
  'upper-receiver': null,
  'forward-assist': null,
  'dust-cover': null,
  'barrel': null,
  'gas-block': null,
  'gas-tube': null,
  'handguard': null,
  'bcg': null,
  'charging-handle': null,
  'muzzle-device': null,
  'magazine': null,
  'foregrip': null,
  'light-laser': null,
  'bipod': null,
};

function runEngine(selectedParts) {
  const results = evaluateBuild(selectedParts, compatibilityRules);
  const unlocked = evaluateSlotUnlocks(selectedParts, slotUnlocksData);
  const missing = getMissingRequiredSlots(selectedParts, slotsData, unlocked);
  return { results, unlocked, missing };
}

export const useBuildStore = create((set, get) => ({
  // Current build state
  selectedParts: { ...INITIAL_PARTS },

  // Which kit slots are expanded to show sub-components
  expandedKits: {
    lpk: false,
    'buffer-tube': false,
    bcg: false,
  },

  // Which conditional slots are currently unlocked
  unlockedSlots: [],

  // Live compatibility results
  compatibilityResults: {
    hardBlocks: [],
    softWarnings: [],
    infoFlags: [],
    atfFlags: [],
  },

  // Missing required slots
  missingSlots: [],

  // Select or replace a part in a slot
  selectPart: (slotId, part) => {
    set((state) => {
      let newParts = { ...state.selectedParts, [slotId]: part };

      // Enforce mutual exclusivity: stock <-> pistol-brace
      if (slotId === 'stock' && part) {
        newParts['pistol-brace'] = null;
      } else if (slotId === 'pistol-brace' && part) {
        newParts['stock'] = null;
      }

      const { results, unlocked, missing } = runEngine(newParts);

      return {
        selectedParts: newParts,
        compatibilityResults: results,
        unlockedSlots: unlocked,
        missingSlots: missing,
      };
    });
  },

  // Clear a part from a slot
  clearPart: (slotId) => {
    set((state) => {
      const newParts = { ...state.selectedParts, [slotId]: null };
      const { results, unlocked, missing } = runEngine(newParts);

      return {
        selectedParts: newParts,
        compatibilityResults: results,
        unlockedSlots: unlocked,
        missingSlots: missing,
      };
    });
  },

  // Toggle kit expansion (LPK, buffer system, BCG)
  toggleKitExpansion: (kitSlotId) => {
    set((state) => ({
      expandedKits: {
        ...state.expandedKits,
        [kitSlotId]: !state.expandedKits[kitSlotId],
      },
    }));
  },

  // Encode current build state to base64 URL fragment
  getBuildAsBase64: () => {
    const { selectedParts, expandedKits } = get();
    // Only encode part IDs (not full objects) to keep URL short
    const partIds = {};
    for (const [slotId, part] of Object.entries(selectedParts)) {
      partIds[slotId] = part ? part.id : null;
    }
    const payload = { parts: partIds, kits: expandedKits };
    return btoa(JSON.stringify(payload));
  },

  // Load build state from base64 URL fragment
  loadBuildFromBase64: (encoded, allParts) => {
    try {
      const payload = JSON.parse(atob(encoded));
      const newParts = { ...INITIAL_PARTS };

      for (const [slotId, partId] of Object.entries(payload.parts || {})) {
        if (!partId) continue;
        // Look up the full part object from allParts catalog
        const slotParts = allParts[slotId] || [];
        const found = slotParts.find((p) => p.id === partId);
        if (found) newParts[slotId] = found;
      }

      const { results, unlocked, missing } = runEngine(newParts);

      set({
        selectedParts: newParts,
        expandedKits: payload.kits || { lpk: false, 'buffer-tube': false, bcg: false },
        compatibilityResults: results,
        unlockedSlots: unlocked,
        missingSlots: missing,
      });
    } catch (e) {
      console.error('Failed to load build from URL:', e);
    }
  },

  // Reset entire build
  resetBuild: () => {
    set({
      selectedParts: { ...INITIAL_PARTS },
      expandedKits: { lpk: false, 'buffer-tube': false, bcg: false },
      unlockedSlots: [],
      compatibilityResults: { hardBlocks: [], softWarnings: [], infoFlags: [], atfFlags: [] },
      missingSlots: [],
    });
  },
}));

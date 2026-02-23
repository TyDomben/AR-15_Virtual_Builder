/**
 * BuildPanel.jsx
 * Main build area — all slots visible at once, no forced order.
 * Groups slots by assembly (lower, upper, accessories).
 * Kit slots use KitExpander; all others use SlotSelector.
 */
import { useMemo } from 'react';
import { useBuildStore } from '../store/buildStore';
import SlotSelector from './SlotSelector';
import KitExpander from './KitExpander';
import slotsData from '../data/slots.json';

// Lazy-import all part files
import lowerReceiverParts from '../data/parts/lower-receiver.json';
import upperReceiverParts from '../data/parts/upper-receiver.json';
import barrelParts from '../data/parts/barrel.json';
import handguardParts from '../data/parts/handguard.json';
import gasBlockParts from '../data/parts/gas-block.json';
import gasTubeParts from '../data/parts/gas-tube.json';
import bcgParts from '../data/parts/bcg.json';
import chargingHandleParts from '../data/parts/charging-handle.json';
import stockParts from '../data/parts/stock.json';
import pistolBraceParts from '../data/parts/pistol-brace.json';
import bufferTubeParts from '../data/parts/buffer-tube.json';
import bufferParts from '../data/parts/buffer.json';
import bufferSpringParts from '../data/parts/buffer-spring.json';
import pistolGripParts from '../data/parts/pistol-grip.json';
import triggerGuardParts from '../data/parts/trigger-guard.json';
import lpkParts from '../data/parts/lpk.json';
import muzzleDeviceParts from '../data/parts/muzzle-device.json';
import forwardAssistParts from '../data/parts/forward-assist.json';
import dustCoverParts from '../data/parts/dust-cover.json';
import magazineParts from '../data/parts/magazine.json';
import foregripParts from '../data/parts/foregrip.json';
import lightLaserParts from '../data/parts/light-laser.json';
import bipodParts from '../data/parts/bipod.json';
import triggerParts from '../data/parts/trigger.json';
import hammerParts from '../data/parts/hammer.json';
import safetyParts from '../data/parts/safety-selector.json';
import magReleaseParts from '../data/parts/magazine-release.json';
import boltCatchParts from '../data/parts/bolt-catch.json';

const ALL_PARTS = {
  'lower-receiver': lowerReceiverParts,
  'upper-receiver': upperReceiverParts,
  'barrel': barrelParts,
  'handguard': handguardParts,
  'gas-block': gasBlockParts,
  'gas-tube': gasTubeParts,
  'bcg': bcgParts,
  'charging-handle': chargingHandleParts,
  'stock': stockParts,
  'pistol-brace': pistolBraceParts,
  'buffer-tube': bufferTubeParts,
  'buffer': bufferParts,
  'buffer-spring': bufferSpringParts,
  'pistol-grip': pistolGripParts,
  'trigger-guard': triggerGuardParts,
  'lpk': lpkParts,
  'muzzle-device': muzzleDeviceParts,
  'forward-assist': forwardAssistParts,
  'dust-cover': dustCoverParts,
  'magazine': magazineParts,
  'foregrip': foregripParts,
  'light-laser': lightLaserParts,
  'bipod': bipodParts,
  'trigger': triggerParts,
  'hammer': hammerParts,
  'safety-selector': safetyParts,
  'magazine-release': magReleaseParts,
  'bolt-catch': boltCatchParts,
};

// Kit slot configurations
const KIT_CONFIGS = {
  'lpk': {
    children: ['trigger', 'hammer', 'safety-selector', 'magazine-release', 'bolt-catch'],
  },
  'buffer-tube': {
    children: ['buffer', 'buffer-spring'],
  },
  'bcg': {
    children: [],
  },
};

const ASSEMBLY_LABELS = {
  lower: 'Lower Assembly',
  upper: 'Upper Assembly',
  accessories: 'Accessories',
};

const ASSEMBLY_ORDER = ['lower', 'upper', 'accessories'];

// Slots that are rendered as children inside kit expanders (not top-level)
const KIT_CHILD_IDS = new Set([
  'buffer', 'buffer-spring',
  'trigger', 'hammer', 'safety-selector', 'magazine-release', 'bolt-catch',
]);

export default function BuildPanel() {
  const { unlockedSlots } = useBuildStore();

  // Group top-level slots by assembly
  const byAssembly = useMemo(() => {
    const grouped = { lower: [], upper: [], accessories: [] };
    for (const slot of slotsData) {
      if (KIT_CHILD_IDS.has(slot.id)) continue; // rendered inside kit expanders
      if (grouped[slot.assembly]) {
        grouped[slot.assembly].push(slot);
      }
    }
    return grouped;
  }, []);

  return (
    <div className="space-y-8">
      {ASSEMBLY_ORDER.map((assembly) => {
        const assemblySlots = byAssembly[assembly] || [];
        if (assemblySlots.length === 0) return null;

        return (
          <section key={assembly}>
            <h2 className="text-lg font-bold text-gray-800 mb-3 pb-2 border-b border-gray-200">
              {ASSEMBLY_LABELS[assembly]}
            </h2>
            <div className="space-y-2">
              {assemblySlots.map((slot) => {
                const isUnlocked = !slot.is_conditional || unlockedSlots.includes(slot.id);
                const parts = ALL_PARTS[slot.id] || [];

                // Render kit slots with KitExpander
                if (slot.is_kit && KIT_CONFIGS[slot.id]) {
                  const kitConfig = KIT_CONFIGS[slot.id];
                  const childSlots = slotsData.filter((s) =>
                    kitConfig.children.includes(s.id)
                  );
                  const childPartsMap = {};
                  for (const childId of kitConfig.children) {
                    childPartsMap[childId] = ALL_PARTS[childId] || [];
                  }
                  return (
                    <KitExpander
                      key={slot.id}
                      kitSlot={slot}
                      kitParts={parts}
                      childSlots={childSlots}
                      childPartsMap={childPartsMap}
                      unlockedSlots={unlockedSlots}
                    />
                  );
                }

                // Regular slot
                return (
                  <SlotSelector
                    key={slot.id}
                    slot={slot}
                    parts={parts}
                    isUnlocked={isUnlocked}
                    isKitChild={false}
                  />
                );
              })}
            </div>
          </section>
        );
      })}

      {/* All parts reference for URL loading */}
    </div>
  );
}

// Export ALL_PARTS so App.jsx can pass it to loadBuildFromBase64
export { ALL_PARTS };

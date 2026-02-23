/**
 * compatibilityEngine.js
 * Pure function compatibility evaluator.
 * Called every time selectedParts changes.
 * Returns { hardBlocks, softWarnings, infoFlags, atfFlags }
 */

// Caliber compatibility matrix — which BCG/magazine calibers work with which barrel calibers
const CALIBER_COMPAT = {
  '5.56 NATO': ['5.56 NATO', '.223 Wylde', '.223 Rem'],
  '.223 Wylde': ['5.56 NATO', '.223 Wylde', '.223 Rem'],
  '.223 Rem': ['.223 Rem', '.223 Wylde'],
  '.300 BLK': ['.300 BLK'],
  '6.5 Grendel': ['6.5 Grendel'],
  '.458 SOCOM': ['.458 SOCOM'],
};

function caliberCompatible(barrelCaliber, partCaliber) {
  const compatList = CALIBER_COMPAT[barrelCaliber] || [barrelCaliber];
  return compatList.includes(partCaliber);
}

// Gas system to recommended buffer weight ranges
const GAS_BUFFER_COMPAT = {
  pistol: ['pistol', 'carbine'],
  carbine: ['pistol', 'carbine', 'H'],
  'mid-length': ['carbine', 'H', 'H2', 'hydraulic', 'captured'],
  rifle: ['H', 'H2', 'H3', 'hydraulic'],
};

function bufferGasMatch(bufferType, gasSystem) {
  const ok = GAS_BUFFER_COMPAT[gasSystem] || [];
  return ok.includes(bufferType);
}

function getAttr(part, attr) {
  if (!part) return undefined;
  if (attr === '_selected') return part !== null;
  return part.attributes?.[attr] ?? part[attr];
}

function evaluateRule(rule, selectedParts) {
  const partA = selectedParts[rule.slot_a];
  const partB = rule.slot_b ? selectedParts[rule.slot_b] : null;

  // Skip rules where either required slot is empty
  if (!partA) return null;
  if (rule.slot_b && !partB) return null;

  const valA = getAttr(partA, rule.attribute_a);
  const valB = rule.slot_b ? getAttr(partB, rule.attribute_b) : null;

  let triggered = false;

  switch (rule.operator) {
    case 'eq':
      triggered = valA !== valB;
      break;

    case 'eq_true':
      triggered = valA === true;
      break;

    case 'eq_false':
      triggered = valA === false;
      break;

    case 'lt':
      // ATF rules: slot_a attribute < threshold AND slot_b is selected
      if (rule.threshold !== undefined && rule.threshold !== null) {
        const isSelected = partB !== null && partB !== undefined;
        triggered = typeof valA === 'number' && valA < rule.threshold && isSelected;
      } else {
        triggered = valA >= valB; // handguard < barrel (inverted: fires when NOT less than)
      }
      break;

    case 'caliber_compatible':
      triggered = !caliberCompatible(valA, valB);
      break;

    case 'gas_block_clearance': {
      // handguard.gas_block_clearance vs gas_block.profile
      // 'low-profile-required' means gas block profile must be 'low-profile'
      if (valA === 'low-profile-required') {
        triggered = valB !== 'low-profile';
      } else {
        triggered = false; // 'standard' clearance accepts any profile
      }
      break;
    }

    case 'stock_tube_compatible': {
      // buffer tube spec vs stock tube spec
      // mil-spec tube accepts mil-spec stock
      // commercial tube accepts commercial stock
      // rifle tube accepts rifle stock
      triggered = valA !== valB;
      break;
    }

    case 'brace_tube_compatible': {
      // pistol brace tube_spec vs buffer tube spec
      // mil-spec braces like SBA3/SBA4 fit mil-spec tubes
      // pistol-spec braces fit pistol tubes
      triggered = valA !== valB;
      break;
    }

    case 'mutually_exclusive': {
      // both slots selected = violation
      const aSelected = partA !== null && partA !== undefined;
      const bSelected = partB !== null && partB !== undefined;
      triggered = aSelected && bSelected;
      break;
    }

    case 'mount_compatible': {
      // foregrip/light/bipod mount_type vs handguard mount_system
      // M-LOK mounts require M-LOK rails (or Picatinny with adapter)
      // Picatinny mounts work on Picatinny sections of any rail
      if (valA === 'Picatinny' && valB === 'M-LOK') {
        // Picatinny accessory on M-LOK rail — needs adapter, soft warning not hard block
        triggered = false;
      } else {
        triggered = valA !== valB;
      }
      break;
    }

    case 'buffer_gas_match': {
      // soft warning only: check if buffer type is recommended for gas system
      const gasSystem = selectedParts['barrel']?.attributes?.gas_system;
      if (!gasSystem) return null;
      triggered = !bufferGasMatch(valA, gasSystem);
      break;
    }

    case 'within_one_inch': {
      // soft warning: handguard within 1" of barrel
      if (typeof valA === 'number' && typeof valB === 'number') {
        triggered = (valB - valA) <= 1 && valA < valB;
      }
      break;
    }

    case 'suppressor_buffer_warning': {
      // soft: suppressor present + light buffer
      const isSuppressor = valA === 'suppressor';
      const bufferType = getAttr(selectedParts['buffer'], 'type');
      if (!isSuppressor || !bufferType) return null;
      const lightBuffers = ['carbine', 'pistol'];
      triggered = lightBuffers.includes(bufferType);
      break;
    }

    case 'twist_rate_info': {
      // info only: always surface when barrel selected
      triggered = true;
      break;
    }

    default:
      return null;
  }

  if (!triggered) return null;

  return {
    rule_id: rule.id,
    rule_type: rule.rule_type,
    message_short: rule.message_short,
    message_long: rule.message_long,
    atf_source_url: rule.atf_source_url || null,
    slot_a: rule.slot_a,
    slot_b: rule.slot_b,
  };
}

/**
 * Main evaluator — pure function.
 * @param {Object} selectedParts - { slotId: partObject | null }
 * @param {Array} rules - compatibility-rules.json array
 * @returns {{ hardBlocks, softWarnings, infoFlags, atfFlags }}
 */
export function evaluateBuild(selectedParts, rules) {
  const hardBlocks = [];
  const softWarnings = [];
  const infoFlags = [];
  const atfFlags = [];

  for (const rule of rules) {
    const result = evaluateRule(rule, selectedParts);
    if (!result) continue;

    switch (result.rule_type) {
      case 'hard':
        hardBlocks.push(result);
        break;
      case 'soft':
        softWarnings.push(result);
        break;
      case 'info':
        infoFlags.push(result);
        break;
      case 'atf':
        atfFlags.push(result);
        break;
    }
  }

  return { hardBlocks, softWarnings, infoFlags, atfFlags };
}

/**
 * Evaluate which conditional slots should be unlocked.
 * @param {Object} selectedParts
 * @param {Array} slotUnlocks - slot-unlocks.json array
 * @returns {string[]} array of unlocked slot IDs
 */
export function evaluateSlotUnlocks(selectedParts, slotUnlocks) {
  const unlocked = [];

  for (const unlock of slotUnlocks) {
    const triggerPart = selectedParts[unlock.trigger_slot];
    if (!triggerPart) continue;

    const attrVal = getAttr(triggerPart, unlock.trigger_attribute);
    let matches = false;

    switch (unlock.trigger_operator) {
      case 'eq':
        // Compare as string for JSON flexibility
        matches = String(attrVal) === String(unlock.trigger_value);
        break;
      case 'lt':
        matches = Number(attrVal) < Number(unlock.trigger_value);
        break;
      case 'gt':
        matches = Number(attrVal) > Number(unlock.trigger_value);
        break;
      case 'true':
        matches = attrVal === true || attrVal === 'true';
        break;
      case 'false':
        matches = attrVal === false || attrVal === 'false';
        break;
    }

    if (matches) {
      unlocked.push(unlock.unlocks_slot);
    }
  }

  return unlocked;
}

/**
 * Check which required slots are unfilled.
 * @param {Object} selectedParts
 * @param {Array} slots - slots.json array
 * @param {string[]} unlockedSlots - currently unlocked conditional slots
 * @returns {Array} array of unfilled slot objects
 */
export function getMissingRequiredSlots(selectedParts, slots, unlockedSlots) {
  return slots.filter((slot) => {
    if (!slot.is_required) return false;
    if (slot.is_conditional && !unlockedSlots.includes(slot.id)) return false;
    // If this slot belongs to a kit and the kit-level part is selected, it's covered
    if (slot.parent_kit_id && selectedParts[slot.parent_kit_id]) return false;
    return !selectedParts[slot.id];
  });
}

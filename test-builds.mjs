/**
 * test-builds.mjs
 * Node-compatible test script for the compatibility engine.
 * Runs 3 known builds and asserts expected results.
 * Run with: node test-builds.mjs
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, 'src/data');
const partsDir = join(dataDir, 'parts');

function load(path) {
  return JSON.parse(readFileSync(path, 'utf-8'));
}

const rules = load(join(dataDir, 'compatibility-rules.json'));

// ────────────────────────────────────────────────────────────
// Inline engine (mirrors compatibilityEngine.js exactly)
// ────────────────────────────────────────────────────────────

const CALIBER_COMPAT = {
  '5.56 NATO':  ['5.56 NATO', '.223 Wylde', '.223 Rem'],
  '.223 Wylde': ['5.56 NATO', '.223 Wylde', '.223 Rem'],
  '.223 Rem':   ['.223 Rem', '.223 Wylde'],
  '.300 BLK':   ['.300 BLK'],
  '6.5 Grendel': ['6.5 Grendel'],
  '.458 SOCOM':  ['.458 SOCOM'],
};

const GAS_BUFFER_COMPAT = {
  pistol:       ['pistol', 'carbine'],
  carbine:      ['pistol', 'carbine', 'H'],
  'mid-length': ['carbine', 'H', 'H2', 'hydraulic', 'captured'],
  rifle:        ['H', 'H2', 'H3', 'hydraulic'],
};

function caliberCompatible(a, b) {
  return (CALIBER_COMPAT[a] || [a]).includes(b);
}

function bufferGasMatch(type, gas) {
  return (GAS_BUFFER_COMPAT[gas] || []).includes(type);
}

function getAttr(part, attr) {
  if (!part) return undefined;
  if (attr === '_selected') return part !== null;
  return part.attributes?.[attr] ?? part[attr];
}

function evaluateRule(rule, sp) {
  const pA = sp[rule.slot_a];
  const pB = rule.slot_b ? sp[rule.slot_b] : null;
  if (!pA) return null;
  if (rule.slot_b && !pB &&
      !['eq_true','eq_false','lt'].includes(rule.operator)) return null;

  const vA = getAttr(pA, rule.attribute_a);
  const vB = rule.slot_b ? getAttr(pB, rule.attribute_b) : null;
  let triggered = false;

  switch (rule.operator) {
    case 'eq':                triggered = vA !== vB; break;
    case 'eq_true':           triggered = vA === true; break;
    case 'eq_false':          triggered = vA === false; break;
    case 'lt':
      if (rule.threshold != null) {
        const sel = pB !== null && pB !== undefined;
        triggered = typeof vA === 'number' && vA < rule.threshold && sel;
      } else {
        triggered = vA >= vB;
      }
      break;
    case 'caliber_compatible':  if (!pB) return null; triggered = !caliberCompatible(vA, vB); break;
    case 'gas_block_clearance': if (!pB) return null; triggered = vA === 'low-profile-required' && vB !== 'low-profile'; break;
    case 'stock_tube_compatible':  if (!pB) return null; triggered = vA !== vB; break;
    case 'brace_tube_compatible':  if (!pB) return null; triggered = vA !== vB; break;
    case 'mutually_exclusive':  triggered = !!pA && !!pB; break;
    case 'mount_compatible':
      if (!pB) return null;
      triggered = !(vA === 'Picatinny' && vB === 'M-LOK') && vA !== vB;
      break;
    case 'buffer_gas_match': {
      const gas = sp['barrel']?.attributes?.gas_system;
      if (!gas) return null;
      triggered = !bufferGasMatch(vA, gas);
      break;
    }
    case 'within_one_inch':
      if (!pB) return null;
      if (typeof vA === 'number' && typeof vB === 'number')
        triggered = (vB - vA) <= 1 && vA < vB;
      break;
    case 'suppressor_buffer_warning': {
      if (vA !== 'suppressor') return null;
      const bt = getAttr(sp['buffer'], 'type');
      if (!bt) return null;
      triggered = ['carbine','pistol'].includes(bt);
      break;
    }
    case 'twist_rate_info': triggered = true; break;
    default: return null;
  }

  if (!triggered) return null;
  return {
    rule_id: rule.id,
    rule_type: rule.rule_type,
    message_short: rule.message_short,
    slot_a: rule.slot_a,
    slot_b: rule.slot_b,
  };
}

function evaluateBuild(sp, rules) {
  const out = { hardBlocks: [], softWarnings: [], infoFlags: [], atfFlags: [] };
  for (const rule of rules) {
    const r = evaluateRule(rule, sp);
    if (!r) continue;
    switch (r.rule_type) {
      case 'hard': out.hardBlocks.push(r); break;
      case 'soft': out.softWarnings.push(r); break;
      case 'info': out.infoFlags.push(r); break;
      case 'atf':  out.atfFlags.push(r); break;
    }
  }
  return out;
}

// ────────────────────────────────────────────────────────────
// Part lookup helpers
// ────────────────────────────────────────────────────────────

function findPart(slotFile, id) {
  const parts = load(join(partsDir, slotFile));
  const p = parts.find(p => p.id === id);
  if (!p) throw new Error(`Part '${id}' not found in ${slotFile}`);
  return p;
}

// ────────────────────────────────────────────────────────────
// Build A: known-good — 16" mid-length 5.56, all matching parts
// Expected: zero hard blocks, zero ATF flags
// ────────────────────────────────────────────────────────────

const buildA = {
  'lower-receiver':  findPart('lower-receiver.json',  'aero-m4e1-stripped-lower'),
  'upper-receiver':  findPart('upper-receiver.json',  'aero-m4e1-upper'),
  'barrel':          findPart('barrel.json',           'ba-16-midlength-556'),
  'handguard':       findPart('handguard.json',        'mi-combat-rail-mlok-13'),   // 13" < 16" barrel ✓
  'gas-block':       findPart('gas-block.json',        'mi-gas-block-750-lp'),       // 0.750" matches barrel ✓
  'gas-tube':        findPart('gas-tube.json',         'brownells-midlength-gas-tube'), // mid-length matches ✓
  'bcg':             findPart('bcg.json',              'bcm-bcg-556-mpi'),            // 5.56 matches ✓
  'charging-handle': findPart('charging-handle.json',  'milspec-standard-ch'),
  'buffer-tube':     findPart('buffer-tube.json',      'aero-buffer-tube-milspec'),   // mil-spec ✓
  'buffer':          findPart('buffer.json',            'bcm-carbine-buffer-3oz'),
  'buffer-spring':   findPart('buffer-spring.json',    'standard-buffer-spring'),
  'stock':           findPart('stock.json',             'magpul-moe-sl-stock-milspec'), // mil-spec tube ✓
  'pistol-grip':     findPart('pistol-grip.json',      'magpul-moe-grip'),
  'lpk':             findPart('lpk.json',               'brownells-lpk-milspec'),
  'trigger':         findPart('trigger.json',           'mil-spec-trigger'),           // 0.154" pin ✓
  'hammer':          findPart('hammer.json',            'mil-spec-hammer'),            // 0.154" pin ✓
};

// ────────────────────────────────────────────────────────────
// Build B: .300 BLK BCG caliber mismatch
// Expected: exactly one hard block on barrel-bcg-caliber
// ────────────────────────────────────────────────────────────

const buildB = {
  ...buildA,
  'bcg': findPart('bcg.json', 'toolcraft-bcg-300blk'),  // .300 BLK BCG with 5.56 barrel → mismatch
};

// ────────────────────────────────────────────────────────────
// Build C: SBR — 7.5" pistol-gas 5.56 barrel + stock
// Expected: ATF SBR flag fires, zero hard blocks (all parts properly matched)
// ────────────────────────────────────────────────────────────

const buildC = {
  'lower-receiver':  findPart('lower-receiver.json',  'aero-m4e1-stripped-lower'),
  'upper-receiver':  findPart('upper-receiver.json',  'aero-m4e1-upper'),
  'barrel':          findPart('barrel.json',           'faxon-7-5-pistol-556'),       // 7.5" pistol gas, 0.625" journal
  'handguard':       findPart('handguard.json',        'mi-pistol-5-5-mlok'),            // 5.5" < 7.5" barrel ✓
  'gas-block':       findPart('gas-block.json',        'mi-gas-block-625-lp'),         // 0.625" journal matches ✓
  'gas-tube':        findPart('gas-tube.json',         'brownells-pistol-gas-tube'),    // pistol-length matches ✓
  'bcg':             findPart('bcg.json',              'bcm-bcg-556-mpi'),              // 5.56 matches ✓
  'charging-handle': findPart('charging-handle.json',  'milspec-standard-ch'),
  'buffer-tube':     findPart('buffer-tube.json',      'aero-buffer-tube-milspec'),    // mil-spec ✓
  'buffer':          findPart('buffer.json',            'bcm-carbine-buffer-3oz'),
  'buffer-spring':   findPart('buffer-spring.json',    'standard-buffer-spring'),
  'stock':           findPart('stock.json',             'magpul-moe-sl-stock-milspec'), // + short barrel → SBR flag ✓
  'pistol-grip':     findPart('pistol-grip.json',      'magpul-moe-grip'),
  'lpk':             findPart('lpk.json',               'brownells-lpk-milspec'),
  'trigger':         findPart('trigger.json',           'mil-spec-trigger'),
  'hammer':          findPart('hammer.json',            'mil-spec-hammer'),
};

// ────────────────────────────────────────────────────────────
// Run tests
// ────────────────────────────────────────────────────────────

let allPassed = true;

function runTest(label, build, assertions) {
  const result = evaluateBuild(build, rules);
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`TEST: ${label}`);
  console.log(`${'─'.repeat(60)}`);
  if (result.hardBlocks.length) {
    console.log(`  🔴 Hard blocks (${result.hardBlocks.length}):`);
    result.hardBlocks.forEach(b => console.log(`    [${b.rule_id}] ${b.message_short}`));
  }
  if (result.softWarnings.length) {
    console.log(`  🟡 Soft warnings (${result.softWarnings.length}):`);
    result.softWarnings.forEach(w => console.log(`    [${w.rule_id}] ${w.message_short}`));
  }
  if (result.atfFlags.length) {
    console.log(`  ⚠️  ATF flags (${result.atfFlags.length}):`);
    result.atfFlags.forEach(f => console.log(`    [${f.rule_id}] ${f.message_short}`));
  }
  if (result.infoFlags.length) {
    console.log(`  🔵 Info flags (${result.infoFlags.length}):`);
    result.infoFlags.forEach(f => console.log(`    [${f.rule_id}] ${f.message_short}`));
  }

  console.log('  Assertions:');
  for (const assertion of assertions) {
    const ok = assertion.fn(result);
    const status = ok ? '  ✅ PASS' : '  ❌ FAIL';
    console.log(`  ${status}: ${assertion.label}`);
    if (!ok) allPassed = false;
  }
  return result;
}

runTest('Build A — Known-Good 16" 5.56 Mil-Spec', buildA, [
  { label: 'Zero hard blocks',  fn: r => r.hardBlocks.length === 0 },
  { label: 'Zero ATF flags',    fn: r => r.atfFlags.length === 0 },
]);

runTest('Build B — .300 BLK BCG + 5.56 Barrel (Caliber Mismatch)', buildB, [
  { label: 'Exactly one hard block',              fn: r => r.hardBlocks.length === 1 },
  { label: 'Hard block is barrel-bcg-caliber',    fn: r => r.hardBlocks.some(b => b.rule_id === 'barrel-bcg-caliber') },
]);

runTest('Build C — SBR: 7.5" Barrel + Mil-Spec Stock (All Parts Matched)', buildC, [
  { label: 'ATF SBR flag fires',       fn: r => r.atfFlags.some(f => f.rule_id === 'atf-sbr') },
  { label: 'Zero hard blocks',          fn: r => r.hardBlocks.length === 0 },
  { label: 'Gas tube correctly matched',fn: r => !r.hardBlocks.some(b => b.rule_id === 'barrel-gas-tube-length') },
  { label: 'Gas block correctly matched',fn: r => !r.hardBlocks.some(b => b.rule_id === 'barrel-gas-block-journal') },
]);

console.log(`\n${'═'.repeat(60)}`);
console.log(allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED');
console.log(`${'═'.repeat(60)}\n`);
process.exit(allPassed ? 0 : 1);

#!/usr/bin/env node
/**
 * simulate-session.mjs
 *
 * Runs a round-robin session with given parameters and writes a JSON report.
 *
 * Usage:
 *   npm run simulate -- --players=12 --rounds=10 --mode=rotating [--out=report.json]
 *
 * Options:
 *   --players   Number of players (4–32, required)
 *   --rounds    Number of rounds (1–64, required)
 *   --mode      Partner mode: rotating | fixed (default: rotating)
 *   --out       Output file path (default: session-report.json)
 */

import { writeFileSync } from 'fs';
import { generateSchedule, validateConfig } from '../assets/js/session-manager.js';

// ── Parse args ────────────────────────────────────────────────────────────────

const args = Object.fromEntries(
  process.argv.slice(2)
    .filter(a => a.startsWith('--'))
    .map(a => {
      const [key, val] = a.slice(2).split('=');
      return [key, val];
    })
);

const playerCount = parseInt(args.players, 10);
const roundCount  = parseInt(args.rounds, 10);
const partnerMode = args.mode ?? 'rotating';
const outFile     = args.out ?? 'session-report.json';

// ── Validate ──────────────────────────────────────────────────────────────────

if (!args.players || !args.rounds) {
  console.error('Usage: npm run simulate -- --players=<n> --rounds=<n> [--mode=rotating|fixed] [--out=report.json]');
  process.exit(1);
}

const { valid, errors } = validateConfig({ playerCount, roundCount, partnerMode });
if (!valid) {
  console.error('Invalid config:');
  errors.forEach(e => console.error(`  ${e.field}: ${e.message}`));
  process.exit(1);
}

// ── Generate schedule ─────────────────────────────────────────────────────────

const players = Array.from({ length: playerCount }, (_, i) => `Player ${i + 1}`);
const config  = { playerCount, roundCount, partnerMode };
const schedule = generateSchedule(config, players);

// ── Aggregate results ─────────────────────────────────────────────────────────

// Bye counts per player
const byeCounts = Object.fromEntries(players.map(p => [p, 0]));
for (const round of schedule) {
  for (const p of round.byes) byeCounts[p]++;
}

// Partnership counts: how many times each pair has been partners
const partnershipCounts = {};
for (const round of schedule) {
  for (const match of round.matches) {
    for (const team of [match.team1, match.team2]) {
      const key = [...team].sort().join(' & ');
      partnershipCounts[key] = (partnershipCounts[key] ?? 0) + 1;
    }
  }
}

// Split into novel (count=1) and repeated (count>1)
const novelPairings   = Object.entries(partnershipCounts).filter(([, c]) => c === 1).map(([k]) => k);
const repeatedPairings = Object.entries(partnershipCounts)
  .filter(([, c]) => c > 1)
  .map(([pair, count]) => ({ pair, count }))
  .sort((a, b) => b.count - a.count);

// Per-round breakdown
const rounds = schedule.map(round => ({
  round: round.roundNum,
  matches: round.matches.map(m => ({
    court: m.courtNum,
    team1: m.team1.join(' & '),
    team2: m.team2.join(' & '),
  })),
  byes: round.byes,
}));

// ── Build report ──────────────────────────────────────────────────────────────

const totalPossiblePairs = (playerCount * (playerCount - 1)) / 2;
const uniquePairings = Object.keys(partnershipCounts).length;

const report = {
  config: { playerCount, roundCount, partnerMode, courtsPerRound: Math.floor(playerCount / 4) },
  summary: {
    totalRounds: roundCount,
    totalMatches: schedule.reduce((s, r) => s + r.matches.length, 0),
    uniquePairings,
    totalPossiblePairs,
    pairingCoverage: `${((uniquePairings / totalPossiblePairs) * 100).toFixed(1)}%`,
    repeatedPairingCount: repeatedPairings.length,
    byeDistribution: {
      min: Math.min(...Object.values(byeCounts)),
      max: Math.max(...Object.values(byeCounts)),
    },
  },
  byeCounts,
  repeatedPairings,
  novelPairings,
  rounds,
};

// ── Write output ──────────────────────────────────────────────────────────────

writeFileSync(outFile, JSON.stringify(report, null, 2));

console.log(`Session report written to ${outFile}`);
console.log(`  Players: ${playerCount} | Rounds: ${roundCount} | Mode: ${partnerMode}`);
console.log(`  Courts per round: ${Math.floor(playerCount / 4)} | Byes per round: ${playerCount % 4}`);
console.log(`  Pairing coverage: ${report.summary.pairingCoverage} (${uniquePairings}/${totalPossiblePairs} pairs)`);
console.log(`  Repeated pairings: ${repeatedPairings.length}`);
console.log(`  Bye distribution: min=${report.summary.byeDistribution.min} max=${report.summary.byeDistribution.max}`);

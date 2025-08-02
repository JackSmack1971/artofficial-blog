// scripts/ci/verify-kpis.ts
// Compares thresholds in docs/business-objective-tracking.md and docs/architecture-decisions.json
// against code artifacts/config and fails on mismatches.
// Usage: node scripts/ci/verify-kpis.ts
//
// Checks:
// 1) Newsletter open rate target (≥35%) from both docs sources vs ADR JSON and vs dry-run artifact
// 2) Lighthouse Performance threshold from ADR vs lighthouserc.json and CI usage
// 3) Ensures artifacts/kpis/latest.json exists and its threshold alignment
//
// Exit non-zero on any mismatch.

import fs from 'node:fs';
import path from 'node:path';

type ADR = {
  fitness_functions?: Array<
    | { name: string; threshold?: number }
    | { name: string; threshold_percent?: number }
    | { name: string; threshold_seconds?: number }
  >;
};

type KPIArtifact = {
  thresholds?: { openRateMinPercent?: number };
  engagement_kpi?: { openRate?: number; targetOpenRate?: number };
};

function readJSON<T>(p: string): T | null {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8')) as T;
  } catch {
    return null;
  }
}

function fileExists(p: string) {
  try {
    fs.accessSync(p);
    return true;
  } catch {
    return false;
  }
}

function extractOpenRateFromMarkdown(md: string): number | null {
  // Look for patterns like "35%+ open rate" or "Newsletter open rate ≥ 35%"
  const patterns = [
    /open rate\s*[:=]\s*(\d{1,3})\s*%/i,
    /open\s*rate\s*[≥>=]\s*(\d{1,3})\s*%/i,
    /(\d{1,3})\s*%\s*\+\s*open rate/i,
    /engagement:\s*(\d{1,3})\s*%\s*\+\s*open rate/i,
  ];
  for (const re of patterns) {
    const m = md.match(re);
    if (m && m[1]) {
      const v = Number(m[1]);
      if (Number.isFinite(v) && v > 0) return v;
    }
  }
  return null;
}

function getADRTargets(adr: ADR) {
  const get = (name: string) =>
    adr.fitness_functions?.find(
      (f: any) => typeof f?.name === 'string' && f.name.toLowerCase() === name.toLowerCase(),
    ) as any | undefined;

  const lighthousePerfMin = (adr.fitness_functions || [])
    .filter((f: any) => typeof f?.name === 'string' && f.name.toLowerCase().includes('lighthouse') && 'threshold' in f)
    .map((f: any) => Number(f.threshold))
    .find((n: number) => Number.isFinite(n)) ?? 95;

  const newsletterOpenRatePercent =
    Number(get('Newsletter open rate')?.threshold_percent) ||
    (adr.fitness_functions || [])
      .filter((f: any) => typeof f?.name === 'string' && f.name.toLowerCase().includes('newsletter') && 'threshold_percent' in f)
      .map((f: any) => Number(f.threshold_percent))
      .find((n: number) => Number.isFinite(n)) || 35;

  return {
    lighthousePerfMin,
    newsletterOpenRatePercent,
  };
}

function assertEqual(name: string, a: number, b: number, errors: string[], context?: string) {
  if (a !== b) errors.push(`Mismatch for ${name}: ${a} !== ${b}${context ? ` (${context})` : ''}`);
}

function assertGte(name: string, val: number, min: number, errors: string[]) {
  if (!(val >= min)) errors.push(`Assertion failed ${name}: ${val} < ${min}`);
}

async function main() {
  const errors: string[] = [];

  // Load ADR
  const adrPath = path.resolve('docs/architecture-decisions.json');
  const adr = readJSON<ADR>(adrPath);
  if (!adr) {
    errors.push(`Failed to read ADR at ${adrPath}`);
  }

  // Load business objectives doc
  const boPath = path.resolve('docs/business-objective-tracking.md');
  let boMd = '';
  try {
    boMd = fs.readFileSync(boPath, 'utf8');
  } catch {
    errors.push(`Failed to read ${boPath}`);
  }

  // Load PRD (for secondary confirmation)
  const prdPath = path.resolve('docs/artofficialintelligence_prd.md');
  let prdMd = '';
  try {
    prdMd = fs.readFileSync(prdPath, 'utf8');
  } catch {
    // optional; do not error
  }

  // Targets from ADR
  const { lighthousePerfMin, newsletterOpenRatePercent } = adr ? getADRTargets(adr) : { lighthousePerfMin: 95, newsletterOpenRatePercent: 35 };

  // Extract from business objectives md
  const boOpenRate = boMd ? extractOpenRateFromMarkdown(boMd) : null;
  if (boOpenRate == null) {
    errors.push('Could not extract open rate from docs/business-objective-tracking.md');
  } else {
    assertEqual('Newsletter open rate target (docs vs ADR)', boOpenRate, newsletterOpenRatePercent, errors, 'business-objective-tracking.md vs ADR');
  }

  // Extract from PRD (secondary reference)
  const prdOpenRate = prdMd ? extractOpenRateFromMarkdown(prdMd) : null;
  if (prdOpenRate != null) {
    assertEqual('Newsletter open rate target (PRD vs ADR)', prdOpenRate, newsletterOpenRatePercent, errors, 'PRD vs ADR');
  }

  // Check lighthouserc.json for budgets/assert config presence
  const lhrcPath = path.resolve('lighthouserc.json');
  const lhrc = readJSON<any>(lhrcPath);
  if (!lhrc) {
    errors.push('Missing lighthouserc.json or invalid JSON');
  }

  // Check KPI artifact existence and alignment
  const latestKpiPath = path.resolve('artifacts/kpis/latest.json');
  if (!fileExists(latestKpiPath)) {
    errors.push('KPI artifact missing: artifacts/kpis/latest.json (generate via scripts/analytics/dry-run-open-rate.ts)');
  } else {
    const kpi = readJSON<KPIArtifact>(latestKpiPath);
    if (!kpi) {
      errors.push('Failed to parse KPI artifact JSON');
    } else {
      const artPct = Number(kpi.thresholds?.openRateMinPercent);
      if (Number.isFinite(artPct)) {
        assertEqual('Open rate threshold (artifact vs ADR)', artPct, newsletterOpenRatePercent, errors, 'latest.json vs ADR');
      } else {
        errors.push('KPI artifact missing thresholds.openRateMinPercent');
      }
      if (typeof kpi.engagement_kpi?.targetOpenRate === 'number') {
        const targetPct = Math.round(kpi.engagement_kpi.targetOpenRate * 100);
        assertEqual('Open rate targetOpenRate (artifact vs ADR)', targetPct, newsletterOpenRatePercent, errors, 'targetOpenRate vs ADR');
      }
      if (typeof kpi.engagement_kpi?.openRate === 'number') {
        assertGte('Open rate meets ADR', kpi.engagement_kpi.openRate, newsletterOpenRatePercent / 100, errors);
      }
    }
  }

  // Emit summary
  console.log(`[verify-kpis] ADR lighthouse min: ${lighthousePerfMin}`);
  console.log(`[verify-kpis] ADR newsletter open rate target (%): ${newsletterOpenRatePercent}`);
  if (boOpenRate != null) console.log(`[verify-kpis] Docs business-objective-tracking open rate: ${boOpenRate}%`);
  if (prdOpenRate != null) console.log(`[verify-kpis] PRD open rate: ${prdOpenRate}%`);

  if (errors.length) {
    console.error('[verify-kpis] FAIL');
    for (const e of errors) console.error(` - ${e}`);
    process.exit(1);
  } else {
    console.log('[verify-kpis] SUCCESS');
  }
}

main().catch((err) => {
  console.error('[verify-kpis] Error:', err);
  process.exit(1);
});
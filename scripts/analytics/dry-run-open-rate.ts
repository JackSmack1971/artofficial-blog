// scripts/analytics/dry-run-open-rate.ts
// Emits an engagement_kpi artifact with targetOpenRate >= 35% (from docs) and a dry-run openRate
// Usage: node -r esbuild-register scripts/analytics/dry-run-open-rate.ts --openRate=0.36 --clickRate=0.08
// Fallbacks default to targets if not provided. Artifacts saved under artifacts/kpis/

import fs from 'node:fs';
import path from 'node:path';

type EngagementKPI = {
  timestamp: string;
  source: 'dry-run';
  engagement_kpi: {
    openRate: number;
    clickRate?: number;
    targetOpenRate: number;
    targetClickRate?: number;
    lcpMs?: number;
    cls?: number;
  };
  thresholds: {
    openRateMinPercent: number;
  };
  meetsTarget: boolean;
  notes?: string[];
};

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function readADRTargetOpenRate(): number {
  // Pull target from docs/architecture-decisions.json -> fitness_functions: Newsletter open rate threshold_percent
  const adrPath = path.resolve(process.cwd(), 'docs/architecture-decisions.json');
  try {
    const raw = fs.readFileSync(adrPath, 'utf8');
    const json = JSON.parse(raw);
    const ff = Array.isArray(json.fitness_functions) ? json.fitness_functions : [];
    const match = ff.find((f: any) => typeof f?.name === 'string' && f.name.toLowerCase().includes('newsletter open rate'));
    const percent = Number(match?.threshold_percent ?? 35);
    if (Number.isFinite(percent) && percent > 0) return percent / 100;
  } catch {
    // ignore and fallback
  }
  return 0.35;
}

function parseArg(name: string): string | undefined {
  // supports --key=value or --key value
  const idx = process.argv.findIndex((a) => a === `--${name}` || a.startsWith(`--${name}=`));
  if (idx === -1) return undefined;
  const token = process.argv[idx] as string | undefined;
  if (typeof token === 'string' && token.includes('=')) {
    return token.split('=').slice(1).join('=');
  }
  const next = process.argv[idx + 1];
  return typeof next === 'string' && !next.startsWith('--') ? next : undefined;
}

function toNumberOrUndefined(v?: string): number | undefined {
  if (v == null) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

async function main() {
  const targetOpenRate = readADRTargetOpenRate(); // e.g., 0.35
  const openRate = toNumberOrUndefined(parseArg('openRate')) ?? targetOpenRate; // default to target
  const clickRate = toNumberOrUndefined(parseArg('clickRate')); // optional
  const lcpMs = toNumberOrUndefined(parseArg('lcpMs'));
  const cls = toNumberOrUndefined(parseArg('cls'));

  const artifactDir = path.resolve(process.cwd(), 'artifacts', 'kpis');
  const historyDir = path.join(artifactDir, 'history');
  ensureDir(historyDir);

  const now = new Date();
  const iso = now.toISOString().replace(/[:.]/g, '-');
  const engagement: EngagementKPI['engagement_kpi'] = {
    openRate,
    targetOpenRate,
  };
  if (typeof clickRate === 'number') engagement.clickRate = clickRate;
  if (typeof lcpMs === 'number') engagement.lcpMs = lcpMs;
  if (typeof cls === 'number') engagement.cls = cls;

  const artifact: EngagementKPI = {
    timestamp: now.toISOString(),
    source: 'dry-run',
    engagement_kpi: engagement,
    thresholds: {
      openRateMinPercent: Math.round(targetOpenRate * 100),
    },
    meetsTarget: openRate >= targetOpenRate,
    notes: [
      'Dry-run artifact for engagement KPI verification',
      'Target derived from docs/architecture-decisions.json.fitness_functions[Newsletter open rate]',
      'Stored for CI artifact consumption and trend history',
    ],
  };

  const latestPath = path.join(artifactDir, 'latest.json');
  const historyPath = path.join(historyDir, `engagement_kpi_${iso}.json`);

  fs.writeFileSync(latestPath, JSON.stringify(artifact, null, 2));
  fs.writeFileSync(historyPath, JSON.stringify(artifact, null, 2));

  // Emit summary to stdout for CI logs
  const percent = (openRate * 100).toFixed(2);
  const targetPercent = (targetOpenRate * 100).toFixed(0);
  console.log(`[dry-run-open-rate] openRate=${percent}% target>=${targetPercent}% meetsTarget=${artifact.meetsTarget}`);
  console.log(`[dry-run-open-rate] artifacts: ${path.relative(process.cwd(), latestPath)}, ${path.relative(process.cwd(), historyPath)}`);

  // Non-zero exit if does not meet target when --enforce flag is passed
  const enforce = parseArg('enforce');
  if (enforce === 'true' || enforce === '1') {
    if (!artifact.meetsTarget) {
      console.error(`[dry-run-open-rate] Enforcement enabled and target not met. Failing.`);
      process.exit(1);
    }
  }
}

main().catch((err) => {
  console.error('[dry-run-open-rate] Error:', err);
  process.exit(1);
});
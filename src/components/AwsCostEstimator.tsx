import { useState } from 'preact/hooks';

// Simplified AWS pricing (USD/month approximations as of 2024)
const EC2_PRICES: Record<string, { vcpu: number; ram: string; price: number }> = {
  't3.micro':    { vcpu: 2,  ram: '1 GB',   price: 7.59 },
  't3.small':    { vcpu: 2,  ram: '2 GB',   price: 15.18 },
  't3.medium':   { vcpu: 2,  ram: '4 GB',   price: 30.37 },
  't3.large':    { vcpu: 2,  ram: '8 GB',   price: 60.74 },
  't3.xlarge':   { vcpu: 4,  ram: '16 GB',  price: 121.47 },
  't3.2xlarge':  { vcpu: 8,  ram: '32 GB',  price: 242.94 },
  'm5.large':    { vcpu: 2,  ram: '8 GB',   price: 69.12 },
  'm5.xlarge':   { vcpu: 4,  ram: '16 GB',  price: 138.24 },
  'm5.2xlarge':  { vcpu: 8,  ram: '32 GB',  price: 276.48 },
  'm5.4xlarge':  { vcpu: 16, ram: '64 GB',  price: 552.96 },
  'c5.large':    { vcpu: 2,  ram: '4 GB',   price: 61.20 },
  'c5.xlarge':   { vcpu: 4,  ram: '8 GB',   price: 122.40 },
  'c5.2xlarge':  { vcpu: 8,  ram: '16 GB',  price: 244.80 },
  'c5.4xlarge':  { vcpu: 16, ram: '32 GB',  price: 489.60 },
  'r5.large':    { vcpu: 2,  ram: '16 GB',  price: 90.72 },
  'r5.xlarge':   { vcpu: 4,  ram: '32 GB',  price: 181.44 },
  'r5.2xlarge':  { vcpu: 8,  ram: '64 GB',  price: 362.88 },
};

const RDS_PRICES: Record<string, { vcpu: number; ram: string; price: number }> = {
  'db.t3.micro':   { vcpu: 2, ram: '1 GB',  price: 14.64 },
  'db.t3.small':   { vcpu: 2, ram: '2 GB',  price: 29.20 },
  'db.t3.medium':  { vcpu: 2, ram: '4 GB',  price: 58.40 },
  'db.t3.large':   { vcpu: 2, ram: '8 GB',  price: 116.80 },
  'db.m5.large':   { vcpu: 2, ram: '8 GB',  price: 124.00 },
  'db.m5.xlarge':  { vcpu: 4, ram: '16 GB', price: 248.00 },
  'db.m5.2xlarge': { vcpu: 8, ram: '32 GB', price: 496.00 },
  'db.r5.large':   { vcpu: 2, ram: '16 GB', price: 175.20 },
  'db.r5.xlarge':  { vcpu: 4, ram: '32 GB', price: 350.40 },
};

interface Config {
  // EC2
  ec2Instance: string;
  ec2Count: number;
  ec2HoursPerMonth: number;
  // RDS
  rdsEnabled: boolean;
  rdsInstance: string;
  rdsStorageGb: number;
  rdsMultiAz: boolean;
  // S3
  s3Enabled: boolean;
  s3StorageGb: number;
  s3GetRequests: number;
  s3PutRequests: number;
  // CloudFront
  cfEnabled: boolean;
  cfTransferGb: number;
  cfRequests: number;
  // Load Balancer
  albEnabled: boolean;
  albHours: number;
  albLcus: number;
}

function fmt(n: number): string {
  return n.toFixed(2);
}

function calcCosts(cfg: Config) {
  const ec2Unit = EC2_PRICES[cfg.ec2Instance] || EC2_PRICES['t3.medium'];
  const hourlyRate = ec2Unit.price / 730;
  const ec2Cost = hourlyRate * cfg.ec2HoursPerMonth * cfg.ec2Count;

  let rdsCost = 0;
  if (cfg.rdsEnabled) {
    const rdsUnit = RDS_PRICES[cfg.rdsInstance] || RDS_PRICES['db.t3.medium'];
    rdsCost = rdsUnit.price * (cfg.rdsMultiAz ? 2 : 1) + cfg.rdsStorageGb * 0.115;
  }

  let s3Cost = 0;
  if (cfg.s3Enabled) {
    const storageCost = cfg.s3StorageGb * 0.023;
    const getCost = (cfg.s3GetRequests / 1000) * 0.0004;
    const putCost = (cfg.s3PutRequests / 1000) * 0.005;
    s3Cost = storageCost + getCost + putCost;
  }

  let cfCost = 0;
  if (cfg.cfEnabled) {
    const transferCost = cfg.cfTransferGb * 0.0085;
    const requestCost = (cfg.cfRequests / 10000) * 0.0075;
    cfCost = transferCost + requestCost;
  }

  let albCost = 0;
  if (cfg.albEnabled) {
    albCost = cfg.albHours * 0.008 + cfg.albLcus * 0.008;
  }

  const total = ec2Cost + rdsCost + s3Cost + cfCost + albCost;
  return { ec2Cost, rdsCost, s3Cost, cfCost, albCost, total };
}

function Num({ label, value, onChange, min = 0, step = 1 }: {
  label: string; value: number; onChange: (v: number) => void; min?: number; step?: number;
}) {
  return (
    <div>
      <label class="text-xs text-text-muted block mb-1">{label}</label>
      <input
        type="number"
        value={value}
        min={min}
        step={step}
        onInput={(e) => onChange(Number((e.target as HTMLInputElement).value))}
        class="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-primary"
      />
    </div>
  );
}

function Select({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void;
  options: [string, string][];
}) {
  return (
    <div>
      <label class="text-xs text-text-muted block mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange((e.target as HTMLSelectElement).value)}
        class="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-primary"
      >
        {options.map(([val, lbl]) => <option value={val}>{lbl}</option>)}
      </select>
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label class="flex items-center gap-2 cursor-pointer">
      <input type="checkbox" checked={checked} onChange={(e) => onChange((e.target as HTMLInputElement).checked)} class="sr-only" />
      <div class={`w-9 h-5 rounded-full transition-colors ${checked ? 'bg-primary' : 'bg-gray-700'} relative`}>
        <div class={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${checked ? 'translate-x-4' : 'translate-x-0.5'}`} />
      </div>
      <span class="text-sm font-medium text-text">{label}</span>
    </label>
  );
}

const DEFAULT: Config = {
  ec2Instance: 't3.medium',
  ec2Count: 1,
  ec2HoursPerMonth: 730,
  rdsEnabled: true,
  rdsInstance: 'db.t3.medium',
  rdsStorageGb: 50,
  rdsMultiAz: false,
  s3Enabled: true,
  s3StorageGb: 100,
  s3GetRequests: 100000,
  s3PutRequests: 10000,
  cfEnabled: false,
  cfTransferGb: 100,
  cfRequests: 1000000,
  albEnabled: false,
  albHours: 730,
  albLcus: 10,
};

export default function AwsCostEstimator() {
  const [cfg, setCfg] = useState<Config>(DEFAULT);
  const costs = calcCosts(cfg);

  function set<K extends keyof Config>(key: K, val: Config[K]) {
    setCfg(prev => ({ ...prev, [key]: val }));
  }

  const ec2Options = Object.entries(EC2_PRICES).map(([k, v]) => [k, `${k} (${v.vcpu} vCPU, ${v.ram}, ~$${fmt(v.price)}/mo)`] as [string, string]);
  const rdsOptions = Object.entries(RDS_PRICES).map(([k, v]) => [k, `${k} (${v.vcpu} vCPU, ${v.ram}, ~$${fmt(v.price)}/mo)`] as [string, string]);

  const breakdown = [
    { label: 'EC2 Compute', cost: costs.ec2Cost, enabled: true },
    { label: 'RDS Database', cost: costs.rdsCost, enabled: cfg.rdsEnabled },
    { label: 'S3 Storage', cost: costs.s3Cost, enabled: cfg.s3Enabled },
    { label: 'CloudFront CDN', cost: costs.cfCost, enabled: cfg.cfEnabled },
    { label: 'Load Balancer (ALB)', cost: costs.albCost, enabled: cfg.albEnabled },
  ].filter(b => b.enabled);

  return (
    <div class="space-y-6">
      <div class="grid gap-6 lg:grid-cols-2">
        {/* Config Panel */}
        <div class="space-y-5">
          {/* EC2 */}
          <div class="bg-bg-card border border-border rounded-xl p-4 space-y-3">
            <div class="text-sm font-semibold text-text">EC2 Instances</div>
            <Select label="Instance Type" value={cfg.ec2Instance} onChange={v => set('ec2Instance', v)} options={ec2Options} />
            <div class="grid grid-cols-2 gap-3">
              <Num label="Instance Count" value={cfg.ec2Count} onChange={v => set('ec2Count', v)} min={1} />
              <Num label="Hours / Month" value={cfg.ec2HoursPerMonth} onChange={v => set('ec2HoursPerMonth', Math.min(v, 730))} min={1} />
            </div>
            <div class="text-xs text-text-muted">730 hrs = full month. Use less for dev environments.</div>
          </div>

          {/* RDS */}
          <div class="bg-bg-card border border-border rounded-xl p-4 space-y-3">
            <Toggle label="RDS Database" checked={cfg.rdsEnabled} onChange={v => set('rdsEnabled', v)} />
            {cfg.rdsEnabled && (
              <>
                <Select label="Instance Class" value={cfg.rdsInstance} onChange={v => set('rdsInstance', v)} options={rdsOptions} />
                <div class="grid grid-cols-2 gap-3">
                  <Num label="Storage (GB)" value={cfg.rdsStorageGb} onChange={v => set('rdsStorageGb', v)} min={20} />
                </div>
                <label class="flex items-center gap-2 cursor-pointer text-sm text-text">
                  <input type="checkbox" checked={cfg.rdsMultiAz} onChange={(e) => set('rdsMultiAz', (e.target as HTMLInputElement).checked)} />
                  Multi-AZ (2× cost, high availability)
                </label>
              </>
            )}
          </div>

          {/* S3 */}
          <div class="bg-bg-card border border-border rounded-xl p-4 space-y-3">
            <Toggle label="S3 Storage" checked={cfg.s3Enabled} onChange={v => set('s3Enabled', v)} />
            {cfg.s3Enabled && (
              <div class="grid grid-cols-2 gap-3">
                <Num label="Storage (GB)" value={cfg.s3StorageGb} onChange={v => set('s3StorageGb', v)} min={1} />
                <Num label="GET Requests" value={cfg.s3GetRequests} onChange={v => set('s3GetRequests', v)} min={0} step={1000} />
                <Num label="PUT Requests" value={cfg.s3PutRequests} onChange={v => set('s3PutRequests', v)} min={0} step={1000} />
              </div>
            )}
          </div>

          {/* CloudFront */}
          <div class="bg-bg-card border border-border rounded-xl p-4 space-y-3">
            <Toggle label="CloudFront CDN" checked={cfg.cfEnabled} onChange={v => set('cfEnabled', v)} />
            {cfg.cfEnabled && (
              <div class="grid grid-cols-2 gap-3">
                <Num label="Transfer Out (GB)" value={cfg.cfTransferGb} onChange={v => set('cfTransferGb', v)} min={0} />
                <Num label="HTTP Requests" value={cfg.cfRequests} onChange={v => set('cfRequests', v)} min={0} step={100000} />
              </div>
            )}
          </div>

          {/* ALB */}
          <div class="bg-bg-card border border-border rounded-xl p-4 space-y-3">
            <Toggle label="Application Load Balancer" checked={cfg.albEnabled} onChange={v => set('albEnabled', v)} />
            {cfg.albEnabled && (
              <div class="grid grid-cols-2 gap-3">
                <Num label="Hours / Month" value={cfg.albHours} onChange={v => set('albHours', v)} min={1} />
                <Num label="LCU (capacity units)" value={cfg.albLcus} onChange={v => set('albLcus', v)} min={1} />
              </div>
            )}
          </div>
        </div>

        {/* Results Panel */}
        <div class="space-y-4">
          {/* Total */}
          <div class="bg-bg-card border border-primary/30 rounded-xl p-5">
            <div class="text-sm text-text-muted mb-1">Estimated Monthly Cost</div>
            <div class="text-5xl font-bold text-primary">${fmt(costs.total)}</div>
            <div class="text-xs text-text-muted mt-1">~${fmt(costs.total / 30)}/day · ~${fmt(costs.total / 730)}/hr</div>
          </div>

          {/* Breakdown */}
          <div class="bg-bg-card border border-border rounded-xl overflow-hidden">
            <div class="px-4 py-3 border-b border-border">
              <span class="text-sm font-semibold text-text">Cost Breakdown</span>
            </div>
            <div class="divide-y divide-border">
              {breakdown.map(b => (
                <div key={b.label} class="flex items-center justify-between px-4 py-3">
                  <span class="text-sm text-text">{b.label}</span>
                  <span class="text-sm font-mono font-semibold text-text">${fmt(b.cost)}</span>
                </div>
              ))}
              <div class="flex items-center justify-between px-4 py-3 bg-bg">
                <span class="text-sm font-bold text-text">Total</span>
                <span class="text-sm font-mono font-bold text-primary">${fmt(costs.total)}</span>
              </div>
            </div>
          </div>

          {/* Visual bar */}
          {costs.total > 0 && (
            <div class="bg-bg-card border border-border rounded-xl p-4 space-y-2">
              <div class="text-xs text-text-muted mb-2">Cost Distribution</div>
              {breakdown.map(b => (
                <div key={b.label} class="space-y-0.5">
                  <div class="flex justify-between text-xs text-text-muted">
                    <span>{b.label}</span>
                    <span>{((b.cost / costs.total) * 100).toFixed(1)}%</span>
                  </div>
                  <div class="h-1.5 bg-bg rounded-full overflow-hidden">
                    <div
                      class="h-full bg-primary rounded-full"
                      style={{ width: `${(b.cost / costs.total) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          <div class="bg-yellow-950/30 border border-yellow-800/40 rounded-xl p-4 text-xs text-yellow-300">
            <strong>Disclaimer:</strong> Estimates use simplified on-demand pricing. Actual costs vary with reserved instances, Savings Plans, data transfer, and region. Always verify with the <a href="https://calculator.aws/pricing/2/home" target="_blank" rel="noopener" class="underline">AWS Pricing Calculator</a>.
          </div>
        </div>
      </div>
    </div>
  );
}

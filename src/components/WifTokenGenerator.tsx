import { useState } from 'preact/hooks';

type CloudTab = 'gcp' | 'aws' | 'azure';

interface GcpConfig {
  projectNumber: string;
  poolId: string;
  providerId: string;
  serviceAccountEmail: string;
  location: string;
}

interface AwsConfig {
  roleArn: string;
  awsRegion: string;
  gcpProjectNumber: string;
  poolId: string;
  providerId: string;
  serviceAccountEmail: string;
}

interface AzureConfig {
  tenantId: string;
  clientId: string;
  gcpProjectNumber: string;
  poolId: string;
  providerId: string;
  serviceAccountEmail: string;
}

function generateGcpConfig(cfg: GcpConfig): object {
  const location = cfg.location || 'global';
  const projectNumber = cfg.projectNumber || 'PROJECT_NUMBER';
  const poolId = cfg.poolId || 'POOL_ID';
  const providerId = cfg.providerId || 'PROVIDER_ID';
  const saEmail = cfg.serviceAccountEmail || 'SERVICE_ACCOUNT@PROJECT.iam.gserviceaccount.com';

  return {
    type: 'external_account',
    audience: `//iam.googleapis.com/projects/${projectNumber}/locations/${location}/workloadIdentityPools/${poolId}/providers/${providerId}`,
    subject_token_type: 'urn:ietf:params:oauth:token-type:jwt',
    token_url: 'https://sts.googleapis.com/v1/token',
    service_account_impersonation_url: `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${saEmail}:generateAccessToken`,
    credential_source: {
      file: '/var/run/secrets/token',
      format: {
        type: 'json',
        subject_token_field_name: 'token'
      }
    }
  };
}

function generateAwsConfig(cfg: AwsConfig): object {
  const projectNumber = cfg.gcpProjectNumber || 'PROJECT_NUMBER';
  const poolId = cfg.poolId || 'POOL_ID';
  const providerId = cfg.providerId || 'PROVIDER_ID';
  const saEmail = cfg.serviceAccountEmail || 'SERVICE_ACCOUNT@PROJECT.iam.gserviceaccount.com';
  const roleArn = cfg.roleArn || 'arn:aws:iam::ACCOUNT_ID:role/ROLE_NAME';
  const region = cfg.awsRegion || 'us-east-1';

  return {
    type: 'external_account',
    audience: `//iam.googleapis.com/projects/${projectNumber}/locations/global/workloadIdentityPools/${poolId}/providers/${providerId}`,
    subject_token_type: 'urn:ietf:params:aws:token-type:aws4_request',
    token_url: 'https://sts.googleapis.com/v1/token',
    service_account_impersonation_url: `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${saEmail}:generateAccessToken`,
    credential_source: {
      environment_id: 'aws1',
      region_url: `http://169.254.169.254/latest/meta-data/placement/availability-zone`,
      url: `http://169.254.169.254/latest/meta-data/iam/security-credentials`,
      regional_cred_verification_url: `https://sts.${region}.amazonaws.com?Action=GetCallerIdentity&Version=2011-06-15`,
      imdsv2_session_token_url: 'http://169.254.169.254/latest/api/token'
    }
  };
}

function generateAzureConfig(cfg: AzureConfig): object {
  const projectNumber = cfg.gcpProjectNumber || 'PROJECT_NUMBER';
  const poolId = cfg.poolId || 'POOL_ID';
  const providerId = cfg.providerId || 'PROVIDER_ID';
  const saEmail = cfg.serviceAccountEmail || 'SERVICE_ACCOUNT@PROJECT.iam.gserviceaccount.com';
  const tenantId = cfg.tenantId || 'AZURE_TENANT_ID';
  const clientId = cfg.clientId || 'AZURE_CLIENT_ID';

  return {
    type: 'external_account',
    audience: `//iam.googleapis.com/projects/${projectNumber}/locations/global/workloadIdentityPools/${poolId}/providers/${providerId}`,
    subject_token_type: 'urn:ietf:params:oauth:token-type:jwt',
    token_url: 'https://sts.googleapis.com/v1/token',
    service_account_impersonation_url: `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${saEmail}:generateAccessToken`,
    credential_source: {
      url: `http://169.254.169.254/metadata/identity/oauth2/token?api-version=2018-02-01&resource=api://${clientId}`,
      headers: {
        Metadata: 'True'
      },
      format: {
        type: 'json',
        subject_token_field_name: 'access_token'
      }
    }
  };
}

const FIELD_CLASS = 'w-full text-sm bg-surface-alt border border-border rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent font-mono';
const LABEL_CLASS = 'block text-xs text-text-muted mb-0.5';

export default function WifTokenGenerator() {
  const [activeTab, setActiveTab] = useState<CloudTab>('gcp');
  const [copied, setCopied] = useState(false);

  const [gcpCfg, setGcpCfg] = useState<GcpConfig>({
    projectNumber: '',
    poolId: '',
    providerId: '',
    serviceAccountEmail: '',
    location: 'global',
  });

  const [awsCfg, setAwsCfg] = useState<AwsConfig>({
    roleArn: '',
    awsRegion: 'us-east-1',
    gcpProjectNumber: '',
    poolId: '',
    providerId: '',
    serviceAccountEmail: '',
  });

  const [azureCfg, setAzureCfg] = useState<AzureConfig>({
    tenantId: '',
    clientId: '',
    gcpProjectNumber: '',
    poolId: '',
    providerId: '',
    serviceAccountEmail: '',
  });

  function getOutput(): string {
    if (activeTab === 'gcp') return JSON.stringify(generateGcpConfig(gcpCfg), null, 2);
    if (activeTab === 'aws') return JSON.stringify(generateAwsConfig(awsCfg), null, 2);
    return JSON.stringify(generateAzureConfig(azureCfg), null, 2);
  }

  function copyOutput() {
    navigator.clipboard.writeText(getOutput()).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const output = getOutput();

  const tabs: { key: CloudTab; label: string }[] = [
    { key: 'gcp', label: 'GCP (OIDC / JWT)' },
    { key: 'aws', label: 'AWS (SigV4)' },
    { key: 'azure', label: 'Azure (Managed Identity)' },
  ];

  return (
    <div class="space-y-4">
      {/* Tab bar */}
      <div class="flex gap-2 flex-wrap">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => { setActiveTab(t.key); setCopied(false); }}
            class={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
              activeTab === t.key
                ? 'bg-accent/20 border-accent/50 text-accent'
                : 'border-border text-text-muted hover:bg-surface'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: inputs */}
        <div class="bg-surface border border-border rounded-lg p-4 space-y-3">
          {activeTab === 'gcp' && (
            <>
              <p class="text-xs text-text-muted">
                Generate <code class="font-mono bg-surface-alt px-1 rounded">credential_configuration.json</code> for GCP Workload Identity Federation with an OIDC / JWT provider.
              </p>
              <div>
                <label class={LABEL_CLASS}>GCP Project Number *</label>
                <input type="text" class={FIELD_CLASS} placeholder="123456789012"
                  value={gcpCfg.projectNumber}
                  onInput={e => setGcpCfg(p => ({ ...p, projectNumber: (e.target as HTMLInputElement).value }))} />
              </div>
              <div>
                <label class={LABEL_CLASS}>Workload Identity Pool ID *</label>
                <input type="text" class={FIELD_CLASS} placeholder="my-pool"
                  value={gcpCfg.poolId}
                  onInput={e => setGcpCfg(p => ({ ...p, poolId: (e.target as HTMLInputElement).value }))} />
              </div>
              <div>
                <label class={LABEL_CLASS}>Provider ID *</label>
                <input type="text" class={FIELD_CLASS} placeholder="my-oidc-provider"
                  value={gcpCfg.providerId}
                  onInput={e => setGcpCfg(p => ({ ...p, providerId: (e.target as HTMLInputElement).value }))} />
              </div>
              <div>
                <label class={LABEL_CLASS}>Service Account Email *</label>
                <input type="text" class={FIELD_CLASS} placeholder="sa@project.iam.gserviceaccount.com"
                  value={gcpCfg.serviceAccountEmail}
                  onInput={e => setGcpCfg(p => ({ ...p, serviceAccountEmail: (e.target as HTMLInputElement).value }))} />
              </div>
              <div>
                <label class={LABEL_CLASS}>Pool Location (usually global)</label>
                <input type="text" class={FIELD_CLASS} placeholder="global"
                  value={gcpCfg.location}
                  onInput={e => setGcpCfg(p => ({ ...p, location: (e.target as HTMLInputElement).value }))} />
              </div>
              <p class="text-xs text-text-muted pt-1">
                Save output as <code class="font-mono bg-surface-alt px-1 rounded">credential_configuration.json</code> and set <code class="font-mono bg-surface-alt px-1 rounded">GOOGLE_APPLICATION_CREDENTIALS</code> to its path.
              </p>
            </>
          )}

          {activeTab === 'aws' && (
            <>
              <p class="text-xs text-text-muted">
                Generate a WIF credential file that lets an AWS workload (EC2, Lambda, EKS) authenticate to GCP using SigV4 request signing.
              </p>
              <div>
                <label class={LABEL_CLASS}>GCP Project Number *</label>
                <input type="text" class={FIELD_CLASS} placeholder="123456789012"
                  value={awsCfg.gcpProjectNumber}
                  onInput={e => setAwsCfg(p => ({ ...p, gcpProjectNumber: (e.target as HTMLInputElement).value }))} />
              </div>
              <div>
                <label class={LABEL_CLASS}>Workload Identity Pool ID *</label>
                <input type="text" class={FIELD_CLASS} placeholder="my-aws-pool"
                  value={awsCfg.poolId}
                  onInput={e => setAwsCfg(p => ({ ...p, poolId: (e.target as HTMLInputElement).value }))} />
              </div>
              <div>
                <label class={LABEL_CLASS}>Provider ID *</label>
                <input type="text" class={FIELD_CLASS} placeholder="my-aws-provider"
                  value={awsCfg.providerId}
                  onInput={e => setAwsCfg(p => ({ ...p, providerId: (e.target as HTMLInputElement).value }))} />
              </div>
              <div>
                <label class={LABEL_CLASS}>Service Account Email *</label>
                <input type="text" class={FIELD_CLASS} placeholder="sa@project.iam.gserviceaccount.com"
                  value={awsCfg.serviceAccountEmail}
                  onInput={e => setAwsCfg(p => ({ ...p, serviceAccountEmail: (e.target as HTMLInputElement).value }))} />
              </div>
              <div>
                <label class={LABEL_CLASS}>AWS IAM Role ARN (for context)</label>
                <input type="text" class={FIELD_CLASS} placeholder="arn:aws:iam::123456789012:role/MyRole"
                  value={awsCfg.roleArn}
                  onInput={e => setAwsCfg(p => ({ ...p, roleArn: (e.target as HTMLInputElement).value }))} />
              </div>
              <div>
                <label class={LABEL_CLASS}>AWS Region</label>
                <input type="text" class={FIELD_CLASS} placeholder="us-east-1"
                  value={awsCfg.awsRegion}
                  onInput={e => setAwsCfg(p => ({ ...p, awsRegion: (e.target as HTMLInputElement).value }))} />
              </div>
              <p class="text-xs text-text-muted pt-1">
                The generated file uses IMDSv2 to fetch AWS credentials and exchange them for a GCP STS token via the WIF provider.
              </p>
            </>
          )}

          {activeTab === 'azure' && (
            <>
              <p class="text-xs text-text-muted">
                Generate a WIF credential file that lets an Azure workload (VM Managed Identity, AKS Pod Identity) authenticate to GCP without storing service account keys.
              </p>
              <div>
                <label class={LABEL_CLASS}>GCP Project Number *</label>
                <input type="text" class={FIELD_CLASS} placeholder="123456789012"
                  value={azureCfg.gcpProjectNumber}
                  onInput={e => setAzureCfg(p => ({ ...p, gcpProjectNumber: (e.target as HTMLInputElement).value }))} />
              </div>
              <div>
                <label class={LABEL_CLASS}>Workload Identity Pool ID *</label>
                <input type="text" class={FIELD_CLASS} placeholder="my-azure-pool"
                  value={azureCfg.poolId}
                  onInput={e => setAzureCfg(p => ({ ...p, poolId: (e.target as HTMLInputElement).value }))} />
              </div>
              <div>
                <label class={LABEL_CLASS}>Provider ID *</label>
                <input type="text" class={FIELD_CLASS} placeholder="my-azure-provider"
                  value={azureCfg.providerId}
                  onInput={e => setAzureCfg(p => ({ ...p, providerId: (e.target as HTMLInputElement).value }))} />
              </div>
              <div>
                <label class={LABEL_CLASS}>Service Account Email *</label>
                <input type="text" class={FIELD_CLASS} placeholder="sa@project.iam.gserviceaccount.com"
                  value={azureCfg.serviceAccountEmail}
                  onInput={e => setAzureCfg(p => ({ ...p, serviceAccountEmail: (e.target as HTMLInputElement).value }))} />
              </div>
              <div>
                <label class={LABEL_CLASS}>Azure Tenant ID</label>
                <input type="text" class={FIELD_CLASS} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  value={azureCfg.tenantId}
                  onInput={e => setAzureCfg(p => ({ ...p, tenantId: (e.target as HTMLInputElement).value }))} />
              </div>
              <div>
                <label class={LABEL_CLASS}>Azure Client ID (Managed Identity)</label>
                <input type="text" class={FIELD_CLASS} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  value={azureCfg.clientId}
                  onInput={e => setAzureCfg(p => ({ ...p, clientId: (e.target as HTMLInputElement).value }))} />
              </div>
              <p class="text-xs text-text-muted pt-1">
                Azure IMDS endpoint is queried at runtime to retrieve a JWT, which is exchanged for a GCP STS token via the WIF pool.
              </p>
            </>
          )}
        </div>

        {/* Right: output */}
        <div class="space-y-2">
          <div class="flex items-center gap-2">
            <span class="text-sm font-medium text-text-muted font-mono">credential_configuration.json</span>
            <button
              onClick={copyOutput}
              class="ml-auto text-sm px-3 py-1.5 border border-border rounded-lg hover:bg-surface transition-colors"
            >
              {copied ? '✓ Copied!' : 'Copy'}
            </button>
          </div>
          <pre class="w-full h-[480px] overflow-auto font-mono text-sm bg-surface border border-border rounded-lg p-4 text-text whitespace-pre">
{output}
          </pre>

          <div class="bg-surface border border-border rounded-lg p-3 space-y-1.5 text-xs text-text-muted">
            <p class="font-medium text-text">Field reference</p>
            {activeTab === 'gcp' && (
              <ul class="space-y-1 list-disc list-inside">
                <li><code class="font-mono">audience</code> — uniquely identifies your WIF provider; must match the provider's expected audience</li>
                <li><code class="font-mono">subject_token_type</code> — token format your provider issues (jwt for OIDC)</li>
                <li><code class="font-mono">token_url</code> — GCP STS endpoint that exchanges subject tokens for Google access tokens</li>
                <li><code class="font-mono">service_account_impersonation_url</code> — the SA to impersonate after token exchange</li>
                <li><code class="font-mono">credential_source.file</code> — path where your workload writes its identity token</li>
              </ul>
            )}
            {activeTab === 'aws' && (
              <ul class="space-y-1 list-disc list-inside">
                <li><code class="font-mono">subject_token_type</code> — aws4_request signals SigV4-signed GetCallerIdentity calls</li>
                <li><code class="font-mono">region_url</code> — IMDS endpoint used to determine AWS region automatically</li>
                <li><code class="font-mono">regional_cred_verification_url</code> — STS endpoint GCP uses to verify AWS identity</li>
                <li><code class="font-mono">imdsv2_session_token_url</code> — required for IMDSv2-only instances</li>
              </ul>
            )}
            {activeTab === 'azure' && (
              <ul class="space-y-1 list-disc list-inside">
                <li><code class="font-mono">url</code> — Azure IMDS endpoint; the resource param must match your GCP WIF provider's allowed audience</li>
                <li><code class="font-mono">headers.Metadata</code> — required header for Azure IMDS requests</li>
                <li><code class="font-mono">subject_token_field_name</code> — JSON field in the IMDS response containing the token</li>
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

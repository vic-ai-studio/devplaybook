import { useState } from 'preact/hooks';

type TargetCloud = 'gcp' | 'aws' | 'azure';
type SourceIdP = 'github-actions' | 'gitlab-ci' | 'kubernetes-sa' | 'terraform-cloud' | 'custom-oidc';
type OutputTab = 'config' | 'provider-setup' | 'workflow';

const CLOUD_LABELS: Record<TargetCloud, string> = {
  gcp: 'Google Cloud (GCP)',
  aws: 'Amazon Web Services (AWS)',
  azure: 'Microsoft Azure',
};

const IDP_LABELS: Record<SourceIdP, string> = {
  'github-actions': 'GitHub Actions',
  'gitlab-ci': 'GitLab CI',
  'kubernetes-sa': 'Kubernetes Service Account',
  'terraform-cloud': 'Terraform Cloud',
  'custom-oidc': 'Custom OIDC Provider',
};

interface GcpGithubFields {
  project_id: string;
  project_number: string;
  pool_id: string;
  provider_id: string;
  service_account: string;
  repo: string;
  branch_filter: string;
}

interface AwsGithubFields {
  account_id: string;
  role_name: string;
  repo: string;
  audience: string;
}

interface AzureGithubFields {
  tenant_id: string;
  subscription_id: string;
  client_id: string;
  app_name: string;
  repo: string;
}

interface GcpGitlabFields {
  project_id: string;
  project_number: string;
  pool_id: string;
  provider_id: string;
  service_account: string;
  gitlab_project: string;
}

interface GcpK8sFields {
  project_id: string;
  project_number: string;
  pool_id: string;
  provider_id: string;
  service_account: string;
  k8s_namespace: string;
  k8s_sa: string;
  issuer_url: string;
}

type FieldValues = GcpGithubFields | AwsGithubFields | AzureGithubFields | GcpGitlabFields | GcpK8sFields | Record<string, string>;

function getDefaultFields(cloud: TargetCloud, idp: SourceIdP): FieldValues {
  if (cloud === 'gcp' && idp === 'github-actions') {
    return {
      project_id: 'my-project',
      project_number: '123456789',
      pool_id: 'github-pool',
      provider_id: 'github-provider',
      service_account: 'github-actions@my-project.iam.gserviceaccount.com',
      repo: 'owner/repo',
      branch_filter: 'main',
    } as GcpGithubFields;
  }
  if (cloud === 'gcp' && idp === 'gitlab-ci') {
    return {
      project_id: 'my-project',
      project_number: '123456789',
      pool_id: 'gitlab-pool',
      provider_id: 'gitlab-provider',
      service_account: 'gitlab-ci@my-project.iam.gserviceaccount.com',
      gitlab_project: 'mygroup/myrepo',
    } as GcpGitlabFields;
  }
  if (cloud === 'gcp' && idp === 'kubernetes-sa') {
    return {
      project_id: 'my-project',
      project_number: '123456789',
      pool_id: 'k8s-pool',
      provider_id: 'k8s-provider',
      service_account: 'k8s-workload@my-project.iam.gserviceaccount.com',
      k8s_namespace: 'default',
      k8s_sa: 'my-service-account',
      issuer_url: 'https://oidc.eks.us-east-1.amazonaws.com/id/EXAMPLE',
    } as GcpK8sFields;
  }
  if (cloud === 'aws' && idp === 'github-actions') {
    return {
      account_id: '123456789012',
      role_name: 'GitHubActionsRole',
      repo: 'owner/repo',
      audience: 'sts.amazonaws.com',
    } as AwsGithubFields;
  }
  if (cloud === 'azure' && idp === 'github-actions') {
    return {
      tenant_id: '00000000-0000-0000-0000-000000000000',
      subscription_id: '00000000-0000-0000-0000-000000000001',
      client_id: '00000000-0000-0000-0000-000000000002',
      app_name: 'my-github-app',
      repo: 'owner/repo',
    } as AzureGithubFields;
  }
  // Generic fallback
  return {
    project_id: 'my-project',
    pool_id: 'my-pool',
    provider_id: 'my-provider',
    service_account: 'workload@my-project.iam.gserviceaccount.com',
    issuer_url: 'https://oidc.example.com',
    audience: 'sts.example.com',
  };
}

function getFieldLabels(cloud: TargetCloud, idp: SourceIdP): Record<string, string> {
  if (cloud === 'gcp' && idp === 'github-actions') {
    return {
      project_id: 'GCP Project ID',
      project_number: 'GCP Project Number',
      pool_id: 'Workload Identity Pool ID',
      provider_id: 'Workload Identity Provider ID',
      service_account: 'Service Account Email',
      repo: 'GitHub Repo (owner/repo)',
      branch_filter: 'Branch Filter (optional)',
    };
  }
  if (cloud === 'gcp' && idp === 'gitlab-ci') {
    return {
      project_id: 'GCP Project ID',
      project_number: 'GCP Project Number',
      pool_id: 'Workload Identity Pool ID',
      provider_id: 'Workload Identity Provider ID',
      service_account: 'Service Account Email',
      gitlab_project: 'GitLab Project Path (group/repo)',
    };
  }
  if (cloud === 'gcp' && idp === 'kubernetes-sa') {
    return {
      project_id: 'GCP Project ID',
      project_number: 'GCP Project Number',
      pool_id: 'Workload Identity Pool ID',
      provider_id: 'Workload Identity Provider ID',
      service_account: 'GCP Service Account Email',
      k8s_namespace: 'Kubernetes Namespace',
      k8s_sa: 'Kubernetes Service Account Name',
      issuer_url: 'OIDC Issuer URL',
    };
  }
  if (cloud === 'aws' && idp === 'github-actions') {
    return {
      account_id: 'AWS Account ID',
      role_name: 'IAM Role Name',
      repo: 'GitHub Repo (owner/repo)',
      audience: 'Audience (default: sts.amazonaws.com)',
    };
  }
  if (cloud === 'azure' && idp === 'github-actions') {
    return {
      tenant_id: 'Azure Tenant ID',
      subscription_id: 'Azure Subscription ID',
      client_id: 'App Registration Client ID',
      app_name: 'App Registration Name',
      repo: 'GitHub Repo (owner/repo)',
    };
  }
  return { project_id: 'Project ID', pool_id: 'Pool ID', provider_id: 'Provider ID', service_account: 'Service Account', issuer_url: 'Issuer URL', audience: 'Audience' };
}

function generateConfigFile(cloud: TargetCloud, idp: SourceIdP, fields: FieldValues): string {
  const f = fields as Record<string, string>;

  if (cloud === 'gcp' && (idp === 'github-actions' || idp === 'gitlab-ci')) {
    const audience = `//iam.googleapis.com/projects/${f.project_number}/locations/global/workloadIdentityPools/${f.pool_id}/providers/${f.provider_id}`;
    const config = {
      type: 'external_account',
      audience,
      subject_token_type: 'urn:ietf:params:oauth:token-type:id_token',
      token_url: 'https://sts.googleapis.com/v1/token',
      service_account_impersonation_url: `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${f.service_account}:generateAccessToken`,
      credential_source: {
        file: idp === 'github-actions' ? '${ACTIONS_ID_TOKEN_REQUEST_TOKEN}' : '${CI_JOB_JWT_V2}',
        format: {
          type: 'json',
          subject_token_field_name: 'value',
        },
      },
    };
    return JSON.stringify(config, null, 2);
  }

  if (cloud === 'gcp' && idp === 'kubernetes-sa') {
    const audience = `//iam.googleapis.com/projects/${f.project_number}/locations/global/workloadIdentityPools/${f.pool_id}/providers/${f.provider_id}`;
    const config = {
      type: 'external_account',
      audience,
      subject_token_type: 'urn:ietf:params:oauth:token-type:jwt',
      token_url: 'https://sts.googleapis.com/v1/token',
      service_account_impersonation_url: `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${f.service_account}:generateAccessToken`,
      credential_source: {
        file: '/var/run/secrets/kubernetes.io/serviceaccount/token',
        format: { type: 'text' },
      },
    };
    return JSON.stringify(config, null, 2);
  }

  if (cloud === 'aws' && idp === 'github-actions') {
    return `# AWS IAM Trust Policy (attach to role: ${f.role_name})
# Save as trust-policy.json and run the Provider Setup commands

{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::${f.account_id}:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "${f.audience}",
          "token.actions.githubusercontent.com:sub": "repo:${f.repo}:ref:refs/heads/main"
        }
      }
    }
  ]
}`;
  }

  if (cloud === 'azure' && idp === 'github-actions') {
    return `# Azure Federated Credential Configuration
# Apply via Azure CLI commands in the Provider Setup tab

{
  "name": "github-actions-federated",
  "issuer": "https://token.actions.githubusercontent.com",
  "subject": "repo:${f.repo}:ref:refs/heads/main",
  "description": "GitHub Actions federated identity for ${f.repo}",
  "audiences": [
    "api://AzureADTokenExchange"
  ]
}`;
  }

  return `# Configuration not available for this combination yet.\n# Cloud: ${cloud}, IdP: ${idp}`;
}

function generateProviderSetup(cloud: TargetCloud, idp: SourceIdP, fields: FieldValues): string {
  const f = fields as Record<string, string>;

  if (cloud === 'gcp' && idp === 'github-actions') {
    return `# Step 1: Enable required APIs
gcloud services enable iamcredentials.googleapis.com \\
  --project="${f.project_id}"

# Step 2: Create Workload Identity Pool
gcloud iam workload-identity-pools create "${f.pool_id}" \\
  --project="${f.project_id}" \\
  --location="global" \\
  --display-name="GitHub Actions Pool"

# Step 3: Create OIDC Provider
gcloud iam workload-identity-pools providers create-oidc "${f.provider_id}" \\
  --project="${f.project_id}" \\
  --location="global" \\
  --workload-identity-pool="${f.pool_id}" \\
  --display-name="GitHub Actions Provider" \\
  --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository" \\
  --issuer-uri="https://token.actions.githubusercontent.com"${f.branch_filter ? ` \\
  --attribute-condition="assertion.ref=='refs/heads/${f.branch_filter}'"` : ''}

# Step 4: Allow the GitHub repo to impersonate the service account
gcloud iam service-accounts add-iam-policy-binding "${f.service_account}" \\
  --project="${f.project_id}" \\
  --role="roles/iam.workloadIdentityUser" \\
  --member="principalSet://iam.googleapis.com/projects/${f.project_number}/locations/global/workloadIdentityPools/${f.pool_id}/attribute.repository/${f.repo}"`;
  }

  if (cloud === 'gcp' && idp === 'gitlab-ci') {
    return `# Step 1: Enable required APIs
gcloud services enable iamcredentials.googleapis.com \\
  --project="${f.project_id}"

# Step 2: Create Workload Identity Pool
gcloud iam workload-identity-pools create "${f.pool_id}" \\
  --project="${f.project_id}" \\
  --location="global" \\
  --display-name="GitLab CI Pool"

# Step 3: Create OIDC Provider for GitLab
gcloud iam workload-identity-pools providers create-oidc "${f.provider_id}" \\
  --project="${f.project_id}" \\
  --location="global" \\
  --workload-identity-pool="${f.pool_id}" \\
  --display-name="GitLab CI Provider" \\
  --attribute-mapping="google.subject=assertion.sub,attribute.project_path=assertion.project_path" \\
  --issuer-uri="https://gitlab.com"

# Step 4: Allow the GitLab project to impersonate the service account
gcloud iam service-accounts add-iam-policy-binding "${f.service_account}" \\
  --project="${f.project_id}" \\
  --role="roles/iam.workloadIdentityUser" \\
  --member="principalSet://iam.googleapis.com/projects/${f.project_number}/locations/global/workloadIdentityPools/${f.pool_id}/attribute.project_path/${f.gitlab_project}"`;
  }

  if (cloud === 'gcp' && idp === 'kubernetes-sa') {
    return `# Step 1: Create Workload Identity Pool
gcloud iam workload-identity-pools create "${f.pool_id}" \\
  --project="${f.project_id}" \\
  --location="global" \\
  --display-name="Kubernetes Pool"

# Step 2: Create OIDC Provider
gcloud iam workload-identity-pools providers create-oidc "${f.provider_id}" \\
  --project="${f.project_id}" \\
  --location="global" \\
  --workload-identity-pool="${f.pool_id}" \\
  --display-name="Kubernetes Provider" \\
  --attribute-mapping="google.subject=assertion.sub" \\
  --issuer-uri="${f.issuer_url}"

# Step 3: Bind to service account
gcloud iam service-accounts add-iam-policy-binding "${f.service_account}" \\
  --project="${f.project_id}" \\
  --role="roles/iam.workloadIdentityUser" \\
  --member="principal://iam.googleapis.com/projects/${f.project_number}/locations/global/workloadIdentityPools/${f.pool_id}/subject/system:serviceaccount:${f.k8s_namespace}:${f.k8s_sa}"

# Step 4: Annotate the Kubernetes Service Account
kubectl annotate serviceaccount "${f.k8s_sa}" \\
  --namespace="${f.k8s_namespace}" \\
  iam.gke.io/gcp-service-account="${f.service_account}"`;
  }

  if (cloud === 'aws' && idp === 'github-actions') {
    return `# Step 1: Create OIDC Identity Provider in AWS
aws iam create-open-id-connect-provider \\
  --url "https://token.actions.githubusercontent.com" \\
  --client-id-list "sts.amazonaws.com" \\
  --thumbprint-list "6938fd4d98bab03faadb97b34396831e3780aea1"

# Step 2: Create IAM Role with trust policy
# (Save the Config File tab content as trust-policy.json first)
aws iam create-role \\
  --role-name "${f.role_name}" \\
  --assume-role-policy-document file://trust-policy.json

# Step 3: Attach required permissions to the role
aws iam attach-role-policy \\
  --role-name "${f.role_name}" \\
  --policy-arn "arn:aws:iam::aws:policy/ReadOnlyAccess"
# Replace ReadOnlyAccess with your actual required policy

# Step 4: Verify the OIDC provider was created
aws iam list-open-id-connect-providers`;
  }

  if (cloud === 'azure' && idp === 'github-actions') {
    return `# Step 1: Create App Registration (if it doesn't exist)
az ad app create --display-name "${f.app_name}"

# Step 2: Get the App ID (client_id)
az ad app list --display-name "${f.app_name}" \\
  --query "[].appId" -o tsv

# Step 3: Create Service Principal
az ad sp create --id "${f.client_id}"

# Step 4: Assign role to Service Principal
az role assignment create \\
  --assignee "${f.client_id}" \\
  --role "Contributor" \\
  --scope "/subscriptions/${f.subscription_id}"

# Step 5: Add federated credential
# (Save the Config File tab content as federated-credential.json first)
az ad app federated-credential create \\
  --id "${f.client_id}" \\
  --parameters federated-credential.json`;
  }

  return `# Provider setup commands not available for this combination.\n# Cloud: ${cloud}, IdP: ${idp}`;
}

function generateWorkflowSnippet(cloud: TargetCloud, idp: SourceIdP, fields: FieldValues): string {
  const f = fields as Record<string, string>;

  if (cloud === 'gcp' && idp === 'github-actions') {
    const audience = `//iam.googleapis.com/projects/${f.project_number}/locations/global/workloadIdentityPools/${f.pool_id}/providers/${f.provider_id}`;
    return `name: Deploy to GCP

on:
  push:
    branches: [${f.branch_filter || 'main'}]

permissions:
  id-token: write   # Required for OIDC token request
  contents: read

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Authenticate to Google Cloud
        uses: google-github-actions/auth@v2
        with:
          workload_identity_provider: '${audience}'
          service_account: '${f.service_account}'

      - name: Set up Cloud SDK
        uses: google-github-actions/setup-gcloud@v2

      - name: Deploy
        run: |
          gcloud run deploy my-service \\
            --image gcr.io/${f.project_id}/my-image \\
            --region us-central1 \\
            --project ${f.project_id}`;
  }

  if (cloud === 'gcp' && idp === 'gitlab-ci') {
    return `# .gitlab-ci.yml

stages:
  - deploy

deploy_to_gcp:
  stage: deploy
  image: google/cloud-sdk:alpine
  id_tokens:
    GCP_OIDC_TOKEN:
      aud: https://iam.googleapis.com/projects/${f.project_number}/locations/global/workloadIdentityPools/${f.pool_id}/providers/${f.provider_id}
  script:
    - echo \${GCP_OIDC_TOKEN} > /tmp/oidc_token.json
    - gcloud auth login --cred-file=/tmp/oidc_token.json
    - gcloud config set project ${f.project_id}
    - gcloud run deploy my-service --image gcr.io/${f.project_id}/my-image --region us-central1
  only:
    - main`;
  }

  if (cloud === 'gcp' && idp === 'kubernetes-sa') {
    return `# Kubernetes Pod spec — attach service account with WIF annotation
apiVersion: v1
kind: ServiceAccount
metadata:
  name: ${f.k8s_sa}
  namespace: ${f.k8s_namespace}
  annotations:
    iam.gke.io/gcp-service-account: ${f.service_account}
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  template:
    spec:
      serviceAccountName: ${f.k8s_sa}
      containers:
        - name: my-app
          image: gcr.io/${f.project_id}/my-image
          env:
            - name: GOOGLE_APPLICATION_CREDENTIALS
              value: /var/run/secrets/workload-identity/token
          volumeMounts:
            - name: workload-identity-token
              mountPath: /var/run/secrets/workload-identity
      volumes:
        - name: workload-identity-token
          projected:
            sources:
              - serviceAccountToken:
                  audience: ${f.project_id}.svc.id.goog
                  path: token`;
  }

  if (cloud === 'aws' && idp === 'github-actions') {
    return `name: Deploy to AWS

on:
  push:
    branches: [main]

permissions:
  id-token: write   # Required for OIDC token request
  contents: read

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Configure AWS Credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::${f.account_id}:role/${f.role_name}
          role-session-name: GitHubActionsSession
          aws-region: us-east-1
          audience: ${f.audience}

      - name: Verify AWS identity
        run: aws sts get-caller-identity

      - name: Deploy
        run: |
          aws s3 sync ./dist s3://my-bucket
          # Replace with your actual deploy command`;
  }

  if (cloud === 'azure' && idp === 'github-actions') {
    return `name: Deploy to Azure

on:
  push:
    branches: [main]

permissions:
  id-token: write   # Required for OIDC token request
  contents: read

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Azure Login (OIDC)
        uses: azure/login@v2
        with:
          client-id: \${{ secrets.AZURE_CLIENT_ID }}      # ${f.client_id}
          tenant-id: \${{ secrets.AZURE_TENANT_ID }}      # ${f.tenant_id}
          subscription-id: \${{ secrets.AZURE_SUBSCRIPTION_ID }} # ${f.subscription_id}

      # Add these secrets to GitHub:
      # AZURE_CLIENT_ID = ${f.client_id}
      # AZURE_TENANT_ID = ${f.tenant_id}
      # AZURE_SUBSCRIPTION_ID = ${f.subscription_id}

      - name: Deploy to Azure App Service
        run: |
          az webapp deploy --resource-group my-rg --name my-app --src-path ./dist`;
  }

  return `# Workflow snippet not available for this combination.\n# Cloud: ${cloud}, IdP: ${idp}`;
}

export default function WorkloadIdentityFederationConfig() {
  const [cloud, setCloud] = useState<TargetCloud>('gcp');
  const [idp, setIdp] = useState<SourceIdP>('github-actions');
  const [fields, setFields] = useState<FieldValues>(getDefaultFields('gcp', 'github-actions'));
  const [activeTab, setActiveTab] = useState<OutputTab>('config');
  const [copied, setCopied] = useState(false);

  function handleCloudChange(newCloud: TargetCloud) {
    setCloud(newCloud);
    setFields(getDefaultFields(newCloud, idp));
    setActiveTab('config');
  }

  function handleIdpChange(newIdp: SourceIdP) {
    setIdp(newIdp);
    setFields(getDefaultFields(cloud, newIdp));
    setActiveTab('config');
  }

  function updateField(key: string, value: string) {
    setFields(f => ({ ...(f as Record<string, string>), [key]: value }));
  }

  const fieldLabels = getFieldLabels(cloud, idp);
  const fieldKeys = Object.keys(fieldLabels);
  const fieldValues = fields as Record<string, string>;

  const tabContent: Record<OutputTab, string> = {
    config: generateConfigFile(cloud, idp, fields),
    'provider-setup': generateProviderSetup(cloud, idp, fields),
    workflow: generateWorkflowSnippet(cloud, idp, fields),
  };

  const output = tabContent[activeTab];

  function copy() {
    navigator.clipboard.writeText(output).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const tabLabels: Record<OutputTab, string> = {
    config: 'Config File',
    'provider-setup': 'Provider Setup',
    workflow: idp === 'gitlab-ci' ? 'GitLab CI YAML' : idp === 'kubernetes-sa' ? 'K8s Manifest' : 'GitHub Actions YAML',
  };

  const isSupported = !(
    (cloud === 'aws' && idp !== 'github-actions') ||
    (cloud === 'azure' && idp !== 'github-actions') ||
    (cloud === 'gcp' && idp === 'terraform-cloud') ||
    (cloud === 'gcp' && idp === 'custom-oidc')
  );

  return (
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left panel — configuration */}
      <div class="space-y-5">
        <div class="p-4 rounded-xl border border-border bg-surface">
          <h3 class="text-sm font-semibold mb-3 text-text">Cloud & Identity Provider</h3>
          <div class="space-y-3">
            <div>
              <label class="block text-xs font-medium text-text-muted mb-1">Target Cloud</label>
              <select
                value={cloud}
                onChange={e => handleCloudChange((e.target as HTMLSelectElement).value as TargetCloud)}
                class="w-full px-3 py-2 rounded-lg bg-surface-alt border border-border text-text text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              >
                {(Object.keys(CLOUD_LABELS) as TargetCloud[]).map(c => (
                  <option key={c} value={c}>{CLOUD_LABELS[c]}</option>
                ))}
              </select>
            </div>
            <div>
              <label class="block text-xs font-medium text-text-muted mb-1">Source Identity Provider</label>
              <select
                value={idp}
                onChange={e => handleIdpChange((e.target as HTMLSelectElement).value as SourceIdP)}
                class="w-full px-3 py-2 rounded-lg bg-surface-alt border border-border text-text text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              >
                {(Object.keys(IDP_LABELS) as SourceIdP[]).map(i => (
                  <option key={i} value={i}>{IDP_LABELS[i]}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {!isSupported ? (
          <div class="p-4 rounded-xl border border-border bg-surface text-sm text-text-muted">
            <p class="font-medium text-text mb-1">Coming soon</p>
            <p>Configuration for <strong>{CLOUD_LABELS[cloud]}</strong> + <strong>{IDP_LABELS[idp]}</strong> is not yet supported. Try GitHub Actions as the source, or GCP as the target cloud.</p>
          </div>
        ) : (
          <div class="p-4 rounded-xl border border-border bg-surface">
            <h3 class="text-sm font-semibold mb-3 text-text">Configuration Fields</h3>
            <div class="space-y-3">
              {fieldKeys.map(key => (
                <div key={key}>
                  <label class="block text-xs font-medium text-text-muted mb-1">{fieldLabels[key]}</label>
                  <input
                    type="text"
                    value={fieldValues[key] || ''}
                    onInput={e => updateField(key, (e.target as HTMLInputElement).value)}
                    class="w-full px-3 py-2 rounded-lg bg-surface-alt border border-border text-text text-sm font-mono focus:outline-none focus:ring-2 focus:ring-accent"
                    placeholder={fieldLabels[key]}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        <div class="p-3 rounded-xl bg-accent/5 border border-accent/20 text-xs text-text-muted">
          <p class="font-medium text-text mb-1">Security Note</p>
          <p>Workload Identity Federation eliminates long-lived service account keys. Tokens are short-lived (&lt;1h) and tied to the specific workload identity — no secrets to rotate or leak.</p>
        </div>
      </div>

      {/* Right panel — output */}
      <div class="space-y-3">
        <div class="flex items-center justify-between">
          <div class="flex gap-1 bg-surface-alt border border-border rounded-lg p-1">
            {(Object.keys(tabLabels) as OutputTab[]).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                class={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${activeTab === tab ? 'bg-accent text-white' : 'text-text-muted hover:text-text'}`}
              >
                {tabLabels[tab]}
              </button>
            ))}
          </div>
          <button
            onClick={copy}
            class="text-sm px-3 py-1.5 rounded-lg bg-surface border border-border hover:border-accent transition-colors text-text"
          >
            {copied ? '✓ Copied!' : 'Copy'}
          </button>
        </div>

        <pre class="font-mono text-sm bg-surface border border-border rounded-lg p-4 h-[480px] overflow-auto text-text whitespace-pre-wrap">{output}</pre>

        <div class="p-3 rounded-lg bg-surface border border-border text-xs text-text-muted space-y-1">
          <p class="font-medium text-text">
            {cloud === 'gcp' ? 'GCP' : cloud === 'aws' ? 'AWS' : 'Azure'} + {IDP_LABELS[idp]}
          </p>
          <p>
            {cloud === 'gcp' && 'No service account key JSON stored. The workflow exchanges an OIDC token for a short-lived GCP access token via STS.'}
            {cloud === 'aws' && 'No AWS access keys stored. The workflow uses OIDC to call sts:AssumeRoleWithWebIdentity for temporary credentials.'}
            {cloud === 'azure' && 'No client secret stored. The workflow uses federated credentials to exchange the OIDC token for an Azure access token.'}
          </p>
        </div>
      </div>
    </div>
  );
}

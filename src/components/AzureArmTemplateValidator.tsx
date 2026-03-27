import { useState } from 'preact/hooks';

type ValidationIssue = {
  level: 'error' | 'warning' | 'info';
  message: string;
};

const SAMPLE_ARM = `{
  "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#",
  "contentVersion": "1.0.0.0",
  "parameters": {
    "storageAccountName": {
      "type": "string",
      "minLength": 3,
      "maxLength": 24
    },
    "adminPassword": {
      "type": "securestring"
    }
  },
  "variables": {
    "location": "[resourceGroup().location]"
  },
  "resources": [
    {
      "type": "Microsoft.Storage/storageAccounts",
      "apiVersion": "2021-06-01",
      "name": "[parameters('storageAccountName')]",
      "location": "[variables('location')]",
      "sku": {
        "name": "Standard_LRS"
      },
      "kind": "StorageV2"
    }
  ],
  "outputs": {}
}`;

// Known valid $schema values for ARM templates
const VALID_SCHEMAS = [
  'https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#',
  'https://schema.management.azure.com/schemas/2015-01-01/deploymentTemplate.json#',
  'https://schema.management.azure.com/schemas/2018-05-01/subscriptionDeploymentTemplate.json#',
  'https://schema.management.azure.com/schemas/2019-08-01/managementGroupDeploymentTemplate.json#',
  'https://schema.management.azure.com/schemas/2019-08-01/tenantDeploymentTemplate.json#',
];

const DEPRECATED_API_VERSIONS: Record<string, string> = {
  'Microsoft.Storage/storageAccounts': '2015-06-15',
  'Microsoft.Compute/virtualMachines': '2015-06-15',
  'Microsoft.Network/virtualNetworks': '2015-06-15',
};

function validateArmTemplate(jsonStr: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!jsonStr.trim()) {
    return [{ level: 'error', message: 'Empty input. Paste an Azure ARM template JSON to validate.' }];
  }

  // Parse JSON
  let template: any;
  try {
    template = JSON.parse(jsonStr);
  } catch (e: any) {
    return [{ level: 'error', message: `Invalid JSON: ${e.message}. ARM templates are JSON — fix the syntax first.` }];
  }

  // $schema
  if (!template['$schema']) {
    issues.push({ level: 'error', message: 'Missing "$schema" field. ARM templates require a $schema declaration (e.g. https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#).' });
  } else {
    const schema = template['$schema'];
    const isKnown = VALID_SCHEMAS.some(s => schema.includes(s.split('#')[0]));
    if (!isKnown) {
      issues.push({ level: 'warning', message: `$schema "${schema}" is not a standard ARM template schema. Verify it matches your deployment scope (resource group, subscription, management group, tenant).` });
    }
    if (schema.includes('2015-01-01')) {
      issues.push({ level: 'warning', message: '$schema uses the legacy 2015-01-01 schema. Upgrade to 2019-04-01 for the latest ARM features.' });
    }
  }

  // contentVersion
  if (!template.contentVersion) {
    issues.push({ level: 'error', message: 'Missing "contentVersion" field. Use "1.0.0.0" as the standard value.' });
  } else if (!template.contentVersion.match(/^\d+\.\d+\.\d+\.\d+$/)) {
    issues.push({ level: 'warning', message: `contentVersion "${template.contentVersion}" does not follow the x.x.x.x format. Use "1.0.0.0".` });
  }

  // resources
  if (!template.resources) {
    issues.push({ level: 'error', message: 'Missing "resources" array. ARM templates must define at least one resource to deploy.' });
  } else if (!Array.isArray(template.resources)) {
    issues.push({ level: 'error', message: '"resources" must be an array.' });
  } else if (template.resources.length === 0) {
    issues.push({ level: 'warning', message: '"resources" array is empty. Add at least one resource to deploy.' });
  } else {
    template.resources.forEach((res: any, idx: number) => {
      const resLabel = res.name ? `Resource "${res.name}"` : `resources[${idx}]`;

      if (!res.type) issues.push({ level: 'error', message: `${resLabel}: Missing "type" field (e.g. "Microsoft.Storage/storageAccounts").` });
      if (!res.apiVersion) {
        issues.push({ level: 'error', message: `${resLabel}: Missing "apiVersion" field. Always specify the API version for deterministic deployments.` });
      } else {
        // Check for old API versions
        if (res.type && DEPRECATED_API_VERSIONS[res.type] === res.apiVersion) {
          issues.push({ level: 'warning', message: `${resLabel}: apiVersion "${res.apiVersion}" for ${res.type} is outdated. Check docs for the latest stable version.` });
        }
        // Check format
        if (!res.apiVersion.match(/^\d{4}-\d{2}-\d{2}(-preview)?$/)) {
          issues.push({ level: 'error', message: `${resLabel}: apiVersion "${res.apiVersion}" format is invalid. Use YYYY-MM-DD format (e.g. "2021-06-01").` });
        }
      }
      if (!res.name) issues.push({ level: 'error', message: `${resLabel}: Missing "name" field.` });
      if (!res.location && res.type && !res.type.startsWith('Microsoft.Authorization')) {
        issues.push({ level: 'warning', message: `${resLabel}: No "location" specified. Use "[resourceGroup().location]" to deploy to the resource group region.` });
      }
    });
  }

  // parameters: check for plaintext password
  if (template.parameters) {
    Object.entries(template.parameters).forEach(([name, param]: [string, any]) => {
      const lowerName = name.toLowerCase();
      if ((lowerName.includes('password') || lowerName.includes('secret') || lowerName.includes('key')) && param.type && param.type !== 'securestring' && param.type !== 'secureObject') {
        issues.push({ level: 'error', message: `Parameter "${name}" looks sensitive but type is "${param.type}". Use "securestring" to prevent the value from being logged or displayed.` });
      }
    });
  }

  // variables referencing resourceGroup()
  const templateStr = JSON.stringify(template);

  // Hardcoded location strings
  const locationMatches = templateStr.match(/"location"\s*:\s*"(eastus|westus|northeurope|westeurope|eastasia)"/g);
  if (locationMatches) {
    issues.push({ level: 'warning', message: 'Hardcoded location values detected. Use "[resourceGroup().location]" or a parameter to make the template region-agnostic.' });
  }

  // Check for hardcoded subscription IDs (look like GUIDs in resource IDs)
  const guidInResourceId = templateStr.match(/\/subscriptions\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  if (guidInResourceId && !templateStr.includes('subscription()')) {
    issues.push({ level: 'warning', message: 'Possible hardcoded subscription ID in a resource ID. Use "[subscription().subscriptionId]" instead for portability.' });
  }

  // outputs
  if (!template.outputs || Object.keys(template.outputs || {}).length === 0) {
    issues.push({ level: 'info', message: 'No "outputs" defined. Consider adding outputs for resource IDs, connection strings, or URLs that downstream deployments may need.' });
  }

  if (issues.length === 0) {
    issues.push({ level: 'info', message: 'ARM template structure is valid. No issues found.' });
  }

  return issues;
}

const LEVEL_STYLES = {
  error: { bg: 'bg-red-500/10 border-red-500/30', icon: '✗', text: 'text-red-400' },
  warning: { bg: 'bg-yellow-500/10 border-yellow-500/30', icon: '⚠', text: 'text-yellow-400' },
  info: { bg: 'bg-green-500/10 border-green-500/30', icon: '✓', text: 'text-green-400' },
};

export default function AzureArmTemplateValidator() {
  const [input, setInput] = useState(SAMPLE_ARM);
  const [issues, setIssues] = useState<ValidationIssue[]>(() => validateArmTemplate(SAMPLE_ARM));
  const [validated, setValidated] = useState(true);

  const handleValidate = () => {
    setIssues(validateArmTemplate(input));
    setValidated(true);
  };

  const handleFormat = () => {
    try { setInput(JSON.stringify(JSON.parse(input), null, 2)); } catch {}
  };

  const errors = issues.filter(i => i.level === 'error');
  const warnings = issues.filter(i => i.level === 'warning');

  return (
    <div class="space-y-4">
      <div>
        <div class="flex items-center justify-between mb-2">
          <label class="text-sm font-medium text-text-muted">Azure ARM Template JSON</label>
          <div class="flex gap-2">
            <button onClick={handleFormat} class="text-xs px-2 py-1 bg-surface border border-border rounded hover:border-accent transition-colors">Format JSON</button>
            <button onClick={() => { setInput(SAMPLE_ARM); setIssues(validateArmTemplate(SAMPLE_ARM)); setValidated(true); }} class="text-xs px-2 py-1 bg-surface border border-border rounded hover:border-accent transition-colors">Load example</button>
            <button onClick={() => { setInput(''); setIssues([]); setValidated(false); }} class="text-xs px-2 py-1 bg-surface border border-border rounded hover:border-accent transition-colors">Clear</button>
          </div>
        </div>
        <textarea
          value={input}
          onInput={e => { setInput((e.target as HTMLTextAreaElement).value); setValidated(false); }}
          rows={18}
          class="w-full font-mono text-sm bg-background border border-border rounded-lg p-3 resize-y focus:outline-none focus:ring-1 focus:ring-accent transition-colors"
          placeholder="Paste your Azure ARM template JSON here..."
          spellcheck={false}
        />
      </div>

      <button onClick={handleValidate} class="w-full py-2.5 bg-accent text-white rounded-lg font-medium hover:bg-accent/90 transition-colors">
        Validate Template
      </button>

      {validated && issues.length > 0 && (
        <div class="space-y-3">
          <div class="flex items-center gap-3 text-sm flex-wrap">
            <span class="font-medium text-text">Results:</span>
            {errors.length > 0 && <span class="px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/20 text-red-400">{errors.length} error{errors.length > 1 ? 's' : ''}</span>}
            {warnings.length > 0 && <span class="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-400">{warnings.length} warning{warnings.length > 1 ? 's' : ''}</span>}
            {errors.length === 0 && warnings.length === 0 && <span class="px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-400">Valid</span>}
          </div>
          <div class="space-y-2">
            {issues.map((issue, i) => {
              const style = LEVEL_STYLES[issue.level];
              return (
                <div key={i} class={`flex gap-3 p-3 border rounded-lg ${style.bg}`}>
                  <span class={`font-bold text-lg leading-none mt-0.5 ${style.text}`}>{style.icon}</span>
                  <div class="flex-1 min-w-0">
                    <span class={`text-xs font-medium uppercase tracking-wide ${style.text}`}>{issue.level}</span>
                    <p class="text-sm text-text mt-0.5">{issue.message}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div class="bg-surface border border-border rounded-lg p-4 text-xs text-text-muted">
        <p class="font-medium text-text mb-2">Checks performed</p>
        <ul class="space-y-1 list-disc list-inside">
          <li>JSON syntax validation</li>
          <li>$schema: valid ARM schema URL and version</li>
          <li>contentVersion: x.x.x.x format</li>
          <li>resources: type, name, apiVersion, location per resource</li>
          <li>apiVersion: YYYY-MM-DD format and deprecated versions</li>
          <li>Sensitive parameters: securestring type enforcement</li>
          <li>Hardcoded location strings</li>
          <li>Hardcoded subscription IDs in resource references</li>
          <li>Outputs section best-practice suggestion</li>
        </ul>
      </div>
    </div>
  );
}

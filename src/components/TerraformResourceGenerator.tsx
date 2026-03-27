import { useState } from 'preact/hooks';

type Provider = 'aws' | 'gcp' | 'azure';

interface ResourceField {
  name: string;
  label: string;
  type: 'text' | 'select' | 'checkbox';
  options?: string[];
  placeholder?: string;
  defaultValue?: string;
}

interface ResourceDef {
  type: string;
  label: string;
  description: string;
  fields: ResourceField[];
  template: (values: Record<string, string>) => string;
}

const RESOURCES: Record<Provider, ResourceDef[]> = {
  aws: [
    {
      type: 'aws_instance',
      label: 'EC2 Instance',
      description: 'AWS EC2 compute instance',
      fields: [
        { name: 'name', label: 'Resource Name', type: 'text', placeholder: 'main', defaultValue: 'main' },
        { name: 'ami', label: 'AMI ID', type: 'text', placeholder: 'ami-0c55b159cbfafe1f0', defaultValue: 'ami-0c55b159cbfafe1f0' },
        { name: 'instance_type', label: 'Instance Type', type: 'select', options: ['t2.micro', 't2.small', 't2.medium', 't3.micro', 't3.small', 't3.medium', 'm5.large', 'c5.large'], defaultValue: 't2.micro' },
        { name: 'key_name', label: 'Key Pair Name', type: 'text', placeholder: 'my-key-pair', defaultValue: '' },
        { name: 'subnet_id', label: 'Subnet ID', type: 'text', placeholder: 'subnet-12345678', defaultValue: '' },
        { name: 'vpc_security_group_ids', label: 'Security Group IDs (comma-separated)', type: 'text', placeholder: 'sg-12345678', defaultValue: '' },
        { name: 'tags_name', label: 'Name Tag', type: 'text', placeholder: 'my-instance', defaultValue: 'my-instance' },
      ],
      template: (v) => `resource "aws_instance" "${v.name}" {
  ami           = "${v.ami}"
  instance_type = "${v.instance_type}"${v.key_name ? `\n  key_name      = "${v.key_name}"` : ''}${v.subnet_id ? `\n  subnet_id     = "${v.subnet_id}"` : ''}${v.vpc_security_group_ids ? `\n  vpc_security_group_ids = [${v.vpc_security_group_ids.split(',').map(s => `"${s.trim()}"`).join(', ')}]` : ''}

  tags = {
    Name = "${v.tags_name}"
  }
}`,
    },
    {
      type: 'aws_s3_bucket',
      label: 'S3 Bucket',
      description: 'AWS S3 object storage bucket',
      fields: [
        { name: 'name', label: 'Resource Name', type: 'text', placeholder: 'my_bucket', defaultValue: 'my_bucket' },
        { name: 'bucket', label: 'Bucket Name', type: 'text', placeholder: 'my-unique-bucket-name', defaultValue: 'my-unique-bucket-name' },
        { name: 'acl', label: 'ACL', type: 'select', options: ['private', 'public-read', 'public-read-write', 'authenticated-read'], defaultValue: 'private' },
        { name: 'versioning', label: 'Enable Versioning', type: 'checkbox', defaultValue: 'false' },
        { name: 'tags_name', label: 'Name Tag', type: 'text', placeholder: 'my-bucket', defaultValue: 'my-bucket' },
      ],
      template: (v) => `resource "aws_s3_bucket" "${v.name}" {
  bucket = "${v.bucket}"
  acl    = "${v.acl}"

  versioning {
    enabled = ${v.versioning === 'true'}
  }

  tags = {
    Name = "${v.tags_name}"
  }
}`,
    },
    {
      type: 'aws_security_group',
      label: 'Security Group',
      description: 'AWS VPC Security Group',
      fields: [
        { name: 'name', label: 'Resource Name', type: 'text', placeholder: 'allow_web', defaultValue: 'allow_web' },
        { name: 'sg_name', label: 'Security Group Name', type: 'text', placeholder: 'allow_web', defaultValue: 'allow_web' },
        { name: 'description', label: 'Description', type: 'text', placeholder: 'Allow web traffic', defaultValue: 'Allow web traffic' },
        { name: 'vpc_id', label: 'VPC ID', type: 'text', placeholder: 'vpc-12345678', defaultValue: '' },
        { name: 'ingress_port', label: 'Ingress Port', type: 'select', options: ['80', '443', '22', '3306', '5432', '6379', '8080', '8443'], defaultValue: '80' },
        { name: 'egress_cidr', label: 'Egress CIDR', type: 'text', placeholder: '0.0.0.0/0', defaultValue: '0.0.0.0/0' },
      ],
      template: (v) => `resource "aws_security_group" "${v.name}" {
  name        = "${v.sg_name}"
  description = "${v.description}"${v.vpc_id ? `\n  vpc_id      = "${v.vpc_id}"` : ''}

  ingress {
    from_port   = ${v.ingress_port}
    to_port     = ${v.ingress_port}
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["${v.egress_cidr}"]
  }
}`,
    },
    {
      type: 'aws_db_instance',
      label: 'RDS Instance',
      description: 'AWS RDS database instance',
      fields: [
        { name: 'name', label: 'Resource Name', type: 'text', placeholder: 'default', defaultValue: 'default' },
        { name: 'identifier', label: 'DB Identifier', type: 'text', placeholder: 'mydb', defaultValue: 'mydb' },
        { name: 'engine', label: 'Engine', type: 'select', options: ['mysql', 'postgres', 'mariadb', 'oracle-ee', 'sqlserver-ex'], defaultValue: 'mysql' },
        { name: 'engine_version', label: 'Engine Version', type: 'text', placeholder: '8.0', defaultValue: '8.0' },
        { name: 'instance_class', label: 'Instance Class', type: 'select', options: ['db.t2.micro', 'db.t3.micro', 'db.t3.small', 'db.m5.large'], defaultValue: 'db.t2.micro' },
        { name: 'allocated_storage', label: 'Storage (GB)', type: 'text', placeholder: '20', defaultValue: '20' },
        { name: 'db_name', label: 'Database Name', type: 'text', placeholder: 'myappdb', defaultValue: 'myappdb' },
        { name: 'username', label: 'Master Username', type: 'text', placeholder: 'admin', defaultValue: 'admin' },
      ],
      template: (v) => `resource "aws_db_instance" "${v.name}" {
  identifier        = "${v.identifier}"
  engine            = "${v.engine}"
  engine_version    = "${v.engine_version}"
  instance_class    = "${v.instance_class}"
  allocated_storage = ${v.allocated_storage}
  db_name           = "${v.db_name}"
  username          = "${v.username}"
  password          = var.db_password
  skip_final_snapshot = true
}`,
    },
  ],
  gcp: [
    {
      type: 'google_compute_instance',
      label: 'Compute Instance',
      description: 'GCP Compute Engine VM',
      fields: [
        { name: 'name', label: 'Resource Name', type: 'text', placeholder: 'default', defaultValue: 'default' },
        { name: 'instance_name', label: 'Instance Name', type: 'text', placeholder: 'my-vm', defaultValue: 'my-vm' },
        { name: 'machine_type', label: 'Machine Type', type: 'select', options: ['e2-micro', 'e2-small', 'e2-medium', 'n1-standard-1', 'n1-standard-2', 'n2-standard-2'], defaultValue: 'e2-micro' },
        { name: 'zone', label: 'Zone', type: 'select', options: ['us-central1-a', 'us-east1-b', 'us-west1-a', 'europe-west1-b', 'asia-east1-a'], defaultValue: 'us-central1-a' },
        { name: 'image', label: 'Boot Disk Image', type: 'select', options: ['debian-cloud/debian-11', 'ubuntu-os-cloud/ubuntu-2204-lts', 'cos-cloud/cos-stable', 'centos-cloud/centos-7'], defaultValue: 'debian-cloud/debian-11' },
        { name: 'network', label: 'Network', type: 'text', placeholder: 'default', defaultValue: 'default' },
      ],
      template: (v) => `resource "google_compute_instance" "${v.name}" {
  name         = "${v.instance_name}"
  machine_type = "${v.machine_type}"
  zone         = "${v.zone}"

  boot_disk {
    initialize_params {
      image = "${v.image}"
    }
  }

  network_interface {
    network = "${v.network}"
    access_config {}
  }
}`,
    },
    {
      type: 'google_storage_bucket',
      label: 'Cloud Storage Bucket',
      description: 'GCP Cloud Storage bucket',
      fields: [
        { name: 'name', label: 'Resource Name', type: 'text', placeholder: 'my_bucket', defaultValue: 'my_bucket' },
        { name: 'bucket_name', label: 'Bucket Name', type: 'text', placeholder: 'my-gcs-bucket', defaultValue: 'my-gcs-bucket' },
        { name: 'location', label: 'Location', type: 'select', options: ['US', 'EU', 'ASIA', 'us-central1', 'us-east1', 'europe-west1'], defaultValue: 'US' },
        { name: 'storage_class', label: 'Storage Class', type: 'select', options: ['STANDARD', 'NEARLINE', 'COLDLINE', 'ARCHIVE'], defaultValue: 'STANDARD' },
        { name: 'public_access', label: 'Block Public Access', type: 'checkbox', defaultValue: 'true' },
      ],
      template: (v) => `resource "google_storage_bucket" "${v.name}" {
  name          = "${v.bucket_name}"
  location      = "${v.location}"
  storage_class = "${v.storage_class}"
  force_destroy = false

  uniform_bucket_level_access = ${v.public_access === 'true'}
}`,
    },
  ],
  azure: [
    {
      type: 'azurerm_virtual_machine',
      label: 'Virtual Machine',
      description: 'Azure Virtual Machine',
      fields: [
        { name: 'name', label: 'Resource Name', type: 'text', placeholder: 'main', defaultValue: 'main' },
        { name: 'vm_name', label: 'VM Name', type: 'text', placeholder: 'my-vm', defaultValue: 'my-vm' },
        { name: 'location', label: 'Location', type: 'select', options: ['East US', 'West US', 'West Europe', 'East Asia', 'Southeast Asia', 'Australia East'], defaultValue: 'East US' },
        { name: 'resource_group', label: 'Resource Group Name', type: 'text', placeholder: 'my-rg', defaultValue: 'my-rg' },
        { name: 'vm_size', label: 'VM Size', type: 'select', options: ['Standard_B1s', 'Standard_B2s', 'Standard_D2s_v3', 'Standard_D4s_v3'], defaultValue: 'Standard_B1s' },
        { name: 'publisher', label: 'Image Publisher', type: 'select', options: ['Canonical', 'MicrosoftWindowsServer', 'RedHat', 'OpenLogic'], defaultValue: 'Canonical' },
        { name: 'offer', label: 'Image Offer', type: 'text', placeholder: 'UbuntuServer', defaultValue: 'UbuntuServer' },
        { name: 'sku', label: 'Image SKU', type: 'text', placeholder: '18.04-LTS', defaultValue: '18.04-LTS' },
      ],
      template: (v) => `resource "azurerm_virtual_machine" "${v.name}" {
  name                  = "${v.vm_name}"
  location              = "${v.location}"
  resource_group_name   = "${v.resource_group}"
  vm_size               = "${v.vm_size}"

  storage_image_reference {
    publisher = "${v.publisher}"
    offer     = "${v.offer}"
    sku       = "${v.sku}"
    version   = "latest"
  }

  storage_os_disk {
    name              = "${v.vm_name}-osdisk"
    caching           = "ReadWrite"
    create_option     = "FromImage"
    managed_disk_type = "Standard_LRS"
  }

  os_profile {
    computer_name  = "${v.vm_name}"
    admin_username = "adminuser"
    admin_password = var.admin_password
  }

  os_profile_linux_config {
    disable_password_authentication = false
  }
}`,
    },
    {
      type: 'azurerm_storage_account',
      label: 'Storage Account',
      description: 'Azure Storage Account',
      fields: [
        { name: 'name', label: 'Resource Name', type: 'text', placeholder: 'main', defaultValue: 'main' },
        { name: 'storage_name', label: 'Storage Account Name (lowercase, 3-24 chars)', type: 'text', placeholder: 'mystorageacct', defaultValue: 'mystorageacct' },
        { name: 'resource_group', label: 'Resource Group', type: 'text', placeholder: 'my-rg', defaultValue: 'my-rg' },
        { name: 'location', label: 'Location', type: 'select', options: ['East US', 'West US', 'West Europe', 'East Asia'], defaultValue: 'East US' },
        { name: 'account_tier', label: 'Account Tier', type: 'select', options: ['Standard', 'Premium'], defaultValue: 'Standard' },
        { name: 'replication_type', label: 'Replication', type: 'select', options: ['LRS', 'GRS', 'RAGRS', 'ZRS'], defaultValue: 'LRS' },
      ],
      template: (v) => `resource "azurerm_storage_account" "${v.name}" {
  name                     = "${v.storage_name}"
  resource_group_name      = "${v.resource_group}"
  location                 = "${v.location}"
  account_tier             = "${v.storage_tier}"
  account_replication_type = "${v.replication_type}"

  tags = {
    environment = "production"
  }
}`,
    },
  ],
};

function getDefaultValues(fields: ResourceField[]): Record<string, string> {
  const values: Record<string, string> = {};
  for (const f of fields) {
    values[f.name] = f.defaultValue ?? '';
  }
  return values;
}

export default function TerraformResourceGenerator() {
  const [provider, setProvider] = useState<Provider>('aws');
  const [resourceIdx, setResourceIdx] = useState(0);
  const [values, setValues] = useState<Record<string, string>>(
    getDefaultValues(RESOURCES.aws[0].fields)
  );
  const [copied, setCopied] = useState(false);

  const resources = RESOURCES[provider];
  const resource = resources[resourceIdx] ?? resources[0];

  const handleProviderChange = (p: Provider) => {
    setProvider(p);
    const newResources = RESOURCES[p];
    setResourceIdx(0);
    setValues(getDefaultValues(newResources[0].fields));
    setCopied(false);
  };

  const handleResourceChange = (idx: number) => {
    setResourceIdx(idx);
    setValues(getDefaultValues(resources[idx].fields));
    setCopied(false);
  };

  const handleChange = (key: string, val: string) => {
    setValues((v) => ({ ...v, [key]: val }));
    setCopied(false);
  };

  const output = resource.template(values);

  const handleCopy = () => {
    navigator.clipboard.writeText(output).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div class="space-y-6">
      {/* Provider Selector */}
      <div class="flex gap-2 flex-wrap">
        {(['aws', 'gcp', 'azure'] as Provider[]).map((p) => (
          <button
            key={p}
            onClick={() => handleProviderChange(p)}
            class={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
              provider === p
                ? 'bg-brand-primary text-white'
                : 'bg-surface-elevated text-text-muted hover:text-text-primary border border-border-default'
            }`}
          >
            {p.toUpperCase()}
          </button>
        ))}
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Resource Type + Fields */}
        <div class="space-y-4">
          {/* Resource Type */}
          <div>
            <label class="block text-sm font-medium text-text-muted mb-1">Resource Type</label>
            <select
              class="w-full bg-surface-elevated border border-border-default rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary"
              value={resourceIdx}
              onChange={(e) => handleResourceChange(Number((e.target as HTMLSelectElement).value))}
            >
              {resources.map((r, i) => (
                <option key={r.type} value={i}>{r.label} ({r.type})</option>
              ))}
            </select>
            <p class="text-xs text-text-muted mt-1">{resource.description}</p>
          </div>

          {/* Fields */}
          <div class="space-y-3">
            {resource.fields.map((field) => (
              <div key={field.name}>
                <label class="block text-sm font-medium text-text-muted mb-1">{field.label}</label>
                {field.type === 'select' ? (
                  <select
                    class="w-full bg-surface-elevated border border-border-default rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary"
                    value={values[field.name] ?? field.defaultValue}
                    onChange={(e) => handleChange(field.name, (e.target as HTMLSelectElement).value)}
                  >
                    {field.options?.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : field.type === 'checkbox' ? (
                  <label class="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={values[field.name] === 'true'}
                      onChange={(e) => handleChange(field.name, (e.target as HTMLInputElement).checked ? 'true' : 'false')}
                      class="w-4 h-4 accent-brand-primary"
                    />
                    <span class="text-sm text-text-muted">Enabled</span>
                  </label>
                ) : (
                  <input
                    type="text"
                    class="w-full bg-surface-elevated border border-border-default rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary"
                    placeholder={field.placeholder}
                    value={values[field.name] ?? ''}
                    onInput={(e) => handleChange(field.name, (e.target as HTMLInputElement).value)}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right: Output */}
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <label class="text-sm font-medium text-text-muted">Terraform HCL Output</label>
            <button
              onClick={handleCopy}
              class={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                copied
                  ? 'bg-green-500 text-white'
                  : 'bg-brand-primary text-white hover:bg-brand-hover'
              }`}
            >
              {copied ? '✓ Copied' : 'Copy HCL'}
            </button>
          </div>
          <pre class="bg-surface-elevated border border-border-default rounded-lg p-4 text-sm text-text-primary overflow-auto font-mono whitespace-pre min-h-[320px]">
            {output}
          </pre>
          <p class="text-xs text-text-muted">
            Paste this into your <code class="bg-surface-elevated px-1 rounded">.tf</code> file. Remember to run <code class="bg-surface-elevated px-1 rounded">terraform init</code> before applying.
          </p>
        </div>
      </div>
    </div>
  );
}

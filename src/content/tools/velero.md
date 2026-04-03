---
title: "Velero"
description: "Backup, restore, and migrate Kubernetes cluster resources and persistent volumes with schedule-based automation"
category: "cloud-native"
tags: ["kubernetes", "devops", "backup", "disaster-recovery", "cloud"]
pricing: "Open Source"
website: "https://velero.io"
github: "https://github.com/vmware-tanzu/velero"
date: "2026-04-03"
pros:
  - "Comprehensive backup covering both Kubernetes resources and persistent volume data"
  - "Schedule-based backups with configurable retention policies for automated disaster recovery"
  - "Cluster migration support enables moving workloads across providers or regions"
  - "Plugin architecture supports custom object stores and volume snapshotters"
cons:
  - "Restoring to a different cluster version or provider can require manual adjustments"
  - "Large cluster backups can be slow and consume significant storage in the object store"
  - "Limited support for application-consistent backups of stateful workloads like databases"
---

## Velero: Kubernetes Backup and Disaster Recovery

Velero (formerly Heptio Ark) is an open source tool for safely backing up and restoring Kubernetes cluster resources and persistent volumes. It enables disaster recovery, cluster migration, and environment replication — capturing both the Kubernetes API objects and the underlying storage data in a consistent snapshot.

## Key Features

- **Cluster-level backup**: Back up all Kubernetes resources — Deployments, Services, ConfigMaps, Secrets, CRDs — across all or selected namespaces
- **Persistent volume snapshots**: Integrate with cloud provider volume snapshot APIs (AWS EBS, GCP Persistent Disk, Azure Managed Disks) to back up stateful workload data
- **Schedule backups**: Define cron-based backup schedules with configurable retention policies
- **Namespace-level granularity**: Back up and restore individual namespaces for surgical recovery without affecting the rest of the cluster
- **Label and resource filtering**: Include or exclude specific resources by label selectors, resource types, or namespace
- **Cluster migration**: Move workloads between clusters or cloud providers by backing up one cluster and restoring to another
- **Object storage backends**: Store backups in S3-compatible storage (AWS S3, GCS, Azure Blob, MinIO)
- **Plugin system**: Extensible architecture with plugins for custom object store backends and volume snapshotters

## Use Cases

- **Disaster recovery**: Regularly scheduled backups with offsite storage ensure cluster recovery from catastrophic failures
- **Cluster migration**: Move production workloads from one cloud provider or region to another with minimal downtime
- **Environment cloning**: Replicate a production cluster to staging for testing or debugging with real data
- **Upgrade safety**: Take a full cluster backup before Kubernetes version upgrades to provide a safe rollback point
- **Namespace recovery**: Restore accidentally deleted namespaces or misconfigured resources without full cluster restoration

## Quick Start

Install Velero with AWS S3 as the backup storage location:

```bash
# Install the Velero CLI
brew install velero

# Create IAM credentials for Velero
cat > credentials-velero <<EOF
[default]
aws_access_key_id=YOUR_ACCESS_KEY
aws_secret_access_key=YOUR_SECRET_KEY
EOF

# Install Velero in the cluster with S3 backend
velero install \
  --provider aws \
  --plugins velero/velero-plugin-for-aws:v1.8.0 \
  --bucket my-velero-backups \
  --backup-location-config region=us-east-1 \
  --snapshot-location-config region=us-east-1 \
  --secret-file ./credentials-velero

# Verify the installation
velero backup-location get
```

Create a one-time backup and schedule regular backups:

```bash
# Back up the entire cluster immediately
velero backup create full-cluster-backup --wait

# Back up a single namespace
velero backup create my-app-backup \
  --include-namespaces my-app \
  --wait

# Schedule daily backups at 2 AM with 30-day retention
velero schedule create daily-backup \
  --schedule="0 2 * * *" \
  --ttl 720h0m0s

# Check backup status
velero backup describe full-cluster-backup
velero backup logs full-cluster-backup
```

Restore from a backup:

```bash
# Restore the entire cluster backup
velero restore create --from-backup full-cluster-backup

# Restore only a specific namespace from backup
velero restore create \
  --from-backup full-cluster-backup \
  --include-namespaces my-app

# List all restores and check status
velero restore get
velero restore describe my-restore
```

Backup storage location as YAML (GitOps-friendly):

```yaml
apiVersion: velero.io/v1
kind: BackupStorageLocation
metadata:
  name: default
  namespace: velero
spec:
  provider: aws
  objectStorage:
    bucket: my-velero-backups
    prefix: cluster-backups
  config:
    region: us-east-1
---
apiVersion: velero.io/v1
kind: Schedule
metadata:
  name: daily-cluster-backup
  namespace: velero
spec:
  schedule: "0 2 * * *"
  template:
    ttl: 720h0m0s
    includedNamespaces:
      - "*"
```

## Comparison with Alternatives

| Feature | Velero | etcd snapshots | Kasten K10 |
|---|---|---|---|
| Granularity | Namespace/resource | Full cluster only | Application-aware |
| PV backup | Yes (plugins) | No | Yes |
| Cost | Free/OSS | Free | Commercial |
| UI | CLI only | None | Rich dashboard |
| Cross-cluster migration | Yes | Limited | Yes |
| Schedule management | Yes | Manual/cron | Yes |

**vs etcd snapshots**: etcd snapshots capture the raw cluster state but cannot restore individual namespaces or resources. Velero provides granular, application-level backups that are far more practical for targeted recovery scenarios.

**vs Kasten K10**: Kasten K10 is a commercial product with a polished UI and application-consistent backup policies. Velero is open source, more widely adopted, and sufficient for most backup and DR needs without licensing costs.

Velero is the standard open source solution for Kubernetes backup and DR, trusted by teams running stateful workloads that cannot afford data loss during incidents, upgrades, or migrations.

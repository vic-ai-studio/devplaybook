---
title: "Kubernetes Security Hardening: 15 Essential Practices"
description: "A comprehensive guide to Kubernetes security hardening—RBAC, Pod Security Standards, network policies, secrets management, and container scanning with real examples."
pubDate: "2026-04-02"
author: "DevPlaybook Team"
tags: ["devops", "kubernetes", "security", "rbac", "platform-engineering"]
readingTime: "12 min read"
category: "DevOps"
---

A default Kubernetes installation is not a secure Kubernetes installation. The flexibility that makes Kubernetes powerful also creates a large attack surface if left unconfigured. This guide covers 15 concrete practices that significantly reduce your cluster's exposure—with real `kubectl` commands and policy examples you can apply today.

## Why Kubernetes Security Is Different

Kubernetes security has a unique challenge: the blast radius of a compromised workload can extend across the entire cluster. A container with excessive permissions can:

- Read secrets from other namespaces
- Exfiltrate data via unrestricted egress
- Escape to the host node via misconfigured security contexts
- Pivot to the cloud provider's metadata service and steal IAM credentials

The practices below are organized from foundational to advanced.

---

## 1. Enable RBAC and Audit It Regularly

Role-Based Access Control (RBAC) should be the first thing you verify is enabled:

```bash
# Verify RBAC is active
kubectl api-versions | grep rbac.authorization.k8s.io
```

**Principle of least privilege for service accounts:**

```yaml
# Create a minimal ServiceAccount
apiVersion: v1
kind: ServiceAccount
metadata:
  name: my-app
  namespace: production
automountServiceAccountToken: false  # Don't mount token unless needed
---
# Only grant what's required
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: my-app-role
  namespace: production
rules:
- apiGroups: [""]
  resources: ["configmaps"]
  resourceNames: ["my-app-config"]  # Lock to specific resources
  verbs: ["get", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: my-app-rolebinding
  namespace: production
subjects:
- kind: ServiceAccount
  name: my-app
  namespace: production
roleRef:
  kind: Role
  name: my-app-role
  apiGroup: rbac.authorization.k8s.io
```

**Audit for over-privileged accounts:**

```bash
# Find cluster-admin bindings (should be minimal)
kubectl get clusterrolebindings -o json | \
  jq '.items[] | select(.roleRef.name=="cluster-admin") | .metadata.name'

# Check what a service account can do
kubectl auth can-i --list --as=system:serviceaccount:production:my-app
```

---

## 2. Enforce Pod Security Standards

Kubernetes 1.25+ includes Pod Security Standards (PSS) as the replacement for the deprecated PodSecurityPolicy. Three levels:

- **Privileged**: No restrictions (only for system namespaces)
- **Baseline**: Prevents known privilege escalations
- **Restricted**: Hardened best practices

```bash
# Enforce restricted standards on a namespace
kubectl label namespace production \
  pod-security.kubernetes.io/enforce=restricted \
  pod-security.kubernetes.io/enforce-version=latest \
  pod-security.kubernetes.io/warn=restricted \
  pod-security.kubernetes.io/audit=restricted
```

**Compliant pod spec for restricted mode:**

```yaml
spec:
  securityContext:
    runAsNonRoot: true
    runAsUser: 1000
    runAsGroup: 3000
    fsGroup: 2000
    seccompProfile:
      type: RuntimeDefault
  containers:
  - name: my-app
    image: my-app:1.2.3
    securityContext:
      allowPrivilegeEscalation: false
      readOnlyRootFilesystem: true
      capabilities:
        drop:
          - ALL
    volumeMounts:
    - name: tmp
      mountPath: /tmp      # For writable scratch space
  volumes:
  - name: tmp
    emptyDir: {}
```

---

## 3. Implement Network Policies

By default, all pods in a cluster can communicate with all other pods. Network policies enforce traffic rules at the pod level:

```yaml
# Deny all ingress and egress by default
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
  namespace: production
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress
---
# Allow my-app to receive traffic from the ingress controller only
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: my-app-ingress
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: my-app
  policyTypes:
  - Ingress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          kubernetes.io/metadata.name: ingress-nginx
    ports:
    - protocol: TCP
      port: 8080
---
# Allow my-app to call the database only
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: my-app-egress
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: my-app
  policyTypes:
  - Egress
  egress:
  - to:
    - podSelector:
        matchLabels:
          app: postgres
    ports:
    - protocol: TCP
      port: 5432
  - to:  # Allow DNS
    - namespaceSelector: {}
    ports:
    - protocol: UDP
      port: 53
```

> **Note**: Network policies require a CNI plugin that enforces them (Cilium, Calico, Weave Net). The default CNI in most managed clusters does not enforce them.

---

## 4. Rotate and Protect Secrets

Never store plaintext secrets in ConfigMaps or in your Git repository.

```bash
# Audit for secrets that might be in ConfigMaps
kubectl get configmaps --all-namespaces -o json | \
  jq '.items[].data | to_entries[] | select(.value | test("password|secret|token|key"; "i"))'
```

Use **External Secrets Operator** to pull from a secrets manager:

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ClusterSecretStore
metadata:
  name: aws-secretsmanager
spec:
  provider:
    aws:
      service: SecretsManager
      region: us-east-1
      auth:
        jwt:
          serviceAccountRef:
            name: external-secrets-sa
            namespace: external-secrets
```

Encrypt existing Kubernetes Secrets at rest via etcd encryption:

```yaml
# /etc/kubernetes/encryption-config.yaml (control plane)
apiVersion: apiserver.config.k8s.io/v1
kind: EncryptionConfiguration
resources:
- resources:
  - secrets
  providers:
  - aescbc:
      keys:
      - name: key1
        secret: <base64-encoded-32-byte-key>
  - identity: {}
```

---

## 5. Scan Container Images

Every image in production should be scanned for CVEs before it runs:

```bash
# Scan with Trivy (fast, accurate, free)
trivy image --exit-code 1 --severity HIGH,CRITICAL my-app:latest

# Scan a running cluster for vulnerable images
trivy k8s --report summary cluster
```

**Integrate scanning in CI:**

```yaml
# GitHub Actions example
- name: Scan image for CVEs
  uses: aquasecurity/trivy-action@master
  with:
    image-ref: ${{ env.IMAGE }}
    format: sarif
    output: trivy-results.sarif
    exit-code: '1'
    severity: HIGH,CRITICAL
    ignore-unfixed: true
```

---

## 6. Use Admission Controllers

**OPA Gatekeeper** or **Kyverno** let you enforce custom policies cluster-wide.

Example with Kyverno—require all images to come from your approved registry:

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: restrict-image-registries
spec:
  validationFailureAction: Enforce
  rules:
  - name: validate-registries
    match:
      any:
      - resources:
          kinds:
          - Pod
    validate:
      message: "Images must come from registry.company.com or gcr.io/distroless"
      pattern:
        spec:
          containers:
          - image: "registry.company.com/* | gcr.io/distroless/*"
```

Require resource limits on all containers:

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: require-resource-limits
spec:
  validationFailureAction: Enforce
  rules:
  - name: check-container-resources
    match:
      any:
      - resources:
          kinds: [Pod]
    validate:
      message: "CPU and memory limits are required"
      pattern:
        spec:
          containers:
          - resources:
              limits:
                memory: "?*"
                cpu: "?*"
```

---

## 7. Disable Automounting of Service Account Tokens

By default, Kubernetes mounts a service account token into every pod. Most workloads don't need it:

```yaml
# Disable at the ServiceAccount level
apiVersion: v1
kind: ServiceAccount
metadata:
  name: my-app
automountServiceAccountToken: false

# Or disable at the pod level
spec:
  automountServiceAccountToken: false
```

---

## 8. Enable Audit Logging

Configure the API server to log all requests for forensics and compliance:

```yaml
# audit-policy.yaml
apiVersion: audit.k8s.io/v1
kind: Policy
rules:
# Log all secret access at the metadata level
- level: Metadata
  resources:
  - group: ""
    resources: ["secrets"]
# Log pod exec commands fully
- level: RequestResponse
  resources:
  - group: ""
    resources: ["pods/exec", "pods/attach"]
# Log all other requests at the request level
- level: Request
  omitStages: [RequestReceived]
```

---

## 9. Restrict API Server Access

The API server should not be publicly accessible:

```bash
# Check your API server endpoint
kubectl cluster-info

# For managed clusters, configure authorized networks
# AWS EKS example
aws eks update-cluster-config \
  --name my-cluster \
  --resources-vpc-config endpointPublicAccess=false,endpointPrivateAccess=true
```

---

## 10. Use Distroless or Minimal Base Images

Smaller attack surface = fewer CVEs to patch:

```dockerfile
# Multi-stage build with distroless final image
FROM golang:1.22 AS builder
WORKDIR /app
COPY . .
RUN CGO_ENABLED=0 go build -o server .

FROM gcr.io/distroless/static-debian12
COPY --from=builder /app/server /
USER nonroot:nonroot
ENTRYPOINT ["/server"]
```

Distroless images have no shell, no package manager, and no unnecessary utilities. If an attacker gains code execution, lateral movement is significantly harder.

---

## 11. Implement Resource Quotas

Prevent resource exhaustion attacks and noisy neighbor issues:

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: production-quota
  namespace: production
spec:
  hard:
    requests.cpu: "20"
    requests.memory: 40Gi
    limits.cpu: "40"
    limits.memory: 80Gi
    pods: "100"
    services.loadbalancers: "3"
---
apiVersion: v1
kind: LimitRange
metadata:
  name: default-limits
  namespace: production
spec:
  limits:
  - default:
      cpu: 500m
      memory: 512Mi
    defaultRequest:
      cpu: 100m
      memory: 128Mi
    type: Container
```

---

## 12. Monitor for Anomalous Behavior with Falco

Falco is a runtime security tool that detects suspicious activity:

```bash
helm repo add falcosecurity https://falcosecurity.github.io/charts
helm install falco falcosecurity/falco \
  --set driver.kind=modern_ebpf \
  --set falcosidekick.enabled=true \
  --set falcosidekick.config.slack.webhookurl=https://hooks.slack.com/...
```

Falco will alert on events like: shell spawned inside a container, sensitive file reads, unexpected outbound connections, and privilege escalation attempts.

---

## 13. Regularly Run CIS Benchmark Checks

The Center for Internet Security (CIS) Kubernetes Benchmark is the gold standard for cluster hardening:

```bash
# Run kube-bench against your cluster
kubectl apply -f https://raw.githubusercontent.com/aquasecurity/kube-bench/main/job.yaml
kubectl logs job/kube-bench
```

kube-bench checks control plane configuration, etcd, API server flags, RBAC configuration, and node-level settings against CIS recommendations.

---

## 14. Protect etcd

etcd holds all cluster state including secrets. It must be protected:

- **Encrypt at rest**: Enable etcd encryption (see practice #4)
- **TLS client auth**: Only the API server should connect to etcd
- **Regular backups**: Encrypted backups to external storage
- **Separate network**: etcd nodes should not be reachable from pods

```bash
# Backup etcd (run on control plane node)
ETCDCTL_API=3 etcdctl snapshot save /backup/etcd-$(date +%Y%m%d).db \
  --endpoints=https://127.0.0.1:2379 \
  --cacert=/etc/kubernetes/pki/etcd/ca.crt \
  --cert=/etc/kubernetes/pki/etcd/server.crt \
  --key=/etc/kubernetes/pki/etcd/server.key
```

---

## 15. Define and Test an Incident Response Plan

Security controls reduce risk; they don't eliminate it. Know what to do when something goes wrong:

```bash
# Isolate a compromised pod immediately
kubectl label pod <compromised-pod> quarantine=true
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: quarantine
spec:
  podSelector:
    matchLabels:
      quarantine: "true"
  policyTypes:
  - Ingress
  - Egress
EOF

# Capture pod state for forensics before deleting
kubectl get pod <compromised-pod> -o yaml > incident-pod-state.yaml
kubectl logs <compromised-pod> > incident-logs.txt

# Cordon the node if needed
kubectl cordon <compromised-node>
```

---

## Security Hardening Checklist

| Practice | Priority | Effort |
|---|---|---|
| Enable RBAC + audit accounts | Critical | Low |
| Pod Security Standards (restricted) | Critical | Medium |
| Network policies (default deny) | Critical | Medium |
| External secrets management | Critical | Medium |
| Container image scanning in CI | High | Low |
| Admission controller policies | High | Medium |
| Disable SA token automount | High | Low |
| API server audit logging | High | Low |
| Restrict API server access | High | Low |
| Distroless base images | Medium | Medium |
| Resource quotas + LimitRanges | Medium | Low |
| Falco runtime monitoring | Medium | Medium |
| CIS benchmark checks | Medium | Low |
| etcd encryption + backup | Critical | Medium |
| Incident response runbook | High | Medium |

---

## Conclusion

Kubernetes security is not a one-time configuration—it's an ongoing practice. Start with the critical items: RBAC, Pod Security Standards, network policies, and secrets management. These four alone significantly reduce your exposure.

Layer in image scanning, admission controllers, and runtime monitoring as your team matures. Run CIS benchmark checks quarterly and treat the findings as a backlog, not a compliance checkbox.

The goal is defense in depth: if one control fails, the next one limits the blast radius. No single practice is sufficient; all of them together make compromise difficult and detection fast.

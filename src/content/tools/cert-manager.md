---
title: "cert-manager"
description: "Automates TLS certificate provisioning, renewal, and management for Kubernetes workloads"
category: "cloud-native"
tags: ["kubernetes", "devops", "tls", "security", "cloud", "certificates"]
---

## cert-manager: TLS Certificate Automation for Kubernetes

cert-manager is a powerful and extensible X.509 certificate controller for Kubernetes and OpenShift workloads. It obtains certificates from a variety of certificate authorities — including Let's Encrypt, HashiCorp Vault, Venafi, and self-signed — and ensures that certificates are valid, up to date, and renewed before they expire.

## Key Features

- **Automatic issuance and renewal**: Certificates are automatically obtained and renewed before expiry, eliminating manual certificate management
- **Multiple issuer types**: Supports ACME (Let's Encrypt), CA, SelfSigned, Vault, Venafi, and external issuers via the issuer plugin API
- **DNS-01 and HTTP-01 challenges**: Flexible ACME challenge solvers for obtaining certificates for public and private domains
- **Wildcard certificates**: Request wildcard certs using DNS-01 challenges for internal services and subdomains
- **Certificate transparency**: Works with public CAs that log certificates for auditability
- **Kubernetes-native CRDs**: Manage certificates, issuers, and certificate requests through standard Kubernetes resources
- **Ingress integration**: Automatically provision TLS certificates for annotated Ingress resources
- **Service mesh integration**: Works with Istio, Linkerd, and SPIFFE/SPIRE for workload identity certificates

## Use Cases

- **Public HTTPS endpoints**: Automatically provision and renew Let's Encrypt certificates for public-facing services
- **Internal PKI**: Issue short-lived certificates from an internal CA for service-to-service mTLS
- **Wildcard certificates**: Obtain `*.example.com` certificates for all subdomains using DNS-01 challenges
- **GitOps workflows**: Store issuer configuration in Git and have cert-manager handle all certificate lifecycle operations
- **Development environments**: Issue self-signed certificates for local and staging Kubernetes clusters

## Quick Start

Install cert-manager and create a Let's Encrypt issuer:

```bash
# Install cert-manager
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.14.0/cert-manager.yaml

# Verify the installation
kubectl get pods --namespace cert-manager
```

Create a ClusterIssuer for Let's Encrypt:

```yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@example.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
      - http01:
          ingress:
            ingressClassName: nginx
```

Annotate an Ingress to get a certificate automatically:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: my-app
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
spec:
  tls:
    - hosts:
        - app.example.com
      secretName: my-app-tls
  rules:
    - host: app.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: my-app
                port:
                  number: 80
```

Or request a certificate directly:

```yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: my-app-cert
  namespace: my-app
spec:
  secretName: my-app-tls
  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer
  dnsNames:
    - app.example.com
    - www.app.example.com
```

## Comparison with Alternatives

| Feature | cert-manager | AWS ACM | manual certbot |
|---|---|---|---|
| Cloud agnostic | Yes | AWS only | Yes |
| Kubernetes-native | Yes | Via annotations | No |
| Automatic renewal | Yes | Yes | Manual/cron |
| Internal CAs | Yes | Limited | Limited |
| Wildcard certs | Yes (DNS-01) | Yes | Yes (DNS-01) |
| Service mesh certs | Yes | No | No |

**vs AWS ACM**: ACM is tightly integrated with AWS services (ALB, CloudFront) and handles renewal automatically, but is locked to AWS and cannot issue certificates for non-AWS endpoints. cert-manager works across any cloud or on-premises environment.

**vs manual certbot**: Running certbot manually or via cron jobs is error-prone and doesn't scale. cert-manager handles the entire lifecycle natively within Kubernetes, integrates with your GitOps workflow, and removes human error from certificate renewal.

cert-manager is the standard solution for certificate management on Kubernetes and is a CNCF incubating project trusted by thousands of organizations in production.

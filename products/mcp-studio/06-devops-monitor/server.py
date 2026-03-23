"""
MCP Server: DevOps Monitor
Monitor server health, view logs, manage deployments, and track incidents.
"""

import json
import os
import platform
import random
from datetime import datetime, timedelta
from typing import Any

from mcp.server.fastmcp import FastMCP

server = FastMCP("devops-monitor")

# ---------------------------------------------------------------------------
# Simulated infrastructure data (replace with real monitoring APIs)
# ---------------------------------------------------------------------------

services: dict[str, dict[str, Any]] = {
    "api-server": {
        "name": "API Server",
        "host": "api-prod-01",
        "port": 8080,
        "status": "healthy",
        "uptime_hours": 720,
        "cpu_percent": 34.2,
        "memory_percent": 58.7,
        "disk_percent": 42.1,
        "requests_per_min": 1250,
        "error_rate": 0.3,
        "last_deploy": "2025-03-15T14:30:00",
        "version": "2.4.1",
    },
    "web-frontend": {
        "name": "Web Frontend",
        "host": "web-prod-01",
        "port": 3000,
        "status": "healthy",
        "uptime_hours": 360,
        "cpu_percent": 12.5,
        "memory_percent": 35.2,
        "disk_percent": 28.4,
        "requests_per_min": 3400,
        "error_rate": 0.1,
        "last_deploy": "2025-03-18T09:15:00",
        "version": "1.8.0",
    },
    "database": {
        "name": "PostgreSQL Primary",
        "host": "db-prod-01",
        "port": 5432,
        "status": "healthy",
        "uptime_hours": 2160,
        "cpu_percent": 45.8,
        "memory_percent": 72.3,
        "disk_percent": 65.9,
        "connections_active": 42,
        "connections_max": 100,
        "queries_per_sec": 580,
        "replication_lag_ms": 12,
        "last_deploy": "2025-02-28T03:00:00",
        "version": "15.4",
    },
    "redis-cache": {
        "name": "Redis Cache",
        "host": "cache-prod-01",
        "port": 6379,
        "status": "warning",
        "uptime_hours": 1440,
        "cpu_percent": 8.1,
        "memory_percent": 82.4,
        "disk_percent": 15.0,
        "hit_rate": 94.2,
        "keys_count": 284000,
        "last_deploy": "2025-03-01T06:00:00",
        "version": "7.2.3",
    },
    "worker-queue": {
        "name": "Background Worker",
        "host": "worker-prod-01",
        "port": 9090,
        "status": "healthy",
        "uptime_hours": 168,
        "cpu_percent": 22.3,
        "memory_percent": 41.5,
        "disk_percent": 33.0,
        "jobs_pending": 15,
        "jobs_processing": 3,
        "jobs_failed_24h": 2,
        "last_deploy": "2025-03-20T11:45:00",
        "version": "1.3.2",
    },
}

deployments: list[dict[str, Any]] = [
    {
        "id": "deploy-001",
        "service": "api-server",
        "version": "2.4.1",
        "status": "success",
        "deployed_by": "ci/cd",
        "started_at": "2025-03-15T14:25:00",
        "completed_at": "2025-03-15T14:30:00",
        "duration_sec": 300,
        "commit": "abc1234",
    },
    {
        "id": "deploy-002",
        "service": "web-frontend",
        "version": "1.8.0",
        "status": "success",
        "deployed_by": "alice",
        "started_at": "2025-03-18T09:10:00",
        "completed_at": "2025-03-18T09:15:00",
        "duration_sec": 300,
        "commit": "def5678",
    },
    {
        "id": "deploy-003",
        "service": "worker-queue",
        "version": "1.3.1",
        "status": "rolled_back",
        "deployed_by": "ci/cd",
        "started_at": "2025-03-19T16:00:00",
        "completed_at": "2025-03-19T16:08:00",
        "duration_sec": 480,
        "commit": "ghi9012",
        "rollback_reason": "Memory leak detected in new job handler",
    },
]

incidents: list[dict[str, Any]] = [
    {
        "id": "INC-042",
        "title": "Redis memory usage above 80%",
        "severity": "warning",
        "service": "redis-cache",
        "status": "investigating",
        "created_at": "2025-03-20T08:30:00",
        "acknowledged_by": "bob",
        "description": "Redis memory usage has been steadily climbing. Currently at 82.4%.",
    },
]

_log_templates = [
    "[INFO] Request handled: {method} {path} - {status} ({ms}ms)",
    "[INFO] Database query executed in {ms}ms",
    "[WARN] Slow query detected: {ms}ms on {path}",
    "[ERROR] Connection timeout to {service} after 30s",
    "[INFO] Cache hit for key {key}",
    "[WARN] Rate limit approaching: {count}/1000 requests",
    "[INFO] Health check passed for {service}",
    "[ERROR] Failed to process job {job_id}: {error}",
    "[INFO] User authentication successful: {user}",
    "[WARN] Disk usage at {percent}% on {host}",
]


def _generate_logs(service: str, count: int) -> list[dict[str, str]]:
    """Generate realistic-looking log entries."""
    logs = []
    now = datetime.now()
    methods = ["GET", "POST", "PUT", "DELETE"]
    paths = ["/api/users", "/api/orders", "/api/products", "/health", "/api/auth/login"]
    errors = ["timeout", "connection refused", "out of memory", "disk full"]

    for i in range(count):
        template = random.choice(_log_templates)
        timestamp = (now - timedelta(minutes=count - i)).isoformat()
        msg = template.format(
            method=random.choice(methods),
            path=random.choice(paths),
            status=random.choice([200, 200, 200, 201, 400, 500]),
            ms=random.randint(1, 2500),
            service=service,
            key=f"user:{random.randint(1000, 9999)}",
            count=random.randint(800, 999),
            job_id=f"job-{random.randint(1000, 9999)}",
            error=random.choice(errors),
            user=f"user_{random.randint(1, 100)}",
            percent=random.randint(60, 95),
            host=services.get(service, {}).get("host", "unknown"),
        )
        level = "INFO"
        if "[WARN]" in msg:
            level = "WARN"
        elif "[ERROR]" in msg:
            level = "ERROR"
        logs.append({"timestamp": timestamp, "level": level, "message": msg, "service": service})

    return logs


# ---------------------------------------------------------------------------
# MCP Tools
# ---------------------------------------------------------------------------


@server.tool()
async def get_system_health() -> str:
    """Get an overview of all services with their health status and key metrics."""
    overview = []
    warnings = []
    for svc_id, svc in services.items():
        entry: dict[str, Any] = {
            "service": svc["name"],
            "id": svc_id,
            "status": svc["status"],
            "host": svc["host"],
            "version": svc["version"],
            "cpu": f"{svc['cpu_percent']}%",
            "memory": f"{svc['memory_percent']}%",
            "disk": f"{svc['disk_percent']}%",
            "uptime_hours": svc["uptime_hours"],
        }
        overview.append(entry)

        if svc["cpu_percent"] > 80:
            warnings.append(f"{svc['name']}: CPU at {svc['cpu_percent']}%")
        if svc["memory_percent"] > 80:
            warnings.append(f"{svc['name']}: Memory at {svc['memory_percent']}%")
        if svc["disk_percent"] > 80:
            warnings.append(f"{svc['name']}: Disk at {svc['disk_percent']}%")
        if svc.get("error_rate", 0) > 1:
            warnings.append(f"{svc['name']}: Error rate at {svc['error_rate']}%")

    healthy = sum(1 for s in services.values() if s["status"] == "healthy")
    return json.dumps({
        "summary": {
            "total_services": len(services),
            "healthy": healthy,
            "degraded": len(services) - healthy,
            "active_incidents": len([i for i in incidents if i["status"] != "resolved"]),
        },
        "warnings": warnings,
        "services": overview,
    }, indent=2)


@server.tool()
async def get_service_details(service_id: str) -> str:
    """Get detailed metrics for a specific service.

    Args:
        service_id: Service identifier (e.g. 'api-server', 'database', 'redis-cache').
    """
    if service_id not in services:
        return json.dumps({"error": f"Service '{service_id}' not found. Valid: {list(services.keys())}"})

    svc = services[service_id]
    return json.dumps({"service": svc}, indent=2, default=str)


@server.tool()
async def get_logs(
    service_id: str,
    level: str = "",
    count: int = 20,
) -> str:
    """Retrieve recent logs for a service.

    Args:
        service_id: Service to get logs from.
        level: Filter by log level: 'INFO', 'WARN', 'ERROR' (optional).
        count: Number of log entries to retrieve (max 100).
    """
    if service_id not in services:
        return json.dumps({"error": f"Service '{service_id}' not found."})

    count = min(count, 100)
    logs = _generate_logs(service_id, count)

    if level:
        logs = [l for l in logs if l["level"] == level.upper()]

    error_count = sum(1 for l in logs if l["level"] == "ERROR")
    warn_count = sum(1 for l in logs if l["level"] == "WARN")

    return json.dumps({
        "service": service_id,
        "total": len(logs),
        "errors": error_count,
        "warnings": warn_count,
        "logs": logs,
    }, indent=2)


@server.tool()
async def list_deployments(
    service_id: str = "",
    status: str = "",
    limit: int = 10,
) -> str:
    """List recent deployments with optional filters.

    Args:
        service_id: Filter by service (optional).
        status: Filter by status: 'success', 'failed', 'rolled_back', 'in_progress' (optional).
        limit: Max results to return.
    """
    filtered = deployments
    if service_id:
        filtered = [d for d in filtered if d["service"] == service_id]
    if status:
        filtered = [d for d in filtered if d["status"] == status]

    filtered = filtered[-limit:]
    filtered.reverse()

    return json.dumps({"total": len(filtered), "deployments": filtered}, indent=2)


@server.tool()
async def trigger_deploy(
    service_id: str,
    version: str,
    deployed_by: str = "mcp-user",
) -> str:
    """Trigger a new deployment for a service (simulation).

    Args:
        service_id: Service to deploy.
        version: Version tag to deploy (e.g. '2.5.0').
        deployed_by: Who initiated the deploy.
    """
    if service_id not in services:
        return json.dumps({"error": f"Service '{service_id}' not found."})

    deploy_id = f"deploy-{len(deployments) + 1:03d}"
    now = datetime.now()

    new_deploy = {
        "id": deploy_id,
        "service": service_id,
        "version": version,
        "status": "success",
        "deployed_by": deployed_by,
        "started_at": now.isoformat(),
        "completed_at": (now + timedelta(minutes=3)).isoformat(),
        "duration_sec": 180,
        "commit": f"sim{random.randint(1000, 9999)}",
    }
    deployments.append(new_deploy)
    services[service_id]["version"] = version
    services[service_id]["last_deploy"] = now.isoformat()

    return json.dumps({
        "success": True,
        "deployment": new_deploy,
        "note": "Simulated deployment. Connect to your CI/CD pipeline for real deploys.",
    }, indent=2)


@server.tool()
async def manage_incident(
    action: str,
    incident_id: str = "",
    title: str = "",
    severity: str = "warning",
    service_id: str = "",
    description: str = "",
) -> str:
    """Create, update, or resolve an incident.

    Args:
        action: One of: 'create', 'acknowledge', 'resolve', 'list'.
        incident_id: Required for acknowledge/resolve.
        title: Required for create.
        severity: For create: 'critical', 'warning', 'info'.
        service_id: Affected service (for create).
        description: Incident description (for create).
    """
    if action == "list":
        return json.dumps({"total": len(incidents), "incidents": incidents}, indent=2)

    if action == "create":
        if not title:
            return json.dumps({"error": "Title is required for creating an incident."})
        inc_id = f"INC-{len(incidents) + 42:03d}"
        inc = {
            "id": inc_id,
            "title": title,
            "severity": severity,
            "service": service_id,
            "status": "open",
            "created_at": datetime.now().isoformat(),
            "acknowledged_by": None,
            "description": description,
        }
        incidents.append(inc)
        return json.dumps({"success": True, "incident": inc}, indent=2)

    if action in ("acknowledge", "resolve"):
        if not incident_id:
            return json.dumps({"error": f"incident_id is required for {action}."})
        for inc in incidents:
            if inc["id"] == incident_id:
                if action == "acknowledge":
                    inc["status"] = "investigating"
                    inc["acknowledged_by"] = "mcp-user"
                    inc["acknowledged_at"] = datetime.now().isoformat()
                else:
                    inc["status"] = "resolved"
                    inc["resolved_at"] = datetime.now().isoformat()
                return json.dumps({"success": True, "incident": inc}, indent=2)
        return json.dumps({"error": f"Incident {incident_id} not found."})

    return json.dumps({"error": f"Invalid action: {action}. Use: create, acknowledge, resolve, list."})


@server.tool()
async def get_resource_usage() -> str:
    """Get current resource usage across all services (CPU, memory, disk)."""
    usage = []
    for svc_id, svc in services.items():
        usage.append({
            "service": svc["name"],
            "id": svc_id,
            "host": svc["host"],
            "cpu_percent": svc["cpu_percent"],
            "memory_percent": svc["memory_percent"],
            "disk_percent": svc["disk_percent"],
            "cpu_status": "critical" if svc["cpu_percent"] > 90 else "warning" if svc["cpu_percent"] > 70 else "ok",
            "mem_status": "critical" if svc["memory_percent"] > 90 else "warning" if svc["memory_percent"] > 70 else "ok",
            "disk_status": "critical" if svc["disk_percent"] > 90 else "warning" if svc["disk_percent"] > 70 else "ok",
        })

    avg_cpu = sum(s["cpu_percent"] for s in services.values()) / len(services)
    avg_mem = sum(s["memory_percent"] for s in services.values()) / len(services)
    avg_disk = sum(s["disk_percent"] for s in services.values()) / len(services)

    return json.dumps({
        "averages": {
            "cpu": f"{avg_cpu:.1f}%",
            "memory": f"{avg_mem:.1f}%",
            "disk": f"{avg_disk:.1f}%",
        },
        "services": usage,
    }, indent=2)


# ---------------------------------------------------------------------------
# Run
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    server.run()

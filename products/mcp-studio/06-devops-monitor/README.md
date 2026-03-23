# 06 — DevOps Monitor MCP Server

Monitor infrastructure health, view logs, manage deployments, and handle incidents.

## Tools

| Tool | Description |
|------|-------------|
| `get_system_health` | Overview of all services with status and warnings |
| `get_service_details` | Deep-dive metrics for a specific service |
| `get_logs` | Retrieve recent logs with level filtering |
| `list_deployments` | Deployment history with status and rollback info |
| `trigger_deploy` | Simulate a deployment (connect to real CI/CD) |
| `manage_incident` | Create, acknowledge, resolve, and list incidents |
| `get_resource_usage` | CPU/memory/disk usage across all services |

## Example Prompts

- "What's the overall system health?"
- "Show me error logs from the API server"
- "Deploy version 2.5.0 to the web frontend"
- "Create a critical incident for the database — connections maxed out"
- "Which services have high memory usage?"

## Customization

- **Real monitoring**: Connect to Prometheus, Datadog, or CloudWatch APIs
- **Real logs**: Pipe from ELK, Loki, or CloudWatch Logs
- **Real deploys**: Integrate with GitHub Actions, ArgoCD, or AWS CodeDeploy
- **Alerting**: Add PagerDuty/OpsGenie integration for incidents

## Setup

```bash
pip install mcp pydantic
python server.py
```

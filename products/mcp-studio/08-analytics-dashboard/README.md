# 08 — Analytics Dashboard MCP Server

Track website metrics, analyze funnels, monitor retention, and generate executive reports.

## Tools

| Tool | Description |
|------|-------------|
| `get_metrics` | Daily metrics with period comparison (visitors, revenue, signups) |
| `get_traffic_sources` | Traffic breakdown by source with conversion rates |
| `get_top_pages` | Most visited pages with engagement stats |
| `get_funnel_analysis` | Conversion funnel analysis with drop-off points |
| `get_cohort_retention` | Weekly/monthly user retention by cohort |
| `generate_report` | Formatted reports: executive, marketing, product |

## Example Prompts

- "Show me this week's metrics compared to last week"
- "What are our top traffic sources?"
- "Analyze the signup funnel — where are we losing users?"
- "Generate an executive report for the last 30 days"
- "Show me monthly retention cohorts"

## Customization

- **Real analytics**: Connect to Google Analytics, Mixpanel, or Amplitude APIs
- **Real-time**: Add WebSocket-based live visitor tracking
- **Custom events**: Track custom product events and actions
- **A/B testing**: Add experiment tracking and statistical analysis
- **Alerting**: Set up threshold alerts for KPI drops

## Setup

```bash
pip install mcp pydantic
python server.py
```

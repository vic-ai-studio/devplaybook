# 02 — E-Commerce Inventory MCP Server

Complete inventory management for online stores: products, stock tracking, orders, and pricing.

## Tools

| Tool | Description |
|------|-------------|
| `search_products` | Search/filter products by name, category, status, or low stock |
| `add_product` | Add a new product with SKU, pricing, and stock |
| `update_stock` | Adjust stock levels with audit trail |
| `update_price` | Change selling price with margin calculation |
| `create_order` | Create orders with stock validation and tax calculation |
| `get_inventory_report` | Full report: stock value, alerts, category breakdown |
| `get_stock_history` | View stock adjustment audit log |

## Example Prompts

- "Show me all products that are low on stock"
- "Add a new product: Laptop Stand, SKU-004, $49.99, cost $15, 100 units"
- "Create an order for 2 headphones and 3 USB cables for John Smith"
- "Give me the full inventory report with total value"
- "What's the stock history for SKU-001?"

## Customization

- **Real database**: Swap in-memory dicts for PostgreSQL/MySQL with an ORM
- **Tax rules**: Modify tax calculation in `create_order` for your jurisdiction
- **Shipping**: Add shipping cost calculation to orders
- **Multi-warehouse**: Extend stock tracking per warehouse location
- **Webhooks**: Trigger low-stock alerts to Slack/email

## Setup

```bash
pip install mcp pydantic
python server.py
```

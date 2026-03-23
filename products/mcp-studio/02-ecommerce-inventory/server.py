"""
MCP Server: E-Commerce Inventory Management
Manage products, stock levels, orders, and pricing for online stores.
"""

import json
import uuid
from datetime import datetime
from typing import Any

from mcp.server.fastmcp import FastMCP

server = FastMCP("ecommerce-inventory")

# ---------------------------------------------------------------------------
# In-memory data store
# ---------------------------------------------------------------------------

products: dict[str, dict[str, Any]] = {
    "SKU-001": {
        "name": "Wireless Bluetooth Headphones",
        "sku": "SKU-001",
        "category": "Electronics",
        "price": 79.99,
        "cost": 32.00,
        "stock": 145,
        "low_stock_threshold": 20,
        "status": "active",
        "tags": ["audio", "wireless", "bestseller"],
        "created_at": "2025-01-15T10:00:00",
    },
    "SKU-002": {
        "name": "USB-C Charging Cable 6ft",
        "sku": "SKU-002",
        "category": "Accessories",
        "price": 12.99,
        "cost": 2.50,
        "stock": 430,
        "low_stock_threshold": 50,
        "status": "active",
        "tags": ["cable", "usb-c", "charging"],
        "created_at": "2025-01-20T10:00:00",
    },
    "SKU-003": {
        "name": "Ergonomic Mouse Pad",
        "sku": "SKU-003",
        "category": "Accessories",
        "price": 24.99,
        "cost": 6.00,
        "stock": 12,
        "low_stock_threshold": 25,
        "status": "active",
        "tags": ["ergonomic", "desk", "mouse"],
        "created_at": "2025-02-01T10:00:00",
    },
}

orders: dict[str, dict[str, Any]] = {}
stock_history: list[dict[str, Any]] = []


def _generate_id(prefix: str = "ORD") -> str:
    return f"{prefix}-{uuid.uuid4().hex[:8].upper()}"


# ---------------------------------------------------------------------------
# MCP Tools
# ---------------------------------------------------------------------------


@server.tool()
async def search_products(
    query: str = "",
    category: str = "",
    status: str = "",
    low_stock_only: bool = False,
) -> str:
    """Search and filter products in the inventory.

    Args:
        query: Search term to match against product name or tags (optional).
        category: Filter by category name (optional).
        status: Filter by status: 'active', 'draft', 'archived' (optional).
        low_stock_only: If true, only return products below their low stock threshold.
    """
    results = []
    for sku, product in products.items():
        if status and product["status"] != status:
            continue
        if category and product["category"].lower() != category.lower():
            continue
        if low_stock_only and product["stock"] >= product["low_stock_threshold"]:
            continue
        if query:
            q = query.lower()
            name_match = q in product["name"].lower()
            tag_match = any(q in tag for tag in product.get("tags", []))
            if not name_match and not tag_match:
                continue
        margin = ((product["price"] - product["cost"]) / product["price"] * 100) if product["price"] > 0 else 0
        results.append({
            **product,
            "margin_percent": round(margin, 1),
            "is_low_stock": product["stock"] < product["low_stock_threshold"],
        })

    results.sort(key=lambda p: p["name"])
    return json.dumps({"total": len(results), "products": results}, indent=2)


@server.tool()
async def add_product(
    name: str,
    sku: str,
    category: str,
    price: float,
    cost: float,
    stock: int,
    low_stock_threshold: int = 20,
    tags: str = "",
) -> str:
    """Add a new product to the inventory.

    Args:
        name: Product display name.
        sku: Unique SKU identifier.
        category: Product category.
        price: Selling price.
        cost: Cost/wholesale price.
        stock: Initial stock quantity.
        low_stock_threshold: Alert when stock falls below this number.
        tags: Comma-separated tags for search.
    """
    if sku in products:
        return json.dumps({"error": f"SKU {sku} already exists."})
    if price < 0 or cost < 0 or stock < 0:
        return json.dumps({"error": "Price, cost, and stock must be non-negative."})

    tag_list = [t.strip() for t in tags.split(",") if t.strip()] if tags else []
    products[sku] = {
        "name": name,
        "sku": sku,
        "category": category,
        "price": price,
        "cost": cost,
        "stock": stock,
        "low_stock_threshold": low_stock_threshold,
        "status": "active",
        "tags": tag_list,
        "created_at": datetime.now().isoformat(),
    }
    return json.dumps({"success": True, "product": products[sku]}, indent=2)


@server.tool()
async def update_stock(sku: str, quantity_change: int, reason: str = "") -> str:
    """Adjust stock level for a product (positive to add, negative to remove).

    Args:
        sku: Product SKU.
        quantity_change: Number to add (positive) or remove (negative).
        reason: Reason for the adjustment (e.g. 'restock', 'damaged', 'count correction').
    """
    if sku not in products:
        return json.dumps({"error": f"Product {sku} not found."})

    product = products[sku]
    old_stock = product["stock"]
    new_stock = old_stock + quantity_change

    if new_stock < 0:
        return json.dumps({"error": f"Cannot reduce stock below 0. Current: {old_stock}, change: {quantity_change}."})

    product["stock"] = new_stock
    entry = {
        "sku": sku,
        "product_name": product["name"],
        "old_stock": old_stock,
        "change": quantity_change,
        "new_stock": new_stock,
        "reason": reason,
        "timestamp": datetime.now().isoformat(),
    }
    stock_history.append(entry)

    alert = ""
    if new_stock < product["low_stock_threshold"]:
        alert = f"WARNING: Stock ({new_stock}) is below threshold ({product['low_stock_threshold']})."

    return json.dumps({"success": True, **entry, "alert": alert}, indent=2)


@server.tool()
async def update_price(sku: str, new_price: float, reason: str = "") -> str:
    """Update the selling price of a product.

    Args:
        sku: Product SKU.
        new_price: New selling price.
        reason: Reason for the price change (optional).
    """
    if sku not in products:
        return json.dumps({"error": f"Product {sku} not found."})
    if new_price < 0:
        return json.dumps({"error": "Price must be non-negative."})

    product = products[sku]
    old_price = product["price"]
    product["price"] = new_price
    margin = ((new_price - product["cost"]) / new_price * 100) if new_price > 0 else 0

    return json.dumps({
        "success": True,
        "sku": sku,
        "product": product["name"],
        "old_price": f"${old_price:.2f}",
        "new_price": f"${new_price:.2f}",
        "change_percent": f"{((new_price - old_price) / old_price * 100):.1f}%" if old_price > 0 else "N/A",
        "new_margin": f"{margin:.1f}%",
        "reason": reason,
    }, indent=2)


@server.tool()
async def create_order(
    customer_name: str,
    customer_email: str,
    items: str,
) -> str:
    """Create a new order. Validates stock and calculates totals.

    Args:
        customer_name: Customer full name.
        customer_email: Customer email.
        items: JSON string of items, e.g. '[{"sku": "SKU-001", "quantity": 2}]'.
    """
    try:
        item_list = json.loads(items)
    except json.JSONDecodeError:
        return json.dumps({"error": "Invalid items JSON. Expected: [{\"sku\": \"...\", \"quantity\": N}]"})

    # Validate all items first
    order_lines = []
    for item in item_list:
        sku = item.get("sku", "")
        qty = item.get("quantity", 1)
        if sku not in products:
            return json.dumps({"error": f"Product {sku} not found."})
        if products[sku]["stock"] < qty:
            return json.dumps({
                "error": f"Insufficient stock for {sku}. Available: {products[sku]['stock']}, requested: {qty}."
            })
        order_lines.append({
            "sku": sku,
            "name": products[sku]["name"],
            "quantity": qty,
            "unit_price": products[sku]["price"],
            "line_total": products[sku]["price"] * qty,
        })

    # Deduct stock
    for item in item_list:
        products[item["sku"]]["stock"] -= item["quantity"]

    order_id = _generate_id("ORD")
    subtotal = sum(line["line_total"] for line in order_lines)
    tax = round(subtotal * 0.08, 2)  # 8% tax
    total = round(subtotal + tax, 2)

    orders[order_id] = {
        "order_id": order_id,
        "customer_name": customer_name,
        "customer_email": customer_email,
        "items": order_lines,
        "subtotal": subtotal,
        "tax": tax,
        "total": total,
        "status": "confirmed",
        "created_at": datetime.now().isoformat(),
    }

    return json.dumps({"success": True, "order": orders[order_id]}, indent=2, default=str)


@server.tool()
async def get_inventory_report() -> str:
    """Generate a comprehensive inventory report with stock levels, value, and alerts."""
    total_items = 0
    total_retail_value = 0.0
    total_cost_value = 0.0
    low_stock_alerts = []
    out_of_stock = []
    by_category: dict[str, dict] = {}

    for sku, p in products.items():
        if p["status"] != "active":
            continue
        total_items += p["stock"]
        retail = p["price"] * p["stock"]
        cost = p["cost"] * p["stock"]
        total_retail_value += retail
        total_cost_value += cost

        cat = p["category"]
        if cat not in by_category:
            by_category[cat] = {"product_count": 0, "total_stock": 0, "retail_value": 0.0}
        by_category[cat]["product_count"] += 1
        by_category[cat]["total_stock"] += p["stock"]
        by_category[cat]["retail_value"] += retail

        if p["stock"] == 0:
            out_of_stock.append({"sku": sku, "name": p["name"]})
        elif p["stock"] < p["low_stock_threshold"]:
            low_stock_alerts.append({
                "sku": sku,
                "name": p["name"],
                "stock": p["stock"],
                "threshold": p["low_stock_threshold"],
            })

    return json.dumps({
        "summary": {
            "total_skus": len([p for p in products.values() if p["status"] == "active"]),
            "total_units": total_items,
            "total_retail_value": f"${total_retail_value:,.2f}",
            "total_cost_value": f"${total_cost_value:,.2f}",
            "potential_profit": f"${(total_retail_value - total_cost_value):,.2f}",
        },
        "by_category": by_category,
        "low_stock_alerts": low_stock_alerts,
        "out_of_stock": out_of_stock,
        "total_orders": len(orders),
    }, indent=2)


@server.tool()
async def get_stock_history(sku: str = "", limit: int = 20) -> str:
    """View stock adjustment history.

    Args:
        sku: Filter by product SKU (optional, shows all if empty).
        limit: Maximum number of entries to return (default 20).
    """
    filtered = stock_history
    if sku:
        filtered = [h for h in filtered if h["sku"] == sku]
    recent = filtered[-limit:]
    recent.reverse()
    return json.dumps({"total": len(filtered), "showing": len(recent), "history": recent}, indent=2)


# ---------------------------------------------------------------------------
# Run
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    server.run()

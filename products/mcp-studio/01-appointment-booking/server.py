"""
MCP Server: Appointment Booking System
Manage appointments, clients, and availability for service-based businesses.
"""

import json
import uuid
from datetime import datetime, timedelta
from typing import Any

from mcp.server.fastmcp import FastMCP

server = FastMCP("appointment-booking")

# ---------------------------------------------------------------------------
# In-memory data store (replace with your database in production)
# ---------------------------------------------------------------------------

appointments: dict[str, dict[str, Any]] = {}
clients: dict[str, dict[str, Any]] = {}
services: dict[str, dict[str, Any]] = {
    "haircut": {"name": "Haircut", "duration_min": 30, "price": 35.00},
    "coloring": {"name": "Hair Coloring", "duration_min": 90, "price": 120.00},
    "manicure": {"name": "Manicure", "duration_min": 45, "price": 40.00},
    "facial": {"name": "Facial Treatment", "duration_min": 60, "price": 80.00},
    "massage": {"name": "Massage", "duration_min": 60, "price": 90.00},
}

# Business hours: 9 AM - 6 PM, Mon-Sat
BUSINESS_HOURS = {"start": 9, "end": 18}
DAYS_OFF = [6]  # Sunday = 6


def _generate_id() -> str:
    return uuid.uuid4().hex[:8]


def _parse_datetime(dt_str: str) -> datetime:
    """Parse ISO format or common date-time strings."""
    for fmt in ("%Y-%m-%dT%H:%M", "%Y-%m-%d %H:%M", "%Y-%m-%dT%H:%M:%S"):
        try:
            return datetime.strptime(dt_str, fmt)
        except ValueError:
            continue
    raise ValueError(f"Cannot parse datetime: {dt_str}. Use YYYY-MM-DDTHH:MM format.")


def _is_within_business_hours(dt: datetime, duration_min: int) -> bool:
    if dt.weekday() in DAYS_OFF:
        return False
    end_dt = dt + timedelta(minutes=duration_min)
    if dt.hour < BUSINESS_HOURS["start"] or end_dt.hour > BUSINESS_HOURS["end"]:
        return False
    return True


def _has_conflict(start: datetime, duration_min: int, exclude_id: str | None = None) -> bool:
    end = start + timedelta(minutes=duration_min)
    for appt_id, appt in appointments.items():
        if appt_id == exclude_id or appt["status"] == "cancelled":
            continue
        appt_start = datetime.fromisoformat(appt["start_time"])
        appt_end = appt_start + timedelta(minutes=appt["duration_min"])
        if start < appt_end and end > appt_start:
            return True
    return False


# ---------------------------------------------------------------------------
# MCP Tools
# ---------------------------------------------------------------------------


@server.tool()
async def list_services() -> str:
    """List all available services with their duration and pricing."""
    result = []
    for key, svc in services.items():
        result.append({
            "id": key,
            "name": svc["name"],
            "duration_minutes": svc["duration_min"],
            "price": svc["price"],
        })
    return json.dumps({"services": result}, indent=2)


@server.tool()
async def check_availability(date: str, service_id: str) -> str:
    """Check available time slots for a given date and service.

    Args:
        date: Date to check in YYYY-MM-DD format.
        service_id: Service identifier (e.g. 'haircut', 'manicure').
    """
    if service_id not in services:
        return json.dumps({"error": f"Unknown service: {service_id}. Use list_services to see options."})

    try:
        target_date = datetime.strptime(date, "%Y-%m-%d")
    except ValueError:
        return json.dumps({"error": "Invalid date format. Use YYYY-MM-DD."})

    if target_date.weekday() in DAYS_OFF:
        return json.dumps({"date": date, "available_slots": [], "note": "Business is closed on Sundays."})

    duration = services[service_id]["duration_min"]
    available_slots = []
    current = target_date.replace(hour=BUSINESS_HOURS["start"], minute=0)
    end_of_day = target_date.replace(hour=BUSINESS_HOURS["end"], minute=0)

    while current + timedelta(minutes=duration) <= end_of_day:
        if not _has_conflict(current, duration):
            available_slots.append(current.strftime("%H:%M"))
        current += timedelta(minutes=30)  # 30-min increments

    return json.dumps({
        "date": date,
        "service": services[service_id]["name"],
        "duration_minutes": duration,
        "available_slots": available_slots,
        "total_available": len(available_slots),
    }, indent=2)


@server.tool()
async def book_appointment(
    client_name: str,
    client_email: str,
    service_id: str,
    start_time: str,
    notes: str = "",
) -> str:
    """Book a new appointment.

    Args:
        client_name: Full name of the client.
        client_email: Client email address.
        service_id: Service identifier (e.g. 'haircut', 'manicure').
        start_time: Appointment start time in YYYY-MM-DDTHH:MM format.
        notes: Optional notes for the appointment.
    """
    if service_id not in services:
        return json.dumps({"error": f"Unknown service: {service_id}."})

    try:
        dt = _parse_datetime(start_time)
    except ValueError as e:
        return json.dumps({"error": str(e)})

    svc = services[service_id]
    duration = svc["duration_min"]

    if not _is_within_business_hours(dt, duration):
        return json.dumps({"error": "Time is outside business hours (Mon-Sat, 9AM-6PM)."})

    if _has_conflict(dt, duration):
        return json.dumps({"error": "Time slot conflicts with an existing appointment."})

    # Upsert client
    client_id = None
    for cid, c in clients.items():
        if c["email"] == client_email:
            client_id = cid
            break
    if client_id is None:
        client_id = _generate_id()
        clients[client_id] = {
            "name": client_name,
            "email": client_email,
            "created_at": datetime.now().isoformat(),
        }

    appt_id = _generate_id()
    appointments[appt_id] = {
        "client_id": client_id,
        "client_name": client_name,
        "client_email": client_email,
        "service_id": service_id,
        "service_name": svc["name"],
        "start_time": dt.isoformat(),
        "duration_min": duration,
        "price": svc["price"],
        "status": "confirmed",
        "notes": notes,
        "created_at": datetime.now().isoformat(),
    }

    return json.dumps({
        "success": True,
        "appointment_id": appt_id,
        "summary": {
            "client": client_name,
            "service": svc["name"],
            "date": dt.strftime("%Y-%m-%d"),
            "time": dt.strftime("%H:%M"),
            "duration": f"{duration} min",
            "price": f"${svc['price']:.2f}",
            "status": "confirmed",
        },
    }, indent=2)


@server.tool()
async def cancel_appointment(appointment_id: str, reason: str = "") -> str:
    """Cancel an existing appointment.

    Args:
        appointment_id: The appointment ID to cancel.
        reason: Optional cancellation reason.
    """
    if appointment_id not in appointments:
        return json.dumps({"error": f"Appointment {appointment_id} not found."})

    appt = appointments[appointment_id]
    if appt["status"] == "cancelled":
        return json.dumps({"error": "Appointment is already cancelled."})

    appt["status"] = "cancelled"
    appt["cancelled_at"] = datetime.now().isoformat()
    appt["cancel_reason"] = reason

    return json.dumps({
        "success": True,
        "appointment_id": appointment_id,
        "client": appt["client_name"],
        "service": appt["service_name"],
        "was_scheduled_for": appt["start_time"],
        "cancel_reason": reason or "No reason provided",
    }, indent=2)


@server.tool()
async def reschedule_appointment(appointment_id: str, new_start_time: str) -> str:
    """Reschedule an existing appointment to a new time.

    Args:
        appointment_id: The appointment ID to reschedule.
        new_start_time: New start time in YYYY-MM-DDTHH:MM format.
    """
    if appointment_id not in appointments:
        return json.dumps({"error": f"Appointment {appointment_id} not found."})

    appt = appointments[appointment_id]
    if appt["status"] == "cancelled":
        return json.dumps({"error": "Cannot reschedule a cancelled appointment."})

    try:
        new_dt = _parse_datetime(new_start_time)
    except ValueError as e:
        return json.dumps({"error": str(e)})

    duration = appt["duration_min"]

    if not _is_within_business_hours(new_dt, duration):
        return json.dumps({"error": "New time is outside business hours (Mon-Sat, 9AM-6PM)."})

    if _has_conflict(new_dt, duration, exclude_id=appointment_id):
        return json.dumps({"error": "New time conflicts with an existing appointment."})

    old_time = appt["start_time"]
    appt["start_time"] = new_dt.isoformat()
    appt["rescheduled_at"] = datetime.now().isoformat()

    return json.dumps({
        "success": True,
        "appointment_id": appointment_id,
        "client": appt["client_name"],
        "old_time": old_time,
        "new_time": new_dt.isoformat(),
        "service": appt["service_name"],
    }, indent=2)


@server.tool()
async def get_appointments(
    date: str = "",
    status: str = "",
    client_email: str = "",
) -> str:
    """Get appointments with optional filters.

    Args:
        date: Filter by date in YYYY-MM-DD format (optional).
        status: Filter by status: 'confirmed' or 'cancelled' (optional).
        client_email: Filter by client email (optional).
    """
    results = []
    for appt_id, appt in appointments.items():
        if status and appt["status"] != status:
            continue
        if client_email and appt["client_email"] != client_email:
            continue
        if date:
            appt_date = datetime.fromisoformat(appt["start_time"]).strftime("%Y-%m-%d")
            if appt_date != date:
                continue
        results.append({"id": appt_id, **appt})

    results.sort(key=lambda a: a["start_time"])
    return json.dumps({
        "total": len(results),
        "appointments": results,
    }, indent=2, default=str)


@server.tool()
async def get_daily_summary(date: str) -> str:
    """Get a summary of the day's schedule including revenue and utilization.

    Args:
        date: Date in YYYY-MM-DD format.
    """
    day_appts = []
    for appt_id, appt in appointments.items():
        appt_date = datetime.fromisoformat(appt["start_time"]).strftime("%Y-%m-%d")
        if appt_date == date and appt["status"] == "confirmed":
            day_appts.append({"id": appt_id, **appt})

    day_appts.sort(key=lambda a: a["start_time"])
    total_revenue = sum(a["price"] for a in day_appts)
    total_minutes = sum(a["duration_min"] for a in day_appts)
    available_minutes = (BUSINESS_HOURS["end"] - BUSINESS_HOURS["start"]) * 60
    utilization = (total_minutes / available_minutes * 100) if available_minutes > 0 else 0

    schedule = []
    for a in day_appts:
        start = datetime.fromisoformat(a["start_time"])
        end = start + timedelta(minutes=a["duration_min"])
        schedule.append({
            "time": f"{start.strftime('%H:%M')} - {end.strftime('%H:%M')}",
            "client": a["client_name"],
            "service": a["service_name"],
            "price": f"${a['price']:.2f}",
        })

    return json.dumps({
        "date": date,
        "total_appointments": len(day_appts),
        "total_revenue": f"${total_revenue:.2f}",
        "booked_minutes": total_minutes,
        "utilization": f"{utilization:.1f}%",
        "schedule": schedule,
    }, indent=2)


# ---------------------------------------------------------------------------
# Run
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    server.run()

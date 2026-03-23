# 01 — Appointment Booking MCP Server

A complete appointment management system for service-based businesses (salons, clinics, consultants, etc.).

## Tools

| Tool | Description |
|------|-------------|
| `list_services` | List all available services with duration and pricing |
| `check_availability` | Find open time slots for a specific date and service |
| `book_appointment` | Create a new confirmed appointment |
| `cancel_appointment` | Cancel an existing appointment with optional reason |
| `reschedule_appointment` | Move an appointment to a new time slot |
| `get_appointments` | Query appointments with date/status/client filters |
| `get_daily_summary` | Revenue, utilization, and full schedule for a day |

## Example Prompts

- "What slots are available for a haircut on Friday?"
- "Book a manicure for Jane at 2pm tomorrow"
- "Cancel appointment abc123 — client called in sick"
- "Show me today's schedule and total revenue"
- "Reschedule appointment xyz789 to next Monday at 10am"

## Customization

- **Add services**: Edit the `services` dict with your own offerings
- **Change hours**: Modify `BUSINESS_HOURS` and `DAYS_OFF`
- **Real database**: Replace the in-memory dicts with SQLAlchemy/asyncpg queries
- **Notifications**: Add email/SMS sending in `book_appointment` and `cancel_appointment`
- **Multiple providers**: Extend the data model to support multiple staff members

## Setup

```bash
pip install mcp pydantic
python server.py
```

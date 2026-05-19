# Technician Portal Backend Documentation

## Overview

The Technician Portal enables service technicians to manage repair jobs, quotes, customer interactions, and earnings. This backend provides all necessary API endpoints to support the frontend portal.

## Architecture

### Models (PostgreSQL)

All models are defined in `models/technician.py`:

- **TechnicianProfile**: Technician account, verification status, specialties, ratings
- **RepairRequest**: Customer-submitted repair requests (incoming)
- **ActiveJob**: Accepted repairs with quotes, status, timeline
- **QuoteLineItem**: Line items (labor, parts) in a job quote
- **RepairMessage**: Chat messages between technician and customer
- **CompletedJob**: Historical completed repairs with payment status
- **PayoutMethod**: Technician payout accounts (M-Pesa, bank, etc.)

**Enums**:
- `JobStatusEnum`: new_request → quote_sent → quote_accepted → diagnosed → parts_ordered → in_repair → ready → completed
- `PayoutStatusEnum`: pending (escrow) → processing → paid
- `UrgencyEnum`: low, medium, high
- `ServiceModeEnum`: drop_off, home_visit, either
- `PartsPreferenceEnum`: oem_only, oem_or_aftermarket, cheapest, tech_choice

### Router (`routers/technician.py`)

All endpoints require `user_id` query parameter (from auth token in production).

#### Dashboard & Profile

- **GET `/api/technician/dashboard`**: Summary of profile, incoming requests, active jobs, and earnings
- **GET `/api/technician/profile`**: Detailed technician profile
- **PUT `/api/technician/profile`**: Update profile info (location, bio, specialties, pricing)
- **PATCH `/api/technician/availability`**: Toggle availability status

#### Incoming Requests

- **GET `/api/technician/requests`**: List open incoming repair requests
- **POST `/api/technician/requests/{request_id}/decline`**: Decline a request

#### Quotes & Jobs

- **POST `/api/technician/quotes`**: Send a quote to a customer
  - Creates an `ActiveJob` with `quote_sent` status
  - Accepts line items (labor, parts, etc.)
  - Marks request as `quote_sent`

- **GET `/api/technician/jobs`**: Get all active jobs (excludes completed/declined)
- **PATCH `/api/technician/jobs/{job_id}/status`**: Update job status (moves through lifecycle)
  - Automatically increments progress percentage
  - Records `started_at` on first non-quote status
  - Records `completed_at` when marked complete

#### Messaging

- **POST `/api/technician/jobs/{job_id}/messages`**: Send a message to customer
- **GET `/api/technician/jobs/{job_id}/messages`**: Retrieve job messages

#### History & Earnings

- **GET `/api/technician/history`**: List completed jobs with payment status and reviews
- **GET `/api/technician/earnings`**: Earnings summary (this month, last month, all-time, pending)

## Setup Instructions

### 1. Install Dependencies

Ensure `models/technician.py` imports are in `requirements.txt`:

```bash
cd backend/catalogue
pip install -r requirements.txt
```

### 2. Create Database Tables

The models will auto-create on app startup via SQLAlchemy:

```bash
python server.py
```

This will initialize all technician tables in PostgreSQL.

### 3. Verify API

Check that the router is registered:

```bash
curl http://localhost:8000/docs
```

You should see `/api/technician/*` endpoints in the Swagger UI.

## Frontend Integration

The frontend calls these endpoints from `frontend/app/technician/page.tsx`:

### Key Flow

1. **Dashboard Load** → `GET /api/technician/dashboard`
2. **View Requests** → `GET /api/technician/requests`
3. **Send Quote** → `POST /api/technician/quotes`
4. **View Jobs** → `GET /api/technician/jobs`
5. **Update Status** → `PATCH /api/technician/jobs/{id}/status`
6. **Message** → `POST /api/technician/jobs/{id}/messages`
7. **View Earnings** → `GET /api/technician/earnings`

### Authentication

Currently endpoints use `user_id` from query params. In production, this should come from JWT token:

```python
from fastapi_jwt_auth import AuthJWT

@router.get("/dashboard")
async def get_dashboard(Authorize: AuthJWT = Depends()):
    current_user = Authorize.get_jwt_subject()
    # ...
```

## API Response Examples

### Dashboard Response
```json
{
  "profile": {
    "id": 1,
    "name": "Samuel Kiprotich",
    "phone": "+254712345678",
    "email": "samuel@example.com",
    "location": "Westlands, Nairobi",
    "bio": "10 years repairing laptops...",
    "specialties": ["Laptop", "Screen", "Motherboard"],
    "min_price": 1500,
    "warranty_days": 90,
    "service_radius": 10,
    "available": true,
    "iprs_verified": true,
    "insured": true,
    "rating": 4.9,
    "review_count": 142,
    "joined_at": "2023-01-15T10:00:00Z"
  },
  "incoming_count": 3,
  "active_jobs_count": 5,
  "earnings": {
    "this_month": 27300,
    "last_month": 41200,
    "all_time": 312800,
    "pending": 13000,
    "jobs_this_month": 8,
    "avg_job_value": 6500,
    "completion_rate": 96
  }
}
```

### Active Job Response
```json
{
  "id": 42,
  "request_id": 15,
  "customer_id": 5,
  "customer_name": "James Mwangi",
  "customer_phone": "+254700111222",
  "device": "Laptop",
  "brand": "Dell XPS 15",
  "issue": "Screen flickering...",
  "status": "in_repair",
  "urgency": "medium",
  "service_mode": "drop_off",
  "location": "Westlands",
  "quoted_amount": 12000,
  "quote_line_items": [
    { "id": 1, "description": "Screen replacement", "amount": 10000 },
    { "id": 2, "description": "Labour", "amount": 2000 }
  ],
  "parts_ordered": true,
  "parts_cost": 10000,
  "started_at": "2025-05-13T10:00:00Z",
  "completed_at": null,
  "warranty_days": 90,
  "notes": "ETA for parts: May 16",
  "progress_percent": 80
}
```

## Database Queries

### Get technician's monthly earnings
```sql
SELECT SUM(amount) as total 
FROM completed_jobs 
WHERE technician_id = 1 
  AND completed_at >= NOW() - INTERVAL '30 days'
  AND payout_status = 'paid';
```

### Get active jobs by status
```sql
SELECT * FROM active_jobs 
WHERE technician_id = 1 
  AND status NOT IN ('completed', 'declined', 'cancelled')
ORDER BY progress_percent DESC;
```

### Get pending payouts
```sql
SELECT * FROM completed_jobs 
WHERE technician_id = 1 
  AND payout_status = 'pending';
```

## Future Enhancements

1. **Real-time notifications**: WebSocket for incoming requests
2. **Payment integration**: Stripe/M-Pesa for escrow and payouts
3. **File uploads**: Photos for diagnostics
4. **Rating/review system**: Customer reviews on completion
5. **Search/filtering**: Advanced request search by location, urgency, budget
6. **Admin analytics**: Dashboard for managing technicians
7. **Verification workflow**: IPRS ID verification, insurance certificate uploads
8. **Warranty tracking**: Automated warranty expiry notifications
9. **Performance metrics**: Completion rate, avg turnaround time, quality scores

## Testing

### Test Endpoints Locally

```bash
# Get dashboard
curl -X GET "http://localhost:8000/api/technician/dashboard?user_id=1"

# Get incoming requests
curl -X GET "http://localhost:8000/api/technician/requests?user_id=1"

# Send a quote
curl -X POST "http://localhost:8000/api/technician/quotes?user_id=1" \
  -H "Content-Type: application/json" \
  -d '{
    "request_id": 1,
    "line_items": [
      {"description": "Labour", "amount": 2000},
      {"description": "Parts", "amount": 5000}
    ],
    "notes": "Will need to inspect first",
    "warranty_days": 30
  }'
```

## Troubleshooting

### Models not creating tables
- Ensure `from models import technician_model` is in `app/main.py`
- Run `python server.py` to trigger `Base.metadata.create_all()`

### 404 on `/api/technician/*`
- Check that `technician` router is included in `app/main.py`
- Verify `routers/technician.py` exists and exports `router`

### Missing `user_id` error
- Pass `?user_id=1` in request query params for testing
- In production, extract from JWT token in middleware


# Field Reports — Backend & Chaos Engineering Service

Production-ready backend built in **Node.js + Express + TypeScript** with built-in **Chaos Simulation** (on-demand connection drops, latency, hanging requests, and 500 errors) and strict **Idempotency** guarantees ("Nothing lands twice").

---

## 🚀 Quick Start (Local & Docker)

### Option 1: Run with Docker Compose (Recommended)
Make sure Docker Desktop is running:
```bash
docker compose up --build
```
The server will be live at `http://localhost:3000`.

### Option 2: Run directly with Node.js
```bash
cd backend
npm install
npm run dev
```

### Run Automated Verification Suite
To verify all 9 core backend requirements (including idempotency, 5MB ceiling, and chaos drops):
```bash
cd backend
npm test
```

---

## ⚡ Network Addresses for Mobile App

- **Local Host / Browser:** `http://localhost:3000`
- **Android Emulator:** `http://10.0.2.2:3000`
- **Physical Device (over Wi-Fi):** `http://<YOUR_COMPUTER_LAN_IP>:3000`

---

## 🛠️ Fail on Demand (Chaos Simulation)

The evaluator can trigger simulated failures either per-request using **HTTP Headers** or globally across all requests:

### 1. Per-Request Header Triggers (Instant testing via Mobile or Postman)

| Header | Example Value | Behavior |
| :--- | :--- | :--- |
| `x-chaos-drop` | `true` | Immediately destroys the TCP socket mid-request (`req.socket.destroy()`). |
| `x-chaos-hang` | `true` | Holds connection open forever without answering (tests client timeout). |
| `x-chaos-delay`| `4000` | Injects 4,000 ms artificial delay (simulates 2G latency). |
| `x-chaos-error`| `503` | Returns forced HTTP status code (e.g. 500, 502, 503). |

### 2. Global Chaos Simulation (API Trigger)

Check current status:
```bash
GET http://localhost:3000/api/chaos
```

Enable random failures & latency:
```bash
POST http://localhost:3000/api/chaos
Content-Type: application/json

{
  "enabled": true,
  "delayMs": 3000,
  "failureRate": 0.2,
  "dropRate": 0.3
}
```

---

## 📋 API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/` | Service health status and limits |
| `POST`| `/api/reports` | Multipart report upload (`clientReportId`, `description`, `images` array) |
| `GET` | `/api/reports` | List all reports stored on server (for Review screen) |
| `GET` | `/api/reports/:id` | Get single report details |
| `POST`| `/api/reset` | **Start over**: wipes all reports and uploaded images from disk |
| `GET` | `/api/chaos` | Get current chaos simulation configuration |
| `POST`| `/api/chaos` | Update global chaos simulation parameters |

---

## 🛡️ Delivery Guarantees Implemented

1. **Nothing lands twice (Idempotency):**
   - The app sends a persistent `clientReportId` (UUID) with each report.
   - If an upload request was processed by the backend but the response was dropped over 2G, the mobile app retries with the same `clientReportId`.
   - The backend detects the existing record, avoids duplicate insertion, deletes duplicate incoming files, and returns `200 OK` with the existing report.
2. **5 MB Destination Ceiling:**
   - Files exceeding 5 MB are rejected immediately with `413 Payload Too Large`.
3. **1–5 Images Bound:**
   - Enforced by validation middleware; reports with 0 or >5 images are rejected with `400 Bad Request`.
4. **Non-blank Description:**
   - Enforced by controller validation.

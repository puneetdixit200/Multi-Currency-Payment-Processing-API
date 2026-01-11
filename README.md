# PayFlow - Multi-Currency Payment Processing Platform

A production-ready fintech platform with real-time FX rates, offline-first storage, compliance-grade audit trails, and an immersive React UI.

![PayFlow Dashboard](https://via.placeholder.com/800x400?text=PayFlow+Dashboard)

## Features

### Backend (Node.js + Express)
- **22+ REST Endpoints** - Payments, currencies, merchants, settlements, audit logs
- **JWT Authentication** - Role-Based Access Control (Admin, Manager, Merchant)
- **Payment Engine** - Real-time conversion, smart fees, lifecycle management
- **Exchange Rate Engine** - Live FX rates with <50ms conversion latency
- **Compliance-Grade Audit** - Immutable logs with before/after snapshots
- **Fraud Prevention** - Velocity checks, duplicate detection, anomaly alerts
- **Idempotency** - Safe retries with idempotency keys

### Frontend (React + Tailwind)
- **Dark Mode UI** - Glassmorphism design with smooth animations
- **3D Visualizations** - Three.js transaction flow
- **Real-Time Dashboard** - Live exchange rates, charts, analytics
- **Responsive Design** - Works on all devices

## Quick Start

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)

### Installation

```bash
# Clone and install backend
cd backend
npm install
cp .env.example .env

# Install frontend
cd ../frontend
npm install
```

### Development

```bash
# Terminal 1 - Start MongoDB (if local)
mongod

# Terminal 2 - Start backend
cd backend
npm run dev

# Terminal 3 - Start frontend
cd frontend
npm run dev
```

Open http://localhost:5173

### Seed Database

```bash
cd backend
npm run seed
```

Test credentials:
- **Admin**: admin@payflow.com / Admin123!
- **Manager**: manager@payflow.com / Manager123!
- **Merchant**: merchant@techflow.com / Merchant123!

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/v1/auth/register | Register user |
| POST | /api/v1/auth/login | Login |
| POST | /api/v1/auth/logout | Logout |
| POST | /api/v1/auth/refresh | Refresh token |

### Payments
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/v1/payments | Create payment |
| GET | /api/v1/payments | List payments |
| GET | /api/v1/payments/:id | Get payment |
| POST | /api/v1/payments/:id/execute | Execute payment |
| POST | /api/v1/payments/:id/refund | Refund payment |

### Currencies
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/v1/currencies | List supported |
| GET | /api/v1/currencies/rates | Current rates |
| POST | /api/v1/currencies/convert | Convert amount |
| GET | /api/v1/currencies/rates/history | Rate history |

### Merchants
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/v1/merchants | Create merchant |
| GET | /api/v1/merchants | List merchants |
| GET | /api/v1/merchants/:id | Get details |
| PUT | /api/v1/merchants/:id/approve | Approve |

### Settlements
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/v1/settlements/batch | Create batch |
| GET | /api/v1/settlements | List settlements |
| POST | /api/v1/settlements/:id/reconcile | Reconcile |

### Audit Logs
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/v1/audit-logs | Search logs |
| GET | /api/v1/audit-logs/compliance-report | Compliance report |

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     React Frontend (Vite)                       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │Dashboard │ │ Payments │ │Merchants │ │Settlements│           │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Express API (Node.js)                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │   Auth   │ │ Payments │ │    FX    │ │  Audit   │           │
│  │Middleware│ │ Service  │ │ Service  │ │ Service  │           │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      MongoDB                                    │
│  Users │ Merchants │ Payments │ ExchangeRates │ Settlements    │
└─────────────────────────────────────────────────────────────────┘
```

## Docker Deployment

```bash
docker-compose up -d
```

Services:
- **API**: http://localhost:3001
- **UI**: http://localhost:5173
- **MongoDB**: localhost:27017

## Performance Targets

| Metric | Target |
|--------|--------|
| Payment creation | <100ms |
| FX conversion | <50ms |
| Daily transactions | 100K+ |
| Settlement accuracy | 99.9% |

## Supported Currencies (20+)

USD, EUR, GBP, JPY, CHF, CAD, AUD, NZD, CNY, HKD, SGD, SEK, NOK, DKK, KRW, INR, MXN, BRL, ZAR, AED, SAR, THB, MYR, PHP, IDR, PLN, CZK, HUF, ILS, TRY

## License

MIT

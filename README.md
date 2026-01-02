# Offline-First Sync Backend

A backend service for offline-first synchronization.

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- MongoDB

### Installation

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
   - Copy `.env.example` to `.env` (if available)
   - Update the values in `.env` with your configuration

3. Start the server:
```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

## Project Structure

```
offline-first-sync-backend/
├── src/
│   ├── config/       # Configuration files
│   ├── controllers/  # Request handlers
│   ├── middleware/   # Express middleware
│   ├── models/       # Database models
│   ├── routes/       # API routes
│   ├── utils/        # Utility functions
│   └── server.js     # Application entry point
├── .env              # Environment variables
├── .gitignore        # Git ignore rules
└── package.json      # Project dependencies
```

## API Documentation

Coming soon...

## License

ISC

# Offline-First Sync Backend

A Node.js backend designed for offline-first mobile/web applications with silent background synchronization.

## 🎯 Core Philosophy

**The backend stores relationships and state. The frontend owns presentation, media, and external data.**

This backend is designed to:
- ✅ Work seamlessly with offline-first clients
- ✅ Accept batched sync operations
- ✅ Apply changes idempotently
- ✅ Return only changed data since last sync
- ✅ Handle conflicts with last-write-wins strategy
- ✅ Store minimal data (only IDs for movies/books, not metadata)

## 🚀 Quick Start

### Installation

```bash
npm install
```

### Environment Setup

The `.env` file is already configured with:
- MongoDB connection string
- JWT secret
- Port configuration
- Rate limiting settings

### Run the Server

```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

The server will start on `http://localhost:5000`

## 📡 API Endpoints

### Authentication

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe"
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

Response includes JWT token:
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "...",
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

#### Get Current User
```http
GET /api/auth/me
Authorization: Bearer <token>
```

### Sync Endpoints

#### Main Sync Endpoint
```http
POST /api/sync
Authorization: Bearer <token>
Content-Type: application/json

{
  "deviceId": "device-uuid-123",
  "lastSyncTimestamp": "2025-12-29T10:00:00.000Z",
  "changes": [
    {
      "localId": "local-space-1",
      "entityType": "space",
      "operation": "create",
      "timestamp": "2025-12-29T10:05:00.000Z",
      "data": {
        "name": "My Bucket List",
        "icon": "star",
        "color": "#6366f1",
        "isVisible": true,
        "order": 0
      }
    },
    {
      "localId": "local-item-1",
      "entityType": "item",
      "operation": "create",
      "timestamp": "2025-12-29T10:06:00.000Z",
      "data": {
        "spaceLocalId": "local-space-1",
        "categoryLocalId": "local-category-1",
        "title": "Watch Inception",
        "type": "movie",
        "movieId": "27205",
        "isCompleted": false,
        "priority": "high"
      }
    },
    {
      "localId": "local-item-2",
      "entityType": "item",
      "operation": "update",
      "timestamp": "2025-12-29T10:07:00.000Z",
      "data": {
        "isCompleted": true,
        "completedAt": "2025-12-29T10:07:00.000Z"
      }
    },
    {
      "localId": "local-item-3",
      "entityType": "item",
      "operation": "delete",
      "timestamp": "2025-12-29T10:08:00.000Z"
    }
  ]
}
```

Response:
```json
{
  "success": true,
  "data": {
    "acknowledged": [
      {
        "localId": "local-space-1",
        "serverId": "507f1f77bcf86cd799439011",
        "entityType": "space",
        "operation": "create",
        "success": true
      }
    ],
    "conflicts": [],
    "serverUpdates": {
      "spaces": [...],
      "categories": [...],
      "items": [...]
    },
    "syncTimestamp": "2025-12-29T10:10:00.000Z"
  }
}
```

#### Get Initial Data
```http
GET /api/sync/initial
Authorization: Bearer <token>
```

Returns all non-deleted entities for first-time sync.

## 🗄️ Data Models

### Space
- User's organizational containers (e.g., "Personal", "Work", "Travel")
- Supports collaboration with multiple users
- Can be hidden or reordered

### Category
- Belongs to a Space
- Organizes items by type (e.g., "Movies", "Books", "Places")
- Can be hidden or reordered

### Item
- The actual bucket list items
- Can be custom text or reference external entities (movies, books, places)
- **Important**: Only stores external IDs (movieId, bookId, placeId)
- Frontend fetches and caches the actual metadata (titles, images, etc.)

### SyncLog
- Tracks all operations for audit and debugging
- Helps with conflict resolution

## 🔄 Sync Flow

1. **Client performs actions offline**
   - Updates local database (IndexedDB/SQLite)
   - Updates UI instantly
   - Queues changes in sync queue

2. **Background sync triggers** (every 30-60s or on connectivity)
   - Client sends batched changes to `/api/sync`
   - Includes `lastSyncTimestamp` and array of changes

3. **Server processes changes**
   - Applies each change idempotently
   - Resolves conflicts (last-write-wins)
   - Logs all operations

4. **Server returns updates**
   - Acknowledges received changes
   - Returns server-side changes since `lastSyncTimestamp`
   - Client merges updates into local database

5. **No UI blocking**
   - Sync happens silently in background
   - No loading spinners
   - No forced reloads

## 🎬 Movies & Books Handling

**Critical**: The backend does NOT fetch movie or book metadata.

### What Backend Stores
```json
{
  "type": "movie",
  "movieId": "27205",  // TMDB ID only
  "title": "Watch Inception"  // User's custom title/note
}
```

### What Frontend Does
1. User searches for movie using TMDB API (frontend)
2. Frontend stores full movie details locally (title, poster, rating, etc.)
3. Frontend sends only `movieId` to backend during sync
4. When displaying, frontend uses locally cached movie data
5. Frontend refreshes movie data independently (not during sync)

Same applies for books with OpenLibrary API.

## 🔐 Authentication

- JWT-based authentication
- Token expires in 7 days (configurable in `.env`)
- Include token in `Authorization: Bearer <token>` header

## ⚡ Performance Features

- **Batched operations**: Multiple changes in single request
- **Incremental sync**: Only changed data since last sync
- **Soft deletes**: Deleted items marked as deleted, not removed
- **Indexed queries**: Optimized MongoDB indexes for fast lookups
- **Minimal payloads**: Only essential data transferred

## 🛡️ Conflict Resolution

- **Last-write-wins**: Most recent timestamp wins
- **Server timestamp authority**: Server time used if client time is unreliable
- **Idempotent operations**: Same operation can be applied multiple times safely

## 🔧 Configuration

All configuration in `.env`:
- `PORT`: Server port (default: 5000)
- `MONGODB_URI`: MongoDB connection string
- `JWT_SECRET`: Secret for JWT signing
- `JWT_EXPIRE`: Token expiration time
- `RATE_LIMIT_MAX_REQUESTS`: Max requests per window
- `CORS_ORIGIN`: Allowed origins

## 📊 Database Indexes

Optimized indexes for:
- User-based queries
- Timestamp-based sync queries
- Entity lookups by localId
- Soft-delete filtering

## 🧪 Testing

### Health Check
```bash
curl http://localhost:5000/health
```

### Register & Login
```bash
# Register
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123","name":"Test User"}'

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'
```

### Sync Test
```bash
curl -X POST http://localhost:5000/api/sync \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "deviceId": "test-device-1",
    "lastSyncTimestamp": "2025-01-01T00:00:00.000Z",
    "changes": []
  }'
```

## 📝 Development Notes

### Adding New Entity Types

1. Create model in `src/models/`
2. Add to `modelMap` in `src/controllers/syncController.js`
3. Update sync response format if needed

### Debugging

- Set `NODE_ENV=development` for detailed error messages
- Check `SyncLog` collection for operation history
- Use Morgan logging to see all HTTP requests

## 🚨 Important Reminders

1. **Never fetch external API data in backend** (movies, books, places)
2. **Always use batched sync**, not individual CRUD calls
3. **UI must never wait** for backend responses
4. **All operations must be idempotent**
5. **Timestamps are critical** for conflict resolution

## 📦 Dependencies

- **express**: Web framework
- **mongoose**: MongoDB ODM
- **jsonwebtoken**: JWT authentication
- **bcryptjs**: Password hashing
- **cors**: Cross-origin resource sharing
- **dotenv**: Environment variables
- **express-rate-limit**: Rate limiting
- **uuid**: Unique ID generation
- **morgan**: HTTP request logging

## 🎯 Success Criteria

✅ App works fully offline  
✅ All user actions feel instant  
✅ UI never waits for backend  
✅ No forced reloads after actions  
✅ Sync happens silently in background  
✅ Network usage is efficient and batched  
✅ Data never lost if app closes  
✅ Backend only stores relationships, not presentation data  

---

**Built for offline-first excellence** 🚀

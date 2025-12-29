# Offline-First Sync Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT DEVICE                            │
│                                                                   │
│  ┌──────────────┐      ┌──────────────┐      ┌──────────────┐  │
│  │              │      │              │      │              │  │
│  │     UI       │◄────►│  Local DB    │◄────►│  Sync Queue  │  │
│  │  (React/     │      │  (IndexedDB/ │      │              │  │
│  │   Flutter)   │      │   SQLite)    │      │              │  │
│  │              │      │              │      │              │  │
│  └──────────────┘      └──────────────┘      └──────────────┘  │
│         ▲                     ▲                      │           │
│         │                     │                      │           │
│         │                     │                      ▼           │
│         │                     │              ┌──────────────┐   │
│         │                     │              │              │   │
│         │                     └──────────────┤ Sync Service │   │
│         │                                    │ (Background) │   │
│         │                                    │              │   │
│         │                                    └──────┬───────┘   │
│         │                                           │           │
└─────────┼───────────────────────────────────────────┼───────────┘
          │                                           │
          │         INSTANT UPDATE                    │
          │         (No waiting!)                     │
          │                                           │
          │                                           │ HTTPS
          │                                           │ (Background)
          │                                           │
          │                                           ▼
┌─────────┴───────────────────────────────────────────────────────┐
│                         BACKEND SERVER                           │
│                                                                   │
│  ┌──────────────┐      ┌──────────────┐      ┌──────────────┐  │
│  │              │      │              │      │              │  │
│  │   Express    │◄────►│   Sync       │◄────►│   MongoDB    │  │
│  │   Routes     │      │  Controller  │      │              │  │
│  │              │      │              │      │              │  │
│  └──────────────┘      └──────────────┘      └──────────────┘  │
│         │                     │                      ▲           │
│         │                     │                      │           │
│         │                     ▼                      │           │
│         │              ┌──────────────┐              │           │
│         │              │              │              │           │
│         │              │  Conflict    ├──────────────┘           │
│         │              │  Resolution  │                          │
│         │              │              │                          │
│         │              └──────────────┘                          │
│         │                                                         │
│         ▼                                                         │
│  ┌──────────────┐                                                │
│  │              │                                                │
│  │  Auth (JWT)  │                                                │
│  │              │                                                │
│  └──────────────┘                                                │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
```

## Data Flow

### 1. User Action (Offline-First)

```
User Action (e.g., "Add Movie")
         │
         ▼
   ┌─────────────┐
   │ Generate    │
   │ Local ID    │
   └─────┬───────┘
         │
         ▼
   ┌─────────────┐
   │ Update      │
   │ Local DB    │◄─── INSTANT (0-10ms)
   └─────┬───────┘
         │
         ▼
   ┌─────────────┐
   │ Update UI   │◄─── INSTANT (No spinner!)
   └─────┬───────┘
         │
         ▼
   ┌─────────────┐
   │ Add to      │
   │ Sync Queue  │
   └─────────────┘
         │
         │ (Later, in background)
         ▼
   Background Sync
```

### 2. Background Sync (Silent)

```
Sync Trigger (30-60s interval / on connectivity)
         │
         ▼
   ┌─────────────┐
   │ Collect     │
   │ Queued      │
   │ Changes     │
   └─────┬───────┘
         │
         ▼
   ┌─────────────┐
   │ Batch into  │
   │ Single      │
   │ Request     │
   └─────┬───────┘
         │
         ▼
   POST /api/sync
   {
     deviceId: "...",
     lastSyncTimestamp: "...",
     changes: [...]
   }
         │
         ▼
   ┌─────────────┐
   │ Server      │
   │ Processes   │
   │ Changes     │
   └─────┬───────┘
         │
         ▼
   ┌─────────────┐
   │ Server      │
   │ Returns     │
   │ Updates     │
   └─────┬───────┘
         │
         ▼
   ┌─────────────┐
   │ Merge into  │
   │ Local DB    │◄─── SILENT (No UI change)
   └─────────────┘
```

## Database Schema

### MongoDB Collections

#### Users
```javascript
{
  _id: ObjectId,
  email: String,
  password: String (hashed),
  name: String,
  devices: [{
    deviceId: String,
    lastSyncAt: Date,
    deviceName: String
  }],
  createdAt: Date,
  updatedAt: Date
}
```

#### Spaces
```javascript
{
  _id: ObjectId,
  localId: String,        // Client-generated ID
  serverId: String,       // Server-generated UUID
  userId: ObjectId,
  name: String,
  icon: String,
  color: String,
  isVisible: Boolean,
  order: Number,
  collaborators: [{
    userId: ObjectId,
    email: String,
    role: String
  }],
  isDeleted: Boolean,
  deletedAt: Date,
  deviceId: String,
  createdAt: Date,
  updatedAt: Date
}
```

#### Categories
```javascript
{
  _id: ObjectId,
  localId: String,
  serverId: String,
  userId: ObjectId,
  spaceId: ObjectId,
  spaceLocalId: String,
  name: String,
  icon: String,
  color: String,
  isVisible: Boolean,
  order: Number,
  isDeleted: Boolean,
  deletedAt: Date,
  deviceId: String,
  createdAt: Date,
  updatedAt: Date
}
```

#### Items
```javascript
{
  _id: ObjectId,
  localId: String,
  serverId: String,
  userId: ObjectId,
  spaceId: ObjectId,
  spaceLocalId: String,
  categoryId: ObjectId,
  categoryLocalId: String,
  
  // Content
  title: String,
  description: String,
  notes: String,
  
  // Type and external references
  type: String,           // 'custom', 'movie', 'book', 'place'
  movieId: String,        // TMDB ID (ONLY ID, no metadata!)
  bookId: String,         // OpenLibrary ID (ONLY ID!)
  placeId: String,        // Place API ID (ONLY ID!)
  
  // Status
  isCompleted: Boolean,
  completedAt: Date,
  completedBy: {
    userId: ObjectId,
    deviceId: String
  },
  
  // Organization
  priority: String,
  order: Number,
  tags: [String],
  dueDate: Date,
  
  // Soft delete
  isDeleted: Boolean,
  deletedAt: Date,
  
  // Sync
  deviceId: String,
  createdAt: Date,
  updatedAt: Date
}
```

#### SyncLogs
```javascript
{
  _id: ObjectId,
  userId: ObjectId,
  deviceId: String,
  entityType: String,     // 'space', 'category', 'item'
  entityId: ObjectId,
  localId: String,
  operation: String,      // 'create', 'update', 'delete'
  changes: Object,        // Changed fields only
  timestamp: Date,
  processed: Boolean,
  processedAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

## Sync Protocol

### Request Format
```json
{
  "deviceId": "unique-device-identifier",
  "lastSyncTimestamp": "2025-12-29T14:30:00.000Z",
  "changes": [
    {
      "localId": "local-item-123",
      "entityType": "item",
      "operation": "create",
      "timestamp": "2025-12-29T14:35:00.000Z",
      "data": {
        "title": "Watch Inception",
        "movieId": "27205",
        "type": "movie"
      }
    }
  ]
}
```

### Response Format
```json
{
  "success": true,
  "data": {
    "acknowledged": [
      {
        "localId": "local-item-123",
        "serverId": "676c1234567890abcdef1234",
        "entityType": "item",
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
    "syncTimestamp": "2025-12-29T14:35:05.000Z"
  }
}
```

## Conflict Resolution

### Last-Write-Wins Strategy

```
Device A (offline)          Device B (offline)
     │                           │
     │ Update item at 14:00      │ Update item at 14:05
     │                           │
     ▼                           ▼
  Local DB                    Local DB
     │                           │
     │ Sync at 14:10             │ Sync at 14:12
     │                           │
     ▼                           ▼
  ┌──────────────────────────────────┐
  │         SERVER                   │
  │                                  │
  │  1. Accept Device A (14:00)      │
  │  2. Accept Device B (14:05)      │◄─── Newer timestamp wins!
  │                                  │
  └──────────────────────────────────┘
```

## External Data Handling

### ❌ WRONG: Backend fetches movie data
```javascript
// DON'T DO THIS!
const movie = await fetch(`https://api.themoviedb.org/3/movie/${movieId}`);
await Item.create({
  title: movie.title,
  poster: movie.poster_path,
  rating: movie.vote_average
});
```

### ✅ CORRECT: Backend stores only ID
```javascript
// DO THIS!
await Item.create({
  movieId: "27205",  // Only the ID
  type: "movie"
});

// Frontend handles the rest:
// 1. Fetch movie details from TMDB
// 2. Cache in IndexedDB
// 3. Display from cache
```

## Performance Optimizations

### 1. Indexed Queries
```javascript
// Efficient sync query
db.items.find({
  userId: userId,
  updatedAt: { $gt: lastSyncTimestamp }
}).hint({ userId: 1, updatedAt: -1 })
```

### 2. Batched Operations
```javascript
// Single request with multiple changes
POST /api/sync
{
  changes: [
    { operation: "create", ... },
    { operation: "update", ... },
    { operation: "delete", ... }
  ]
}
```

### 3. Minimal Payloads
```javascript
// Only send changed fields
{
  operation: "update",
  data: {
    isCompleted: true,
    completedAt: "2025-12-29T14:00:00.000Z"
  }
  // NOT the entire item!
}
```

## Security

### JWT Authentication
```
Client                          Server
   │                               │
   │  POST /api/auth/login         │
   ├──────────────────────────────►│
   │                               │
   │  { token: "eyJhbG..." }       │
   │◄──────────────────────────────┤
   │                               │
   │  POST /api/sync               │
   │  Authorization: Bearer token  │
   ├──────────────────────────────►│
   │                               │
   │  { data: {...} }              │
   │◄──────────────────────────────┤
```

### Rate Limiting
- 100 requests per minute per IP
- Prevents abuse
- Configurable in `.env`

## Deployment Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Change `JWT_SECRET` to secure random string
- [ ] Update `MONGODB_URI` to production database
- [ ] Set `CORS_ORIGIN` to your frontend domain
- [ ] Enable HTTPS
- [ ] Set up monitoring (e.g., PM2, New Relic)
- [ ] Configure backup strategy
- [ ] Set up logging (e.g., Winston, Loggly)

## Testing Strategy

### 1. Unit Tests
- Test sync controller logic
- Test conflict resolution
- Test idempotency

### 2. Integration Tests
- Test full sync flow
- Test multi-device scenarios
- Test offline/online transitions

### 3. Load Tests
- Test with 1000+ concurrent users
- Test with large batches (100+ changes)
- Test database performance

## Monitoring

### Key Metrics
- Sync request latency
- Sync success rate
- Conflict frequency
- Database query performance
- Active devices per user

### Logs to Track
- Failed sync operations
- Conflict resolutions
- Authentication failures
- Database errors

---

**Remember:** The backend is a silent partner. It merges data, never drives the UI!

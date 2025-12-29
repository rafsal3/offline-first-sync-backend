# 🚀 Offline-First Sync Backend - Complete Guide

## ✨ What You've Built

A **production-ready** Node.js backend that enables true offline-first applications with:

✅ **Client-Generated IDs** - Frontend creates UUIDs, backend accepts them  
✅ **Idempotent Operations** - Same operation can be sent multiple times safely  
✅ **Differential Sync** - Only changed data is transferred  
✅ **Soft Deletes** - Records marked as deleted, never permanently removed  
✅ **Change Log System** - Operations tracked, not full data  
✅ **Conflict Resolution** - Last-write-wins with timestamp comparison  
✅ **Minimal Storage** - Only external IDs stored (movieId, bookId), not metadata  

---

## 📁 Project Structure

```
offline-first-sync-backend/
├── src/
│   ├── config/
│   │   └── database.js          # MongoDB connection
│   ├── models/
│   │   ├── User.js              # User authentication
│   │   ├── Space.js             # Organizational containers
│   │   ├── Category.js          # Item categories
│   │   ├── Item.js              # Bucket list items
│   │   └── SyncLog.js           # Operation audit trail
│   ├── controllers/
│   │   ├── authController.js    # Login/register
│   │   └── syncController.js    # Main sync logic ⭐
│   ├── middleware/
│   │   ├── auth.js              # JWT authentication
│   │   └── errorHandler.js      # Error handling
│   ├── routes/
│   │   ├── authRoutes.js        # Auth endpoints
│   │   └── syncRoutes.js        # Sync endpoints
│   └── server.js                # Express app
├── .env                         # Configuration
├── package.json
├── README.md                    # This file
├── ARCHITECTURE.md              # System architecture
├── DATA_MODELS.md               # Data model documentation
├── SYNC_PROTOCOL.md             # Sync protocol details
├── API_EXAMPLES.md              # Usage examples
└── Offline-First-Sync.postman_collection.json
```

---

## 🎯 Core Principles

### 1. **Backend Stores Relationships, Frontend Owns Presentation**

```javascript
// ❌ WRONG: Backend stores movie metadata
{
  type: "movie",
  movieId: "27205",
  title: "Inception",           // ❌ From TMDB
  poster: "/inception.jpg",      // ❌ From TMDB
  rating: 8.8                    // ❌ From TMDB
}

// ✅ CORRECT: Backend stores only ID
{
  type: "movie",
  movieId: "27205",              // ✅ Only the ID
  title: "Watch Inception"       // ✅ User's custom title
}
```

### 2. **Client Generates IDs**

```javascript
// Frontend
const itemId = uuidv4(); // "550e8400-e29b-41d4-a716-446655440000"

// Backend accepts it
await Item.create({
  _id: itemId,  // Client-provided UUID
  ...data
});
```

### 3. **Soft Deletes**

```javascript
// Delete operation
{
  deletedAt: "2025-12-29T14:30:00.000Z",  // Timestamp
  updatedAt: "2025-12-29T14:30:00.000Z"
}

// Record still exists, but filtered from queries
await Item.find({ deletedAt: null });
```

### 4. **Change Log, Not Full Sync**

```javascript
// ❌ WRONG: Send entire item
{
  id: "...",
  title: "My Item",
  description: "...",
  notes: "...",
  isCompleted: true,  // Only this changed!
  // ... 20 more fields
}

// ✅ CORRECT: Send only changed fields
{
  id: "...",
  operation: "update",
  data: {
    isCompleted: true  // Only what changed
  }
}
```

---

## 🔧 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

The `.env` file is already configured with:
- MongoDB Atlas connection
- JWT secret
- Port 5000
- CORS settings

### 3. Start Server

```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

Server runs on `http://localhost:5000`

---

## 📡 API Endpoints

### Authentication

#### POST /api/auth/register
Register a new user

#### POST /api/auth/login
Login and get JWT token

#### GET /api/auth/me
Get current user info

### Sync

#### POST /api/sync ⭐
**Main sync endpoint** - Accepts changes and returns updates

#### GET /api/sync/initial
Get all data for first-time sync

### Health

#### GET /health
Server health check

---

## 🔄 Sync Flow Example

### 1. User Creates Item Offline

```javascript
// Frontend (offline)
const itemId = uuidv4();
const operationId = `op-${Date.now()}-${Math.random()}`;

// Save to local DB immediately
await localDB.items.put({
  id: itemId,
  title: "Watch Inception",
  type: "movie",
  movieId: "27205",
  isCompleted: false,
  createdAt: new Date(),
  updatedAt: new Date()
});

// Update UI instantly (no waiting!)
updateUI();

// Queue for sync
await syncQueue.add({
  operationId,
  id: itemId,
  entityType: "item",
  operation: "create",
  data: {
    title: "Watch Inception",
    type: "movie",
    movieId: "27205",
    isCompleted: false
  },
  timestamp: new Date(),
  deviceId: "device-001"
});
```

### 2. Background Sync (30-60s later)

```javascript
// Frontend (background)
const changes = await syncQueue.getAll();

const response = await fetch('/api/sync', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    deviceId: "device-001",
    lastSyncTimestamp: localStorage.getItem('lastSync'),
    changes: changes
  })
});

const result = await response.json();

// Process server updates
for (const item of result.data.serverUpdates.items) {
  await localDB.items.put(item);
}

// Clear acknowledged changes from queue
for (const ack of result.data.acknowledged) {
  if (ack.success) {
    await syncQueue.remove(ack.operationId);
  }
}

// Update last sync timestamp
localStorage.setItem('lastSync', result.data.syncTimestamp);
```

### 3. Backend Processing

```javascript
// Backend
// 1. Check if operation already processed
const existingLog = await SyncLog.findOne({
  userId,
  deviceId,
  entityId: change.id,
  operation: change.operation,
  timestamp: change.timestamp
});

if (existingLog) {
  return { duplicate: true };  // Already processed
}

// 2. Check if entity already exists
const existing = await Item.findOne({ _id: change.id });

if (existing) {
  return { duplicate: true };  // Already created
}

// 3. Create entity with client-provided ID
await Item.create({
  _id: change.id,
  ...change.data,
  userId,
  deviceId,
  createdAt: change.timestamp,
  updatedAt: change.timestamp
});

// 4. Log operation
await SyncLog.create({
  userId,
  deviceId,
  entityType: "item",
  entityId: change.id,
  operation: "create",
  changes: change.data,
  timestamp: change.timestamp
});

// 5. Return success
return { id: change.id, success: true };
```

---

## 🛡️ Idempotency Guarantees

The system is idempotent through **three layers**:

### Layer 1: Client-Generated IDs
```javascript
// Same create sent twice
// First time: Creates entity
// Second time: Finds existing, returns success
```

### Layer 2: Operation ID Tracking
```javascript
// Backend checks SyncLog for duplicate operations
if (existingLog) {
  return { duplicate: true };
}
```

### Layer 3: Timestamp Comparison
```javascript
// Update with old timestamp
if (existing.updatedAt > change.timestamp) {
  return { conflict: true };  // Server version wins
}
```

---

## 📊 Data Models

### Every Entity Has:

```javascript
{
  _id: String,              // Client-generated UUID
  userId: ObjectId,         // Owner
  createdAt: Date,          // Client-provided
  updatedAt: Date,          // Client-provided
  deletedAt: Date | null,   // Soft delete
  deviceId: String          // Last modifier
}
```

### Space
Organizational containers (e.g., "Personal", "Work")

### Category
Item categories within a space (e.g., "Movies", "Books")

### Item
Bucket list items with:
- User content (title, notes, description)
- External IDs only (movieId, bookId, placeId)
- Status (isCompleted, priority)
- Organization (order, tags)

### SyncLog
Audit trail of all operations

---

## 🎬 External Data Handling

### Movies (TMDB)

**Backend stores:**
```javascript
{
  movieId: "27205"  // Only the ID
}
```

**Frontend does:**
1. Search TMDB API
2. Cache movie details locally
3. Display from cache
4. Sync only `movieId` to backend

### Books (OpenLibrary)

**Backend stores:**
```javascript
{
  bookId: "OL27479W"  // Only the ID
}
```

**Frontend does:**
1. Search OpenLibrary API
2. Cache book details locally
3. Display from cache
4. Sync only `bookId` to backend

---

## 🧪 Testing

### Postman Collection

Import `Offline-First-Sync.postman_collection.json` into Postman.

**Test Flow:**
1. Register user → Get token
2. Get initial data
3. Create space
4. Create category
5. Create item
6. Update item
7. Delete item
8. Sync from another device

### Manual Testing

```bash
# Health check
curl http://localhost:5000/health

# Register
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123","name":"Test User"}'

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'

# Sync (use token from login)
curl -X POST http://localhost:5000/api/sync \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "test-device",
    "lastSyncTimestamp": "2025-01-01T00:00:00.000Z",
    "changes": []
  }'
```

---

## 📚 Documentation Files

- **README.md** (this file) - Quick start and overview
- **ARCHITECTURE.md** - System architecture and diagrams
- **DATA_MODELS.md** - Detailed data model documentation
- **SYNC_PROTOCOL.md** - Sync protocol specification
- **API_EXAMPLES.md** - Comprehensive API examples

---

## 🚨 Important Rules

### ❌ DON'T

- ❌ Store external API data (movie titles, book covers, etc.)
- ❌ Call external APIs from backend
- ❌ Hard delete records
- ❌ Return full tables in sync response
- ❌ Block UI for sync operations
- ❌ Generate IDs on backend

### ✅ DO

- ✅ Store only external IDs (movieId, bookId)
- ✅ Let frontend handle external APIs
- ✅ Use soft deletes (deletedAt)
- ✅ Return only diffs since lastSyncTimestamp
- ✅ Sync silently in background
- ✅ Accept client-generated UUIDs

---

## 🎯 Success Criteria

✅ App works fully offline  
✅ All user actions feel instant  
✅ UI never waits for backend  
✅ No forced reloads after actions  
✅ Sync happens silently in background  
✅ Network usage is efficient and batched  
✅ Data never lost if app closes  
✅ Backend only stores relationships, not presentation data  
✅ Same operation can be sent multiple times safely  
✅ Conflicts are resolved automatically  

---

## 🔐 Security

- JWT-based authentication
- Token expires in 7 days (configurable)
- Rate limiting (100 requests/minute)
- CORS configured
- Password hashing with bcrypt

---

## 📈 Performance

- Indexed queries for fast lookups
- Batched operations
- Minimal payloads
- Differential sync
- Efficient MongoDB queries

---

## 🚀 Deployment

### Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Change `JWT_SECRET` to secure random string
- [ ] Update `MONGODB_URI` to production database
- [ ] Set `CORS_ORIGIN` to your frontend domain
- [ ] Enable HTTPS
- [ ] Set up monitoring (PM2, New Relic)
- [ ] Configure backup strategy
- [ ] Set up logging (Winston, Loggly)

### Environment Variables

```env
PORT=5000
NODE_ENV=production
MONGODB_URI=mongodb+srv://...
JWT_SECRET=your-super-secret-key
JWT_EXPIRE=7d
CORS_ORIGIN=https://yourapp.com
```

---

## 🤝 Integration with Frontend

### Flutter Example

```dart
// Generate UUID
final itemId = Uuid().v4();

// Save locally
await db.items.insert({
  'id': itemId,
  'title': 'Watch Inception',
  'movieId': '27205',
  'createdAt': DateTime.now().toIso8601String(),
  'updatedAt': DateTime.now().toIso8601String(),
});

// Queue for sync
await syncQueue.add({
  'operationId': 'op-${DateTime.now().millisecondsSinceEpoch}',
  'id': itemId,
  'entityType': 'item',
  'operation': 'create',
  'data': {
    'title': 'Watch Inception',
    'movieId': '27205',
  },
  'timestamp': DateTime.now().toIso8601String(),
  'deviceId': deviceId,
});
```

### React Example

```javascript
// Generate UUID
const itemId = uuidv4();

// Save to IndexedDB
await db.items.put({
  id: itemId,
  title: 'Watch Inception',
  movieId: '27205',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

// Queue for sync
await syncQueue.add({
  operationId: `op-${Date.now()}-${Math.random()}`,
  id: itemId,
  entityType: 'item',
  operation: 'create',
  data: {
    title: 'Watch Inception',
    movieId: '27205',
  },
  timestamp: new Date().toISOString(),
  deviceId: deviceId,
});
```

---

## 💡 Philosophy

> **The backend stores relationships and state.**  
> **The frontend owns presentation, media, and external data.**

The backend is a **silent partner** that merges data, never drives the UI.

Users should never notice when syncing happens.

The app should feel like a local native app.

---

## 📞 Support

For questions or issues:
1. Check documentation files
2. Review Postman collection
3. Check server logs
4. Review SyncLog collection in MongoDB

---

**Built with ❤️ for offline-first excellence!**

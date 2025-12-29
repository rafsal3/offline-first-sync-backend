# API Usage Examples

## 1. Authentication Flow

### Register a New User
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securePassword123",
    "name": "John Doe"
  }'
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "676c1234567890abcdef1234",
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

### Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securePassword123"
  }'
```

### Get Current User
```bash
curl -X GET http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## 2. Sync Flow Examples

### First Sync (Get Initial Data)
```bash
curl -X GET http://localhost:5000/api/sync/initial \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "spaces": [],
    "categories": [],
    "items": [],
    "syncTimestamp": "2025-12-29T14:30:00.000Z"
  }
}
```

---

### Create a Space (Offline-First)

**Client-side flow:**
1. User creates a space in the app
2. App generates a local ID: `local-space-001`
3. App saves to local database immediately
4. App updates UI instantly
5. App adds to sync queue

**Sync request:**
```bash
curl -X POST http://localhost:5000/api/sync \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "device-android-pixel-7",
    "lastSyncTimestamp": "2025-12-29T14:30:00.000Z",
    "changes": [
      {
        "localId": "local-space-001",
        "entityType": "space",
        "operation": "create",
        "timestamp": "2025-12-29T14:35:00.000Z",
        "data": {
          "name": "Travel Bucket List",
          "icon": "airplane",
          "color": "#3b82f6",
          "isVisible": true,
          "order": 0
        }
      }
    ]
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "acknowledged": [
      {
        "localId": "local-space-001",
        "serverId": "676c5678901234abcdef5678",
        "entityType": "space",
        "operation": "create",
        "success": true
      }
    ],
    "conflicts": [],
    "serverUpdates": {
      "spaces": [],
      "categories": [],
      "items": []
    },
    "syncTimestamp": "2025-12-29T14:35:05.000Z"
  }
}
```

---

### Create Category and Items (Batch Sync)

```bash
curl -X POST http://localhost:5000/api/sync \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "device-android-pixel-7",
    "lastSyncTimestamp": "2025-12-29T14:35:05.000Z",
    "changes": [
      {
        "localId": "local-category-001",
        "entityType": "category",
        "operation": "create",
        "timestamp": "2025-12-29T14:40:00.000Z",
        "data": {
          "spaceLocalId": "local-space-001",
          "name": "Movies to Watch",
          "icon": "film",
          "color": "#8b5cf6",
          "isVisible": true,
          "order": 0
        }
      },
      {
        "localId": "local-item-001",
        "entityType": "item",
        "operation": "create",
        "timestamp": "2025-12-29T14:41:00.000Z",
        "data": {
          "spaceLocalId": "local-space-001",
          "categoryLocalId": "local-category-001",
          "title": "Inception",
          "type": "movie",
          "movieId": "27205",
          "isCompleted": false,
          "priority": "high",
          "order": 0
        }
      },
      {
        "localId": "local-item-002",
        "entityType": "item",
        "operation": "create",
        "timestamp": "2025-12-29T14:42:00.000Z",
        "data": {
          "spaceLocalId": "local-space-001",
          "categoryLocalId": "local-category-001",
          "title": "The Matrix",
          "type": "movie",
          "movieId": "603",
          "isCompleted": false,
          "priority": "medium",
          "order": 1
        }
      }
    ]
  }'
```

---

### Update Item (Mark as Completed)

```bash
curl -X POST http://localhost:5000/api/sync \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "device-android-pixel-7",
    "lastSyncTimestamp": "2025-12-29T14:42:05.000Z",
    "changes": [
      {
        "localId": "local-item-001",
        "entityType": "item",
        "operation": "update",
        "timestamp": "2025-12-29T15:00:00.000Z",
        "data": {
          "isCompleted": true,
          "completedAt": "2025-12-29T15:00:00.000Z"
        }
      }
    ]
  }'
```

---

### Delete Item (Soft Delete)

```bash
curl -X POST http://localhost:5000/api/sync \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "device-android-pixel-7",
    "lastSyncTimestamp": "2025-12-29T15:00:05.000Z",
    "changes": [
      {
        "localId": "local-item-002",
        "entityType": "item",
        "operation": "delete",
        "timestamp": "2025-12-29T15:05:00.000Z"
      }
    ]
  }'
```

---

### Book Item Example

```bash
curl -X POST http://localhost:5000/api/sync \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "device-android-pixel-7",
    "lastSyncTimestamp": "2025-12-29T15:05:05.000Z",
    "changes": [
      {
        "localId": "local-item-003",
        "entityType": "item",
        "operation": "create",
        "timestamp": "2025-12-29T15:10:00.000Z",
        "data": {
          "spaceLocalId": "local-space-001",
          "categoryLocalId": "local-category-002",
          "title": "The Hobbit",
          "type": "book",
          "bookId": "OL27479W",
          "isCompleted": false,
          "priority": "medium",
          "notes": "Read before watching the movies"
        }
      }
    ]
  }'
```

**Important Note:** The backend only stores `bookId: "OL27479W"`. The frontend:
1. Fetches book details from OpenLibrary API
2. Caches the title, author, cover image locally
3. Displays using local cache
4. Only syncs the `bookId` with backend

---

## 3. Multi-Device Sync Scenario

### Device A creates an item
```json
{
  "deviceId": "device-android-pixel-7",
  "changes": [
    {
      "localId": "local-item-004",
      "entityType": "item",
      "operation": "create",
      "timestamp": "2025-12-29T16:00:00.000Z",
      "data": {
        "title": "Visit Paris",
        "type": "place",
        "placeId": "ChIJD7fiBh9u5kcRYJSMaMOCCwQ"
      }
    }
  ]
}
```

### Device B syncs and receives the update
```bash
curl -X POST http://localhost:5000/api/sync \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "device-ios-iphone-14",
    "lastSyncTimestamp": "2025-12-29T15:55:00.000Z",
    "changes": []
  }'
```

**Response includes the new item:**
```json
{
  "success": true,
  "data": {
    "acknowledged": [],
    "serverUpdates": {
      "items": [
        {
          "localId": "local-item-004",
          "serverId": "676c9012345678abcdef9012",
          "title": "Visit Paris",
          "type": "place",
          "placeId": "ChIJD7fiBh9u5kcRYJSMaMOCCwQ",
          "isCompleted": false,
          "updatedAt": "2025-12-29T16:00:02.000Z"
        }
      ]
    },
    "syncTimestamp": "2025-12-29T16:05:00.000Z"
  }
}
```

---

## 4. Conflict Resolution Example

### Scenario: Both devices update the same item offline

**Device A (offline):**
```json
{
  "localId": "local-item-001",
  "operation": "update",
  "timestamp": "2025-12-29T17:00:00.000Z",
  "data": {
    "notes": "Updated from Device A"
  }
}
```

**Device B (offline):**
```json
{
  "localId": "local-item-001",
  "operation": "update",
  "timestamp": "2025-12-29T17:05:00.000Z",
  "data": {
    "notes": "Updated from Device B"
  }
}
```

**Device A syncs first** → Server accepts (timestamp: 17:00:00)

**Device B syncs later** → Server accepts (timestamp: 17:05:00 is newer)

**Result:** Device B's update wins (last-write-wins)

---

## 5. Health Check

```bash
curl http://localhost:5000/health
```

**Response:**
```json
{
  "success": true,
  "message": "Server is running",
  "timestamp": "2025-12-29T14:30:00.000Z"
}
```

---

## Key Principles Demonstrated

✅ **Offline-First**: Client updates local DB first, syncs later  
✅ **Instant UI**: No waiting for server responses  
✅ **Batched Sync**: Multiple changes in one request  
✅ **Incremental**: Only changed data since `lastSyncTimestamp`  
✅ **Idempotent**: Same operation can be sent multiple times safely  
✅ **Minimal Data**: Only IDs for external entities (movies, books, places)  
✅ **Conflict Resolution**: Last-write-wins based on timestamp  
✅ **Silent Sync**: Happens in background, no UI blocking  

---

## Testing Workflow

1. **Register** → Get token
2. **Create space** → Get serverId mapping
3. **Create category** → Reference space by localId
4. **Create items** → Reference space and category by localIds
5. **Update items** → Mark as completed
6. **Sync from another device** → Receive updates
7. **Delete items** → Soft delete

**Remember:** The frontend handles all movie/book metadata fetching and caching!

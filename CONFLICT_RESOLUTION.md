# Conflict Resolution & CRUD Endpoints

## 🔄 Conflict Resolution

### Strategy: Last-Write-Wins (Timestamp-Based)

The backend uses a **simple and effective** conflict resolution strategy based on `updatedAt` timestamps.

---

## How It Works

### Rule 1: Client Update is Newer → Accept Client Data

```javascript
// Client sends update with newer timestamp
{
  id: "550e8400-...",
  operation: "update",
  data: { name: "New Name" },
  timestamp: "2025-12-29T15:00:00.000Z"  // Newer
}

// Server has older version
existing.updatedAt = "2025-12-29T14:00:00.000Z"  // Older

// ✅ Result: Client update accepted
existing.name = "New Name"
existing.updatedAt = "2025-12-29T15:00:00.000Z"
```

### Rule 2: Server Update is Newer → Keep Server Data

```javascript
// Client sends update with older timestamp
{
  id: "550e8400-...",
  operation: "update",
  data: { name: "Old Name" },
  timestamp: "2025-12-29T14:00:00.000Z"  // Older
}

// Server has newer version
existing.updatedAt = "2025-12-29T15:00:00.000Z"  // Newer
existing.name = "Current Name"

// ✅ Result: Server version kept, conflict flag returned
return { id, conflict: true }
```

### Rule 3: NO Errors Thrown

```javascript
// ❌ WRONG: Throw error on conflict
if (existing.updatedAt > timestamp) {
  throw new Error("Conflict detected!");
}

// ✅ CORRECT: Return conflict flag
if (existing.updatedAt > timestamp) {
  console.log(`Conflict detected: server version is newer`);
  return { id, conflict: true };  // No error!
}
```

---

## Implementation

### In `syncController.js`

```javascript
async function handleUpdate(Model, entityType, id, data, userId, deviceId, timestamp) {
  const existing = await Model.findOne({ _id: id, userId });

  if (!existing) {
    throw new Error(`Entity not found: ${entityType} with id ${id}`);
  }

  // ✅ Conflict resolution: last-write-wins
  if (existing.updatedAt > timestamp) {
    console.log(`Conflict detected for ${entityType} ${id}: server version is newer`);
    // ✅ Server version wins, don't update
    return { id, conflict: true };  // ✅ No error thrown!
  }

  // ✅ Client version is newer, apply update
  Object.keys(data).forEach(key => {
    existing[key] = data[key];
  });

  existing.updatedAt = timestamp;
  existing.deviceId = deviceId;

  await existing.save();

  // Log the operation
  await SyncLog.create({
    userId,
    deviceId,
    entityType,
    entityId: id,
    operation: 'update',
    changes: data,
    timestamp
  });

  return { id };  // ✅ Success
}
```

---

## Response Format

### Successful Update

```json
{
  "acknowledged": [
    {
      "operationId": "op-12345",
      "id": "550e8400-...",
      "entityType": "item",
      "operation": "update",
      "success": true,
      "conflict": false,
      "duplicate": false
    }
  ]
}
```

### Conflict Detected (Server Version Newer)

```json
{
  "acknowledged": [
    {
      "operationId": "op-12345",
      "id": "550e8400-...",
      "entityType": "item",
      "operation": "update",
      "success": true,
      "conflict": true,  // ✅ Conflict flag
      "duplicate": false
    }
  ],
  "serverUpdates": {
    "items": [
      {
        "id": "550e8400-...",
        "name": "Server Version",  // ✅ Resolved version
        "updatedAt": "2025-12-29T15:00:00.000Z"
      }
    ]
  }
}
```

---

## Frontend Handling

### When Conflict is Detected

```javascript
const response = await fetch('/api/sync', {
  method: 'POST',
  body: JSON.stringify({ changes })
});

const result = await response.json();

for (const ack of result.data.acknowledged) {
  if (ack.conflict) {
    // ✅ Server version wins, update local DB
    console.log(`Conflict for ${ack.id}: using server version`);
    
    // Find server version in serverUpdates
    const serverVersion = result.data.serverUpdates.items.find(
      item => item.id === ack.id
    );
    
    if (serverVersion) {
      // ✅ Update local DB with server version
      await localDB.items.put(serverVersion);
      
      // ✅ Update UI
      updateUI(serverVersion);
    }
  }
}
```

---

## Multi-Device Scenario

### Example: Two Devices Update Same Item

```
Device A (offline)          Device B (offline)
     │                           │
     │ Update at 14:00           │ Update at 14:05
     │ name = "Version A"        │ name = "Version B"
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
  │  1. Device A syncs (14:10)       │
  │     timestamp: 14:00             │
  │     ✅ Accepted                  │
  │     name = "Version A"           │
  │     updatedAt = 14:00            │
  │                                  │
  │  2. Device B syncs (14:12)       │
  │     timestamp: 14:05             │
  │     14:05 > 14:00 ✅             │
  │     ✅ Accepted                  │
  │     name = "Version B"           │
  │     updatedAt = 14:05            │
  │                                  │
  └──────────────────────────────────┘
           │                 │
           │                 │
           ▼                 ▼
    Device A syncs       Device B syncs
    Gets "Version B"     Gets "Version B"
    (conflict flag)      (success)
```

---

## 🛠️ CRUD Endpoints (Debug/Admin Only)

### ⚠️ WARNING

**These endpoints are for DEBUGGING and ADMIN use ONLY!**

**The app should use `POST /api/sync` for ALL normal operations!**

---

## Available Endpoints

### Spaces

#### GET /api/spaces
Get all spaces for current user

**Response:**
```json
{
  "success": true,
  "count": 3,
  "data": [
    {
      "id": "550e8400-...",
      "name": "Personal",
      "icon": "home",
      "color": "#6366f1",
      "order": 0,
      "deletedAt": null,
      "createdAt": "2025-12-29T10:00:00.000Z",
      "updatedAt": "2025-12-29T14:00:00.000Z"
    }
  ]
}
```

#### GET /api/spaces/:id
Get single space by ID

#### DELETE /api/spaces/:id
Soft delete a space (sets `deletedAt`)

---

### Categories

#### GET /api/categories
Get all categories for current user

**Query Parameters:**
- `spaceId` (optional) - Filter by space

**Example:**
```bash
GET /api/categories?spaceId=550e8400-...
```

#### GET /api/categories/:id
Get single category by ID

#### DELETE /api/categories/:id
Soft delete a category

---

### Items

#### GET /api/items
Get all items for current user

**Query Parameters:**
- `spaceId` (optional) - Filter by space
- `categoryId` (optional) - Filter by category
- `isCompleted` (optional) - Filter by completion status

**Examples:**
```bash
GET /api/items
GET /api/items?spaceId=550e8400-...
GET /api/items?categoryId=660f9511-...
GET /api/items?isCompleted=true
GET /api/items?spaceId=550e8400-...&isCompleted=false
```

#### GET /api/items/:id
Get single item by ID

#### DELETE /api/items/:id
Soft delete an item

---

### Debug/Stats

#### GET /api/debug/stats
Get statistics about user's data

**Response:**
```json
{
  "success": true,
  "data": {
    "spaces": {
      "total": 5,
      "active": 3,
      "deleted": 2
    },
    "categories": {
      "total": 12,
      "active": 10,
      "deleted": 2
    },
    "items": {
      "total": 45,
      "active": 40,
      "deleted": 5,
      "completed": 15,
      "pending": 25
    }
  }
}
```

---

## Usage Examples

### Debug: View All Items

```bash
curl -X GET http://localhost:5000/api/items \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Debug: View Completed Items

```bash
curl -X GET "http://localhost:5000/api/items?isCompleted=true" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Debug: Get Statistics

```bash
curl -X GET http://localhost:5000/api/debug/stats \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Debug: Delete Item

```bash
curl -X DELETE http://localhost:5000/api/items/550e8400-... \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Why These Endpoints Exist

### ✅ Good Uses

1. **Debugging** - Inspect data during development
2. **Admin Tools** - Build admin dashboards
3. **Testing** - Verify sync behavior
4. **Data Export** - Export user data
5. **Support** - Help users troubleshoot issues

### ❌ Bad Uses

1. **Normal App Operations** - Use `/sync` instead!
2. **Creating Items** - Use `/sync` instead!
3. **Updating Items** - Use `/sync` instead!
4. **Real-time UI Updates** - Use `/sync` instead!

---

## Best Practices

### ✅ DO

- Use CRUD endpoints for debugging
- Use CRUD endpoints for admin dashboards
- Use CRUD endpoints for data inspection
- Use `/sync` for ALL normal app operations

### ❌ DON'T

- Don't use CRUD endpoints in production app
- Don't bypass `/sync` for user actions
- Don't create items via CRUD endpoints
- Don't update items via CRUD endpoints

---

## Architecture Reminder

```
User Action
     ↓
Update Local DB (INSTANT)
     ↓
Update UI (INSTANT)
     ↓
Add to Sync Queue
     ↓
[Background]
     ↓
POST /sync  ← ✅ Use this!
     ↓
Backend Processes
     ↓
Returns Updates
     ↓
Merge into Local DB (SILENT)
```

**NOT:**

```
User Action
     ↓
POST /api/items  ← ❌ Don't use this!
     ↓
Wait for response...
     ↓
Update UI
```

---

## Summary

### Conflict Resolution

✅ **Last-write-wins** based on `updatedAt` timestamp  
✅ **No errors thrown** - conflict flag returned  
✅ **Server version returned** in `serverUpdates`  
✅ **Client merges** server version into local DB  

### CRUD Endpoints

✅ **Available** for debugging/admin use  
✅ **Soft deletes** (sets `deletedAt`)  
✅ **Query filtering** supported  
✅ **Statistics** endpoint for monitoring  
⚠️ **NOT for normal app use** - use `/sync` instead!  

---

**Remember: The app should use `POST /api/sync` for ALL normal operations!**

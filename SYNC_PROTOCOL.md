# Sync Protocol Documentation

## Overview

The backend implements a **change log-based sync system** that is:
- ✅ **Idempotent** - Same operation can be sent multiple times safely
- ✅ **Differential** - Only changed data is transferred
- ✅ **Offline-first** - Client generates IDs, backend accepts them
- ✅ **Conflict-aware** - Last-write-wins with timestamp comparison

---

## Core Principles

### 1. Client-Generated IDs
```javascript
// Frontend generates UUID
const spaceId = uuidv4(); // "550e8400-e29b-41d4-a716-446655440000"

// Backend accepts it as-is
await Space.create({
  _id: spaceId,  // Client-provided ID
  name: "My Space",
  userId: userId,
  createdAt: new Date(),
  updatedAt: new Date()
});
```

### 2. Soft Deletes
```javascript
// Delete operation sets deletedAt
{
  _id: "550e8400-e29b-41d4-a716-446655440000",
  name: "My Space",
  deletedAt: "2025-12-29T14:30:00.000Z",  // Soft delete
  updatedAt: "2025-12-29T14:30:00.000Z"
}

// Record still exists in DB, but filtered from queries
```

### 3. Change Log System
```javascript
// Frontend sends changes, not full data
{
  "changes": [
    {
      "operationId": "op-001",
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "entityType": "item",
      "operation": "update",
      "data": {
        "isCompleted": true  // Only changed field
      },
      "timestamp": "2025-12-29T14:30:00.000Z",
      "deviceId": "device-001"
    }
  ]
}
```

### 4. Differential Sync
```javascript
// Backend returns only changes since lastSyncTimestamp
{
  "serverUpdates": {
    "items": [
      // Only items updated since lastSyncTimestamp
    ]
  }
}
```

---

## Sync Endpoint

### POST /api/sync

**Authentication:** Required (Bearer token)

**Request Body:**
```json
{
  "deviceId": "device-android-pixel-7",
  "lastSyncTimestamp": "2025-12-29T14:00:00.000Z",
  "changes": [
    {
      "operationId": "op-12345",
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "entityType": "space",
      "operation": "create",
      "data": {
        "name": "Travel Plans",
        "icon": "airplane",
        "color": "#3b82f6",
        "isVisible": true,
        "order": 0
      },
      "timestamp": "2025-12-29T14:05:00.000Z",
      "deviceId": "device-android-pixel-7"
    },
    {
      "operationId": "op-12346",
      "id": "660f9511-f3ac-52e5-b827-557766551111",
      "entityType": "item",
      "operation": "update",
      "data": {
        "isCompleted": true,
        "completedAt": "2025-12-29T14:06:00.000Z"
      },
      "timestamp": "2025-12-29T14:06:00.000Z",
      "deviceId": "device-android-pixel-7"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "acknowledged": [
      {
        "operationId": "op-12345",
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "entityType": "space",
        "operation": "create",
        "success": true,
        "conflict": false
      },
      {
        "operationId": "op-12346",
        "id": "660f9511-f3ac-52e5-b827-557766551111",
        "entityType": "item",
        "operation": "update",
        "success": true,
        "conflict": false
      }
    ],
    "serverUpdates": {
      "spaces": [
        {
          "id": "770fa622-g4bd-63f6-c938-668877662222",
          "userId": "676c1234567890abcdef1234",
          "name": "Work Projects",
          "icon": "briefcase",
          "color": "#10b981",
          "isVisible": true,
          "order": 1,
          "deletedAt": null,
          "deviceId": "device-ios-iphone-14",
          "createdAt": "2025-12-29T14:07:00.000Z",
          "updatedAt": "2025-12-29T14:07:00.000Z"
        }
      ],
      "categories": [],
      "items": []
    },
    "syncTimestamp": "2025-12-29T14:10:00.000Z"
  }
}
```

---

## Idempotency

### How It Works

The sync endpoint is idempotent through **multiple mechanisms**:

#### 1. Client-Generated IDs
```javascript
// Same create operation sent twice
// First time
POST /api/sync
{
  "changes": [{
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "operation": "create",
    "data": { "name": "My Space" }
  }]
}
// ✅ Creates space with _id = "550e8400-e29b-41d4-a716-446655440000"

// Second time (retry)
POST /api/sync
{
  "changes": [{
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "operation": "create",
    "data": { "name": "My Space" }
  }]
}
// ✅ Finds existing space, skips creation, returns success
```

#### 2. Operation ID Tracking
```javascript
// Backend checks if operationId was already processed
const processed = await SyncLog.findOne({
  userId,
  deviceId,
  entityId: change.id,
  operation: change.operation,
  timestamp: change.timestamp
});

if (processed) {
  // Already processed, skip
  return { success: true, duplicate: true };
}
```

#### 3. Timestamp-Based Conflict Resolution
```javascript
// Update operation with old timestamp
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "operation": "update",
  "data": { "name": "Updated Name" },
  "timestamp": "2025-12-29T14:00:00.000Z"  // Old timestamp
}

// Server has newer version
existing.updatedAt = "2025-12-29T14:05:00.000Z"  // Newer

// ✅ Server version wins, update is rejected
// ✅ Client receives conflict flag
```

---

## Operation Types

### 1. CREATE

**Request:**
```json
{
  "operationId": "op-001",
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "entityType": "space",
  "operation": "create",
  "data": {
    "name": "My Space",
    "icon": "folder",
    "color": "#6366f1"
  },
  "timestamp": "2025-12-29T14:00:00.000Z",
  "deviceId": "device-001"
}
```

**Backend Logic:**
```javascript
// 1. Check if already exists
const existing = await Space.findOne({ 
  _id: "550e8400-e29b-41d4-a716-446655440000" 
});

if (existing) {
  // Already created (idempotency)
  return { success: true, duplicate: true };
}

// 2. Create with client-provided ID
await Space.create({
  _id: "550e8400-e29b-41d4-a716-446655440000",
  ...data,
  userId,
  deviceId,
  createdAt: timestamp,
  updatedAt: timestamp
});

// 3. Log operation
await SyncLog.create({
  userId,
  deviceId,
  entityType: "space",
  entityId: "550e8400-e29b-41d4-a716-446655440000",
  operation: "create",
  changes: data,
  timestamp
});
```

---

### 2. UPDATE

**Request:**
```json
{
  "operationId": "op-002",
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "entityType": "item",
  "operation": "update",
  "data": {
    "isCompleted": true,
    "completedAt": "2025-12-29T14:05:00.000Z"
  },
  "timestamp": "2025-12-29T14:05:00.000Z",
  "deviceId": "device-001"
}
```

**Backend Logic:**
```javascript
// 1. Find existing
const existing = await Item.findOne({ _id: id, userId });

if (!existing) {
  throw new Error("Entity not found");
}

// 2. Conflict resolution (last-write-wins)
if (existing.updatedAt > timestamp) {
  // Server version is newer
  return { success: true, conflict: true };
}

// 3. Apply only changed fields
Object.keys(data).forEach(key => {
  existing[key] = data[key];
});

existing.updatedAt = timestamp;
existing.deviceId = deviceId;

await existing.save();

// 4. Log operation
await SyncLog.create({
  userId,
  deviceId,
  entityType: "item",
  entityId: id,
  operation: "update",
  changes: data,
  timestamp
});
```

---

### 3. DELETE (Soft Delete)

**Request:**
```json
{
  "operationId": "op-003",
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "entityType": "item",
  "operation": "delete",
  "timestamp": "2025-12-29T14:10:00.000Z",
  "deviceId": "device-001"
}
```

**Backend Logic:**
```javascript
// 1. Find existing
const existing = await Item.findOne({ _id: id, userId });

if (!existing) {
  // Already deleted or never existed
  return { success: true };
}

// 2. Soft delete (set deletedAt)
existing.deletedAt = timestamp;
existing.updatedAt = timestamp;
existing.deviceId = deviceId;

await existing.save();

// 3. Log operation
await SyncLog.create({
  userId,
  deviceId,
  entityType: "item",
  entityId: id,
  operation: "delete",
  changes: {},
  timestamp
});

// 4. Record still exists in DB, but filtered from queries
```

---

## Differential Sync

### Only Changes Are Returned

**Client Request:**
```json
{
  "lastSyncTimestamp": "2025-12-29T14:00:00.000Z",
  "changes": []
}
```

**Backend Query:**
```javascript
// Only fetch entities updated AFTER lastSyncTimestamp
const items = await Item.find({
  userId,
  updatedAt: { $gt: new Date("2025-12-29T14:00:00.000Z") }
});

// Returns only:
// - Items created after 14:00
// - Items updated after 14:00
// - Items deleted after 14:00 (deletedAt is set)
```

**Response:**
```json
{
  "serverUpdates": {
    "items": [
      {
        "id": "660f9511-f3ac-52e5-b827-557766551111",
        "title": "New Item",
        "createdAt": "2025-12-29T14:05:00.000Z",
        "updatedAt": "2025-12-29T14:05:00.000Z"
      },
      {
        "id": "770fa622-g4bd-63f6-c938-668877662222",
        "title": "Deleted Item",
        "deletedAt": "2025-12-29T14:08:00.000Z",
        "updatedAt": "2025-12-29T14:08:00.000Z"
      }
    ]
  }
}
```

**NOT Returned:**
```javascript
// Items that haven't changed since 14:00
// ❌ Not included in response
```

---

## Conflict Resolution

### Last-Write-Wins Strategy

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
  │  1. Accept Device A (14:00)      │
  │     updatedAt = 14:00            │
  │                                  │
  │  2. Accept Device B (14:05)      │
  │     14:05 > 14:00 ✅             │
  │     updatedAt = 14:05            │
  │     name = "Version B"           │
  │                                  │
  └──────────────────────────────────┘
           │                 │
           │                 │
           ▼                 ▼
    Device A gets        Device B gets
    "Version B"          "Version B"
    (conflict)           (success)
```

---

## Retry Safety

### Same Operation Sent Multiple Times

```javascript
// First attempt (network timeout)
POST /api/sync
{
  "changes": [{
    "operationId": "op-001",
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "operation": "create",
    "data": { "name": "My Space" }
  }]
}
// ✅ Creates space
// ❌ Response lost due to network issue

// Retry (client didn't receive response)
POST /api/sync
{
  "changes": [{
    "operationId": "op-001",  // Same operationId
    "id": "550e8400-e29b-41d4-a716-446655440000",  // Same ID
    "operation": "create",
    "data": { "name": "My Space" }
  }]
}
// ✅ Finds existing space with same ID
// ✅ Returns success without creating duplicate
// ✅ Client receives confirmation
```

---

## Data Model Fields

Every entity has these required fields:

```javascript
{
  _id: String,              // Client-generated UUID
  userId: ObjectId,         // Owner
  createdAt: Date,          // Client-provided timestamp
  updatedAt: Date,          // Client-provided timestamp
  deletedAt: Date | null,   // Soft delete timestamp
  deviceId: String          // Last device that modified
}
```

---

## Best Practices

### Frontend

1. **Generate UUIDs for all entities**
   ```javascript
   const id = uuidv4();
   ```

2. **Track operation IDs**
   ```javascript
   const operationId = `op-${Date.now()}-${Math.random()}`;
   ```

3. **Send only changed fields**
   ```javascript
   // ✅ Good
   { data: { isCompleted: true } }
   
   // ❌ Bad
   { data: { ...entireItem } }
   ```

4. **Batch changes**
   ```javascript
   // ✅ Good - One request with 10 changes
   { changes: [change1, change2, ..., change10] }
   
   // ❌ Bad - 10 separate requests
   ```

5. **Store lastSyncTimestamp**
   ```javascript
   localStorage.setItem('lastSync', response.data.syncTimestamp);
   ```

### Backend

1. **Always check for existing entities**
2. **Use timestamps for conflict resolution**
3. **Log all operations**
4. **Return only diffs, not full tables**
5. **Handle soft deletes properly**

---

## Summary

✅ **Idempotent** - Same operation can be sent multiple times safely  
✅ **Differential** - Only changed data is transferred  
✅ **Offline-first** - Client generates IDs, backend accepts them  
✅ **Conflict-aware** - Last-write-wins with timestamp comparison  
✅ **Retry-safe** - Network failures don't cause duplicates  
✅ **Efficient** - Minimal data transfer  
✅ **Reliable** - All operations are logged  

**The backend is a silent partner that merges data, never drives the UI!**

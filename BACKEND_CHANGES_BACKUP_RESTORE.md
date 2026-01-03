# Backend Changes Required for Backup/Restore Model

## 📋 Executive Summary

Based on the new frontend logic, the backend needs **MINIMAL CHANGES**. The current backend architecture already supports the new backup/restore model with only minor modifications needed.

---

## 🎯 New Frontend Logic Overview

### Current Model (Automatic Sync)
- ❌ Automatic sync on every change
- ❌ Data syncs continuously in background
- ❌ Immediate server synchronization

### New Model (Manual Backup/Restore)
- ✅ **Guest Mode**: All data stored locally in Hive (no server interaction)
- ✅ **Backup (Register)**: User registers → local data uploaded to server
- ✅ **Manual Sync**: User clicks cloud icon → latest changes uploaded
- ✅ **Restore**: User logs in → server data **overwrites** local data (one-time download)
- ✅ **Offline-First**: All functionality works locally without internet (except movie/book API calls)

---

## 🔍 Current Backend Analysis

### What We Have ✅
1. **Authentication System**
   - `/auth/register` - Creates user account
   - `/auth/login` - Authenticates existing users
   - JWT token-based authentication

2. **Sync System**
   - `/sync/push` - Uploads data to server
   - `/sync/pull` - Downloads data from server
   - Version tracking for conflict detection
   - Data normalization (uncategorizedItems support)

3. **Data Model**
   - Stores complete user data snapshots
   - Version control
   - Last modified timestamps

### What Works Already ✅
- ✅ Guest mode (no backend interaction needed)
- ✅ Register/Backup (push data on registration)
- ✅ Manual sync (push on demand)
- ✅ Restore (pull data on login)
- ✅ Offline-first (backend doesn't enforce sync frequency)

---

## 🔧 Required Backend Changes

### 1. **Authentication Controller** - MINOR UPDATE

#### Current Behavior
```javascript
// POST /auth/register
register() {
  // Creates user
  // Initializes EMPTY user data (version: 1, data: {})
  // Returns token
}
```

#### New Behavior Needed
```javascript
// POST /auth/register
register() {
  // Creates user
  // Accepts OPTIONAL initial data from client
  // If data provided, save it (this is the "backup" on registration)
  // If no data, initialize empty
  // Returns token
}
```

**Why?** When user registers (backup), they need to upload their local Hive data immediately.

---

### 2. **Sync Controller** - NO CHANGES NEEDED ✅

The current `/sync/push` and `/sync/pull` endpoints already support the new model:

#### `/sync/push` - Already Perfect ✅
- Accepts data from client
- Saves to server
- Can be called manually (when user clicks cloud icon)
- No automatic triggers from backend

#### `/sync/pull` - Already Perfect ✅
- Returns server data
- Client can overwrite local data
- No automatic triggers from backend

**Why No Changes?** The backend doesn't control when sync happens - the frontend does!

---

### 3. **New Endpoint (Optional)** - RESTORE WITH WARNING

#### Endpoint: `POST /auth/restore`
**Purpose**: Provide a dedicated restore endpoint that makes the "overwrite" intention clear.

```javascript
// POST /auth/restore
restore(req, res) {
  // Same as /sync/pull but semantically clearer
  // Returns server data for overwriting local data
  // Could include metadata like last backup date
}
```

**Why?** Semantically clearer than using `/sync/pull` for restore operations.

---

## 📊 Detailed Changes

### Change 1: Update `authController.register()`

**File**: `src/controllers/authController.js`

**Current Code** (lines 36-40):
```javascript
// Initialize empty user data
const userData = new UserData({
    userId: user._id,
    version: 1,
    data: {}
});
```

**New Code**:
```javascript
// Initialize user data with optional backup data from client
const initialData = req.body.data || {}; // Accept data from client
const userData = new UserData({
    userId: user._id,
    version: 1,
    data: initialData  // Use provided data or empty object
});
```

**Request Body Changes**:
```javascript
// OLD
{
  "email": "user@example.com",
  "password": "password123"
}

// NEW (with backup data)
{
  "email": "user@example.com",
  "password": "password123",
  "data": {  // OPTIONAL: Local Hive data to backup
    "spaces": [...],
    "categories": [...],
    "items": [...]
  }
}
```

---

### Change 2: Add Restore Endpoint (Optional but Recommended)

**File**: `src/controllers/authController.js`

**New Function**:
```javascript
// POST /auth/restore
const restore = async (req, res) => {
    try {
        const userId = req.userId; // From JWT token

        // Find user data
        const userData = await UserData.findOne({ userId });

        if (!userData) {
            return res.status(200).json({
                data: {},
                version: 0,
                lastModifiedAt: null,
                message: 'No backup found'
            });
        }

        // Return server data for restoration
        res.status(200).json({
            data: userData.data,
            version: userData.version,
            lastModifiedAt: userData.lastModifiedAt,
            message: 'Restore data retrieved successfully'
        });
    } catch (error) {
        console.error('Restore error:', error);
        res.status(500).json({ error: 'Restore failed' });
    }
};

module.exports = {
    register,
    login,
    restore  // Export new function
};
```

**File**: `src/routes/authRoutes.js`

**Add Route**:
```javascript
const authMiddleware = require('../middleware/auth');

// POST /auth/restore (requires authentication)
router.post('/restore', authMiddleware, authController.restore);
```

---

### Change 3: Update API Documentation

**File**: `API_ENDPOINTS.txt`

Add documentation for:
1. Updated `/auth/register` with optional `data` field
2. New `/auth/restore` endpoint

---

## 🔄 Updated API Flow

### Flow 1: Guest Mode → Backup (First Time Registration)
```
1. User uses app in guest mode (local Hive storage only)
2. User adds items, categories, spaces locally
3. User clicks "Backup" → Registration screen
4. User enters email/password
5. Frontend calls: POST /auth/register
   {
     "email": "user@example.com",
     "password": "password123",
     "data": { /* all local Hive data */ }
   }
6. Backend creates user + saves data
7. Returns token
8. Frontend saves token, continues using local data
```

### Flow 2: Manual Sync (Upload Changes)
```
1. User makes changes locally (Hive)
2. User clicks cloud/sync icon
3. Frontend calls: POST /sync/push
   {
     "data": { /* latest local data */ },
     "version": 5
   }
4. Backend saves data, increments version
5. Returns success
```

### Flow 3: Restore (Existing User Login)
```
1. User logs in on new device (or wants to restore)
2. Frontend calls: POST /auth/login
3. Backend returns token
4. Frontend shows warning: "This will delete all local data"
5. User confirms
6. Frontend calls: POST /auth/restore (or GET /sync/pull)
7. Backend returns server data
8. Frontend OVERWRITES local Hive with server data
9. Done - user has restored backup
```

---

## ✅ What Doesn't Need Changes

### 1. Sync Controller ✅
- `/sync/push` - Already supports manual push
- `/sync/pull` - Already supports data retrieval
- No changes needed!

### 2. Data Models ✅
- `User` model - Already perfect
- `UserData` model - Already perfect
- No schema changes needed!

### 3. Middleware ✅
- Authentication middleware - Already perfect
- No changes needed!

### 4. Database ✅
- MongoDB schema - Already flexible
- No migrations needed!

---

## 🚀 Implementation Checklist

### Required Changes
- [ ] Update `authController.register()` to accept optional `data` field
- [ ] Test registration with backup data
- [ ] Update API documentation

### Optional but Recommended
- [ ] Add `authController.restore()` endpoint
- [ ] Add `/auth/restore` route
- [ ] Update API documentation for restore

### Testing
- [ ] Test guest mode (no backend calls)
- [ ] Test registration with local data (backup)
- [ ] Test registration without local data (empty)
- [ ] Test manual sync (push)
- [ ] Test restore (pull/overwrite)
- [ ] Test offline functionality

---

## 📝 Summary

### Changes Needed: **MINIMAL** ✅

1. **One function update**: `authController.register()` - Accept optional `data` field
2. **One optional new endpoint**: `POST /auth/restore` - Semantic clarity
3. **Documentation updates**: API_ENDPOINTS.txt

### Why So Few Changes?
The current backend is already **stateless** and **client-driven**:
- Backend doesn't trigger syncs
- Backend doesn't enforce sync frequency
- Backend just stores/retrieves data on demand
- Perfect for manual backup/restore model!

### Risk Level: **LOW** ✅
- Backward compatible (optional `data` field)
- No breaking changes
- Existing functionality preserved
- Simple additions only

---

## 🎯 Next Steps

1. **Review this document** - Ensure alignment with frontend changes
2. **Implement changes** - Update authController.register()
3. **Add restore endpoint** - Optional but recommended
4. **Update documentation** - API_ENDPOINTS.txt
5. **Test thoroughly** - All flows (guest, backup, sync, restore)
6. **Deploy** - Low risk, backward compatible

---

**Last Updated**: 2026-01-03  
**Status**: ✅ Analysis Complete - Ready for Implementation  
**Complexity**: Low (1-2 hours of work)  
**Risk**: Low (backward compatible)

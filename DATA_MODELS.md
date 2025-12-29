# Backend Data Models

## 🎯 Core Principle

**The backend stores ONLY user-created data and relationships.**

**The backend does NOT store:**
- ❌ Images
- ❌ Media files
- ❌ External API data (movie titles, book covers, etc.)
- ❌ Presentation data

**The backend ONLY stores:**
- ✅ User-created content (titles, notes, descriptions)
- ✅ Relationships (which item belongs to which category/space)
- ✅ State (completed, deleted, order)
- ✅ External IDs as opaque strings (movieId, bookId, placeId)

---

## Data Models

### 1. User Model
**File:** `src/models/User.js`

Stores user authentication and device tracking.

```javascript
{
  _id: ObjectId,
  email: "user@example.com",
  password: "hashed_password",
  name: "John Doe",
  devices: [
    {
      deviceId: "device-android-001",
      lastSyncAt: "2025-12-29T14:30:00.000Z",
      deviceName: "Pixel 7"
    }
  ],
  createdAt: "2025-12-29T10:00:00.000Z",
  updatedAt: "2025-12-29T14:30:00.000Z"
}
```

---

### 2. Space Model
**File:** `src/models/Space.js`

Organizational containers (e.g., "Personal", "Work", "Travel").

```javascript
{
  _id: ObjectId,
  localId: "local-space-001",           // Client-generated ID
  serverId: "uuid-generated-by-server", // Server-generated UUID
  userId: ObjectId,                      // Owner
  
  // User-created data
  name: "Travel Bucket List",
  icon: "airplane",                      // Icon name (string)
  color: "#3b82f6",                      // Hex color
  
  // Organization
  isVisible: true,
  order: 0,
  
  // Collaboration
  collaborators: [
    {
      userId: ObjectId,
      email: "friend@example.com",
      role: "editor"                     // owner, editor, viewer
    }
  ],
  
  // Soft delete
  isDeleted: false,
  deletedAt: null,
  
  // Sync metadata
  deviceId: "device-android-001",
  createdAt: "2025-12-29T10:00:00.000Z",
  updatedAt: "2025-12-29T14:30:00.000Z"
}
```

**What's NOT stored:**
- ❌ Icon images (only icon name)
- ❌ Any media files

---

### 3. Category Model
**File:** `src/models/Category.js`

Organizes items within a space (e.g., "Movies", "Books", "Places").

```javascript
{
  _id: ObjectId,
  localId: "local-category-001",
  serverId: "uuid-generated-by-server",
  userId: ObjectId,
  
  // Relationships
  spaceId: ObjectId,                     // Reference to Space
  spaceLocalId: "local-space-001",       // For client-side resolution
  
  // User-created data
  name: "Movies to Watch",
  icon: "film",
  color: "#8b5cf6",
  
  // Organization
  isVisible: true,
  order: 0,
  
  // Soft delete
  isDeleted: false,
  deletedAt: null,
  
  // Sync metadata
  deviceId: "device-android-001",
  createdAt: "2025-12-29T10:00:00.000Z",
  updatedAt: "2025-12-29T14:30:00.000Z"
}
```

---

### 4. Item Model ⭐ (Most Important)
**File:** `src/models/Item.js`

The actual bucket list items. **This is where the "external ID only" rule is critical.**

```javascript
{
  _id: ObjectId,
  localId: "local-item-001",
  serverId: "uuid-generated-by-server",
  userId: ObjectId,
  
  // Relationships
  spaceId: ObjectId,
  spaceLocalId: "local-space-001",
  categoryId: ObjectId,
  categoryLocalId: "local-category-001",
  
  // ✅ User-created content (STORED)
  title: "Watch Inception",              // User's custom title
  description: "Mind-bending thriller",  // User's description
  notes: "Recommended by Sarah",         // User's notes
  
  // ✅ Item type (STORED)
  type: "movie",                         // 'custom', 'movie', 'book', 'place'
  
  // ✅ External IDs ONLY (STORED as opaque strings)
  movieId: "27205",                      // ⚠️ ONLY the TMDB ID
  bookId: "OL27479W",                    // ⚠️ ONLY the OpenLibrary ID
  placeId: "ChIJD7fiBh9u5kcR...",        // ⚠️ ONLY the Place API ID
  
  // ❌ NOT STORED (Frontend's responsibility):
  // - Movie title from TMDB
  // - Movie poster URL
  // - Movie rating
  // - Movie release date
  // - Book title from OpenLibrary
  // - Book author
  // - Book cover image
  // - Place name
  // - Place photos
  
  // ✅ Status and progress (STORED)
  isCompleted: false,
  completedAt: null,
  completedBy: {
    userId: ObjectId,
    deviceId: "device-android-001"
  },
  
  // ✅ Organization (STORED)
  priority: "high",                      // low, medium, high
  order: 0,
  tags: ["thriller", "must-watch"],
  dueDate: "2025-12-31T00:00:00.000Z",
  
  // Soft delete
  isDeleted: false,
  deletedAt: null,
  
  // Sync metadata
  deviceId: "device-android-001",
  createdAt: "2025-12-29T10:00:00.000Z",
  updatedAt: "2025-12-29T14:30:00.000Z"
}
```

---

## 🎬 Movie Item Example

### ❌ WRONG: Storing external data
```javascript
// DON'T DO THIS!
{
  type: "movie",
  movieId: "27205",
  title: "Inception",                    // ❌ From TMDB API
  poster: "/inception-poster.jpg",       // ❌ From TMDB API
  rating: 8.8,                           // ❌ From TMDB API
  releaseDate: "2010-07-16",            // ❌ From TMDB API
  director: "Christopher Nolan"          // ❌ From TMDB API
}
```

### ✅ CORRECT: Storing only ID
```javascript
// DO THIS!
{
  type: "movie",
  movieId: "27205",                      // ✅ ONLY the ID
  title: "Watch Inception",              // ✅ User's custom title
  notes: "Recommended by Sarah"          // ✅ User's notes
}
```

**Frontend's job:**
1. User searches for "Inception" using TMDB API
2. Frontend fetches movie details from TMDB
3. Frontend caches title, poster, rating in IndexedDB
4. Frontend sends only `movieId: "27205"` to backend
5. When displaying, frontend uses cached TMDB data
6. Frontend refreshes TMDB data independently (not during sync)

---

## 📚 Book Item Example

### ❌ WRONG: Storing external data
```javascript
// DON'T DO THIS!
{
  type: "book",
  bookId: "OL27479W",
  title: "The Hobbit",                   // ❌ From OpenLibrary API
  author: "J.R.R. Tolkien",             // ❌ From OpenLibrary API
  coverImage: "/covers/hobbit.jpg",      // ❌ From OpenLibrary API
  publishYear: 1937                      // ❌ From OpenLibrary API
}
```

### ✅ CORRECT: Storing only ID
```javascript
// DO THIS!
{
  type: "book",
  bookId: "OL27479W",                    // ✅ ONLY the ID
  title: "Read The Hobbit",              // ✅ User's custom title
  notes: "Read before watching movies"   // ✅ User's notes
}
```

---

## 🗺️ Place Item Example

### ❌ WRONG: Storing external data
```javascript
// DON'T DO THIS!
{
  type: "place",
  placeId: "ChIJD7fiBh9u5kcR...",
  name: "Eiffel Tower",                  // ❌ From Places API
  address: "Paris, France",              // ❌ From Places API
  photos: [...],                         // ❌ From Places API
  rating: 4.7                            // ❌ From Places API
}
```

### ✅ CORRECT: Storing only ID
```javascript
// DO THIS!
{
  type: "place",
  placeId: "ChIJD7fiBh9u5kcR...",        // ✅ ONLY the ID
  title: "Visit Eiffel Tower",           // ✅ User's custom title
  notes: "Go during sunset"              // ✅ User's notes
}
```

---

## 🔄 Custom Item Example

For items that don't reference external APIs:

```javascript
{
  type: "custom",
  movieId: null,                         // No external reference
  bookId: null,
  placeId: null,
  title: "Learn to play guitar",         // ✅ User's content
  description: "Start with basic chords", // ✅ User's content
  notes: "Practice 30 min daily",        // ✅ User's content
  priority: "medium",
  tags: ["hobby", "music"]
}
```

---

## 5. SyncLog Model
**File:** `src/models/SyncLog.js`

Audit trail for all operations.

```javascript
{
  _id: ObjectId,
  userId: ObjectId,
  deviceId: "device-android-001",
  
  // Operation details
  entityType: "item",                    // space, category, item
  entityId: ObjectId,
  localId: "local-item-001",
  operation: "create",                   // create, update, delete
  
  // Changed fields only
  changes: {
    isCompleted: true,
    completedAt: "2025-12-29T14:30:00.000Z"
  },
  
  timestamp: "2025-12-29T14:30:00.000Z",
  processed: true,
  processedAt: "2025-12-29T14:30:01.000Z",
  
  createdAt: "2025-12-29T14:30:01.000Z",
  updatedAt: "2025-12-29T14:30:01.000Z"
}
```

---

## Database Indexes

Optimized for sync queries:

```javascript
// User indexes
{ email: 1 }                             // Unique

// Space indexes
{ userId: 1, isDeleted: 1, updatedAt: -1 }
{ userId: 1, localId: 1 }

// Category indexes
{ userId: 1, spaceId: 1, isDeleted: 1, updatedAt: -1 }
{ userId: 1, localId: 1 }

// Item indexes
{ userId: 1, isDeleted: 1, updatedAt: -1 }
{ userId: 1, spaceId: 1, categoryId: 1 }
{ userId: 1, localId: 1 }
{ userId: 1, isCompleted: 1 }

// SyncLog indexes
{ userId: 1, timestamp: -1 }
{ userId: 1, deviceId: 1, timestamp: -1 }
{ userId: 1, entityType: 1, timestamp: -1 }
```

---

## Frontend Responsibilities

### For Movies (TMDB API)
```javascript
// Frontend code (NOT backend!)
const movieDetails = await fetch(
  `https://api.themoviedb.org/3/movie/${movieId}?api_key=${TMDB_API_KEY}`
);

// Cache in IndexedDB
await db.movieCache.put({
  movieId: "27205",
  title: "Inception",
  poster: "/inception.jpg",
  rating: 8.8,
  cachedAt: new Date()
});

// Send to backend (only ID!)
await syncService.addChange({
  entityType: "item",
  operation: "create",
  data: {
    type: "movie",
    movieId: "27205",              // ONLY the ID
    title: "Watch Inception"       // User's custom title
  }
});
```

### For Books (OpenLibrary API)
```javascript
// Frontend code (NOT backend!)
const bookDetails = await fetch(
  `https://openlibrary.org/works/${bookId}.json`
);

// Cache in IndexedDB
await db.bookCache.put({
  bookId: "OL27479W",
  title: "The Hobbit",
  author: "J.R.R. Tolkien",
  cover: "/covers/hobbit.jpg",
  cachedAt: new Date()
});

// Send to backend (only ID!)
await syncService.addChange({
  entityType: "item",
  operation: "create",
  data: {
    type: "book",
    bookId: "OL27479W",            // ONLY the ID
    title: "Read The Hobbit"       // User's custom title
  }
});
```

---

## Why This Design?

### ✅ Benefits

1. **Minimal Backend Storage**
   - No duplicate data from external APIs
   - Smaller database size
   - Lower storage costs

2. **No API Key Management on Backend**
   - TMDB API key stays on frontend
   - OpenLibrary API key stays on frontend
   - Backend never calls external APIs

3. **Faster Sync**
   - Smaller payloads
   - Only essential data transferred
   - No unnecessary data processing

4. **Frontend Control**
   - Frontend decides when to refresh external data
   - Frontend can cache aggressively
   - Frontend can work fully offline

5. **Backend Simplicity**
   - Backend treats external IDs as opaque strings
   - No external API dependencies
   - No rate limiting issues

### ❌ What Backend Does NOT Do

- ❌ Fetch movie details from TMDB
- ❌ Fetch book details from OpenLibrary
- ❌ Fetch place details from Google Places
- ❌ Store images or media
- ❌ Store presentation data
- ❌ Validate external IDs

### ✅ What Backend DOES Do

- ✅ Store external IDs as strings
- ✅ Store user-created content
- ✅ Store relationships
- ✅ Store state (completed, deleted, etc.)
- ✅ Sync data between devices
- ✅ Resolve conflicts

---

## Summary

**One-line philosophy:**

> The backend stores relationships and state.  
> The frontend owns presentation, media, and external data.

**Data flow:**

```
User searches movie → Frontend calls TMDB → Frontend caches data
                                          ↓
                                    Frontend syncs movieId
                                          ↓
                                    Backend stores "27205"
                                          ↓
                                    Other device syncs
                                          ↓
                                    Frontend fetches "27205" from cache
                                          ↓
                                    If not cached, fetch from TMDB
```

**Remember:** The backend is a dumb data store for relationships. It doesn't know what "27205" means, and it doesn't care!

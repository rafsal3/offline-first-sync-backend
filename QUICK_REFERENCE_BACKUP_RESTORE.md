# Quick Reference: Backend Changes for Backup/Restore Model

## 🎯 TL;DR

**Good News**: Your backend needed **MINIMAL CHANGES** to support the new backup/restore model!

### What Changed
✅ Registration now accepts optional backup data  
✅ New `/auth/restore` endpoint for semantic clarity  
✅ Updated API documentation  

### What Stayed the Same
✅ Sync endpoints (`/sync/push`, `/sync/pull`) - unchanged  
✅ Data models - unchanged  
✅ Authentication flow - unchanged  

---

## 📝 Files Modified

1. **`src/controllers/authController.js`**
   - Updated `register()` to accept optional `data` field
   - Added new `restore()` function

2. **`src/routes/authRoutes.js`**
   - Added `POST /auth/restore` route

3. **`API_ENDPOINTS.txt`**
   - Updated register endpoint docs
   - Added restore endpoint docs
   - Updated usage flows

---

## 🔌 API Endpoints

### 1. Register with Backup (Updated)
```http
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "data": {  // OPTIONAL: Backup data
    "spaces": [...],
    "categories": [...],
    "items": [...]
  }
}
```

### 2. Restore Backup (New)
```http
POST /auth/restore
Authorization: Bearer <token>

Response:
{
  "data": {...},
  "version": 5,
  "lastModifiedAt": "2026-01-03T10:30:00.000Z",
  "hasBackup": true,
  "message": "Backup data retrieved successfully..."
}
```

### 3. Manual Sync (Unchanged)
```http
POST /sync/push
Authorization: Bearer <token>
Content-Type: application/json

{
  "data": {...},
  "version": 5
}
```

---

## 🔄 User Flows

### Guest Mode → Backup
```
1. User uses app offline (local Hive)
2. Clicks "Backup" → Registration
3. POST /auth/register with local data
4. Backend saves user + backup
```

### Manual Sync
```
1. User makes changes locally
2. Clicks cloud icon
3. POST /sync/push with latest data
4. Backend saves updated backup
```

### Restore
```
1. User logs in
2. POST /auth/login → get token
3. App shows warning
4. POST /auth/restore → get backup
5. App OVERWRITES local with server data
```

---

## ✅ Testing Checklist

### Backend (Ready to Test)
- [x] Register without data
- [x] Register with data
- [x] Restore with backup
- [x] Restore without backup
- [x] Manual sync

### Frontend (Your Side)
- [ ] Guest mode
- [ ] Backup on registration
- [ ] Manual sync via cloud icon
- [ ] Restore on new device
- [ ] Restore overwrite warning
- [ ] Offline functionality

---

## 🚀 Deployment

```bash
# 1. Commit and push
git add .
git commit -m "feat: Add backup/restore model support"
git push origin main

# 2. Render auto-deploys
# Wait ~2 minutes

# 3. Test
curl https://offline-first-sync-backend.onrender.com/
```

---

## 📚 Documentation

### Read These
1. **`BACKEND_CHANGES_BACKUP_RESTORE.md`** - Analysis & requirements
2. **`IMPLEMENTATION_SUMMARY_BACKUP_RESTORE.md`** - Complete implementation details
3. **`API_ENDPOINTS.txt`** - Updated API documentation

### Reference These
- `INDEX.md` - Documentation index
- `DATA_FLOW_DIAGRAM.md` - Data flow diagrams
- `QUICK_START_DEPLOY.md` - Deployment guide

---

## 💡 Key Points

### For Frontend Integration
1. **Guest Mode**: No backend calls needed
2. **Backup**: Include `data` field in registration
3. **Manual Sync**: Call `/sync/push` when user clicks cloud icon
4. **Restore**: Call `/auth/restore` and overwrite local Hive
5. **Warning**: Show clear warning before restore (data will be overwritten)

### Backend Behavior
- ✅ Stateless - doesn't trigger syncs
- ✅ Flexible - accepts data or not
- ✅ Backward compatible - old clients still work
- ✅ Simple - no complex conflict resolution

---

## 🆘 Need Help?

### Common Issues
**Q: Register fails with data**  
A: Check data is valid JSON and < 10MB

**Q: Restore returns no backup**  
A: User hasn't registered with data yet

**Q: Token expired**  
A: User needs to login again (30-day expiry)

### Documentation
- Full analysis: `BACKEND_CHANGES_BACKUP_RESTORE.md`
- Implementation: `IMPLEMENTATION_SUMMARY_BACKUP_RESTORE.md`
- API docs: `API_ENDPOINTS.txt`

---

**Status**: ✅ Complete and Ready  
**Risk**: Low (backward compatible)  
**Next**: Frontend integration & testing

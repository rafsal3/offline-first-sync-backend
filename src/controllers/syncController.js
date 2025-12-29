const { v4: uuidv4 } = require('uuid');
const Space = require('../models/Space');
const Category = require('../models/Category');
const Item = require('../models/Item');
const SyncLog = require('../models/SyncLog');
const User = require('../models/User');

// Model mapping
const modelMap = {
    space: Space,
    category: Category,
    item: Item
};

// @desc    Main sync endpoint - accepts batch of changes and returns updates
// @route   POST /api/sync
// @access  Private
exports.sync = async (req, res, next) => {
    try {
        const { lastSyncTimestamp, changes, deviceId } = req.body;
        const userId = req.user._id;

        // Validate input
        if (!deviceId) {
            return res.status(400).json({
                success: false,
                message: 'deviceId is required'
            });
        }

        // Update user's device info
        await updateDeviceInfo(userId, deviceId);

        const results = {
            acknowledged: [],
            conflicts: [],
            serverUpdates: {
                spaces: [],
                categories: [],
                items: []
            },
            syncTimestamp: new Date()
        };

        // Process incoming changes from client
        if (changes && Array.isArray(changes) && changes.length > 0) {
            for (const change of changes) {
                try {
                    const result = await processChange(change, userId, deviceId);
                    results.acknowledged.push({
                        localId: change.localId,
                        serverId: result.serverId,
                        entityType: change.entityType,
                        operation: change.operation,
                        success: true
                    });
                } catch (error) {
                    console.error('Error processing change:', error);
                    results.acknowledged.push({
                        localId: change.localId,
                        entityType: change.entityType,
                        operation: change.operation,
                        success: false,
                        error: error.message
                    });
                }
            }
        }

        // Get server updates since last sync
        const lastSync = lastSyncTimestamp ? new Date(lastSyncTimestamp) : new Date(0);

        // Fetch all updated entities since last sync
        const [spaces, categories, items] = await Promise.all([
            Space.find({
                userId,
                updatedAt: { $gt: lastSync }
            }).lean(),
            Category.find({
                userId,
                updatedAt: { $gt: lastSync }
            }).lean(),
            Item.find({
                userId,
                updatedAt: { $gt: lastSync }
            }).lean()
        ]);

        // Format server updates
        results.serverUpdates.spaces = spaces.map(formatEntity);
        results.serverUpdates.categories = categories.map(formatEntity);
        results.serverUpdates.items = items.map(formatEntity);

        res.status(200).json({
            success: true,
            data: results
        });
    } catch (error) {
        console.error('Sync error:', error);
        next(error);
    }
};

// Process a single change operation
async function processChange(change, userId, deviceId) {
    const { entityType, operation, localId, data, timestamp } = change;

    if (!entityType || !operation || !localId) {
        throw new Error('Invalid change format: missing required fields');
    }

    const Model = modelMap[entityType];
    if (!Model) {
        throw new Error(`Unknown entity type: ${entityType}`);
    }

    const changeTimestamp = timestamp ? new Date(timestamp) : new Date();

    switch (operation) {
        case 'create':
            return await handleCreate(Model, entityType, localId, data, userId, deviceId, changeTimestamp);

        case 'update':
            return await handleUpdate(Model, entityType, localId, data, userId, deviceId, changeTimestamp);

        case 'delete':
            return await handleDelete(Model, entityType, localId, userId, deviceId, changeTimestamp);

        default:
            throw new Error(`Unknown operation: ${operation}`);
    }
}

// Handle create operation
async function handleCreate(Model, entityType, localId, data, userId, deviceId, timestamp) {
    // Check if already exists (idempotency)
    let existing = await Model.findOne({ userId, localId });

    if (existing) {
        // Already created, return existing serverId
        return { serverId: existing._id.toString() };
    }

    // Resolve references (spaceId, categoryId) from localIds
    const resolvedData = await resolveReferences(data, userId);

    // Create new entity
    const entity = await Model.create({
        ...resolvedData,
        localId,
        serverId: uuidv4(),
        userId,
        deviceId,
        createdAt: timestamp,
        updatedAt: timestamp
    });

    // Log the operation
    await SyncLog.create({
        userId,
        deviceId,
        entityType,
        entityId: entity._id,
        localId,
        operation: 'create',
        changes: data,
        timestamp
    });

    return { serverId: entity._id.toString() };
}

// Handle update operation
async function handleUpdate(Model, entityType, localId, data, userId, deviceId, timestamp) {
    const existing = await Model.findOne({ userId, localId });

    if (!existing) {
        throw new Error(`Entity not found: ${entityType} with localId ${localId}`);
    }

    // Conflict resolution: last-write-wins
    if (existing.updatedAt > timestamp) {
        console.log(`Conflict detected for ${entityType} ${localId}: server version is newer`);
        // Server version wins, don't update
        return { serverId: existing._id.toString(), conflict: true };
    }

    // Resolve references
    const resolvedData = await resolveReferences(data, userId);

    // Update only changed fields
    Object.keys(resolvedData).forEach(key => {
        existing[key] = resolvedData[key];
    });

    existing.updatedAt = timestamp;
    existing.deviceId = deviceId;

    await existing.save();

    // Log the operation
    await SyncLog.create({
        userId,
        deviceId,
        entityType,
        entityId: existing._id,
        localId,
        operation: 'update',
        changes: data,
        timestamp
    });

    return { serverId: existing._id.toString() };
}

// Handle delete operation (soft delete)
async function handleDelete(Model, entityType, localId, userId, deviceId, timestamp) {
    const existing = await Model.findOne({ userId, localId });

    if (!existing) {
        // Already deleted or never existed
        return { serverId: null };
    }

    // Soft delete
    existing.isDeleted = true;
    existing.deletedAt = timestamp;
    existing.updatedAt = timestamp;
    existing.deviceId = deviceId;

    await existing.save();

    // Log the operation
    await SyncLog.create({
        userId,
        deviceId,
        entityType,
        entityId: existing._id,
        localId,
        operation: 'delete',
        changes: {},
        timestamp
    });

    return { serverId: existing._id.toString() };
}

// Resolve local IDs to server IDs for references
async function resolveReferences(data, userId) {
    const resolved = { ...data };

    // Resolve spaceLocalId to spaceId
    if (data.spaceLocalId) {
        const space = await Space.findOne({ userId, localId: data.spaceLocalId });
        if (space) {
            resolved.spaceId = space._id;
        }
        delete resolved.spaceLocalId;
    }

    // Resolve categoryLocalId to categoryId
    if (data.categoryLocalId) {
        const category = await Category.findOne({ userId, localId: data.categoryLocalId });
        if (category) {
            resolved.categoryId = category._id;
        }
        delete resolved.categoryLocalId;
    }

    return resolved;
}

// Update device info for user
async function updateDeviceInfo(userId, deviceId) {
    const user = await User.findById(userId);

    const deviceIndex = user.devices.findIndex(d => d.deviceId === deviceId);

    if (deviceIndex >= 0) {
        user.devices[deviceIndex].lastSyncAt = new Date();
    } else {
        user.devices.push({
            deviceId,
            lastSyncAt: new Date(),
            deviceName: 'Unknown Device'
        });
    }

    await user.save();
}

// Format entity for response (remove internal fields)
function formatEntity(entity) {
    const formatted = {
        localId: entity.localId,
        serverId: entity._id.toString(),
        ...entity
    };

    // Remove MongoDB internal fields
    delete formatted._id;
    delete formatted.__v;

    return formatted;
}

// @desc    Get initial data for first sync
// @route   GET /api/sync/initial
// @access  Private
exports.getInitialData = async (req, res, next) => {
    try {
        const userId = req.user._id;

        const [spaces, categories, items] = await Promise.all([
            Space.find({ userId, isDeleted: false }).lean(),
            Category.find({ userId, isDeleted: false }).lean(),
            Item.find({ userId, isDeleted: false }).lean()
        ]);

        res.status(200).json({
            success: true,
            data: {
                spaces: spaces.map(formatEntity),
                categories: categories.map(formatEntity),
                items: items.map(formatEntity),
                syncTimestamp: new Date()
            }
        });
    } catch (error) {
        next(error);
    }
};

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
                        operationId: change.operationId,
                        id: change.id,
                        entityType: change.entityType,
                        operation: change.operation,
                        success: true,
                        conflict: result.conflict || false,
                        duplicate: result.duplicate || false
                    });
                } catch (error) {
                    console.error('Error processing change:', error);
                    results.acknowledged.push({
                        operationId: change.operationId,
                        id: change.id,
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

        // Fetch all updated entities since last sync (excluding deleted ones for initial load)
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
    const { entityType, operation, id, data, timestamp, operationId } = change;

    if (!entityType || !operation || !id) {
        throw new Error('Invalid change format: missing required fields (entityType, operation, id)');
    }

    const Model = modelMap[entityType];
    if (!Model) {
        throw new Error(`Unknown entity type: ${entityType}`);
    }

    const changeTimestamp = timestamp ? new Date(timestamp) : new Date();

    // Check if this exact operation was already processed (idempotency via operationId)
    if (operationId) {
        const existingLog = await SyncLog.findOne({
            userId,
            deviceId,
            entityId: id,
            operation,
            timestamp: changeTimestamp
        });

        if (existingLog) {
            console.log(`Operation ${operationId} already processed, skipping`);
            return { id, duplicate: true, conflict: false };
        }
    }

    switch (operation) {
        case 'create':
            return await handleCreate(Model, entityType, id, data, userId, deviceId, changeTimestamp);

        case 'update':
            return await handleUpdate(Model, entityType, id, data, userId, deviceId, changeTimestamp);

        case 'delete':
            return await handleDelete(Model, entityType, id, userId, deviceId, changeTimestamp);

        default:
            throw new Error(`Unknown operation: ${operation}`);
    }
}

// Handle create operation
async function handleCreate(Model, entityType, id, data, userId, deviceId, timestamp) {
    // Check if already exists (idempotency)
    let existing = await Model.findOne({ _id: id, userId });

    if (existing) {
        // Already created, return success
        console.log(`Entity ${entityType} ${id} already exists, skipping create`);
        return { id, conflict: false };
    }

    // Create new entity with client-provided ID
    const entity = new Model({
        _id: id,  // Use client-generated UUID
        ...data,
        userId,
        deviceId,
        createdAt: timestamp,
        updatedAt: timestamp
    });

    await entity.save();

    // Log the operation
    await SyncLog.create({
        userId,
        deviceId,
        entityType,
        entityId: id,
        operation: 'create',
        changes: data,
        timestamp
    });

    return { id };
}

// Handle update operation
async function handleUpdate(Model, entityType, id, data, userId, deviceId, timestamp) {
    const existing = await Model.findOne({ _id: id, userId });

    if (!existing) {
        throw new Error(`Entity not found: ${entityType} with id ${id}`);
    }

    // Conflict resolution: last-write-wins
    if (existing.updatedAt > timestamp) {
        console.log(`Conflict detected for ${entityType} ${id}: server version is newer`);
        // Server version wins, don't update
        return { id, conflict: true };
    }

    // Update only changed fields
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

    return { id };
}

// Handle delete operation (soft delete)
async function handleDelete(Model, entityType, id, userId, deviceId, timestamp) {
    const existing = await Model.findOne({ _id: id, userId });

    if (!existing) {
        // Already deleted or never existed
        console.log(`Entity ${entityType} ${id} not found, skipping delete`);
        return { id };
    }

    // Soft delete
    existing.deletedAt = timestamp;
    existing.updatedAt = timestamp;
    existing.deviceId = deviceId;

    await existing.save();

    // Log the operation
    await SyncLog.create({
        userId,
        deviceId,
        entityType,
        entityId: id,
        operation: 'delete',
        changes: {},
        timestamp
    });

    return { id };
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
        id: entity._id,
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
            Space.find({ userId, deletedAt: null }).lean(),
            Category.find({ userId, deletedAt: null }).lean(),
            Item.find({ userId, deletedAt: null }).lean()
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

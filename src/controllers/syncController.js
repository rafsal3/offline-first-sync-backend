const UserData = require('../models/UserData');

// POST /sync/push
const push = async (req, res) => {
    try {
        const { data, version } = req.body;
        const userId = req.userId;

        console.log(`[Sync] Push request for user ${userId}. Client v:${version}`);

        // Validate input
        if (!data) {
            return res.status(400).json({ error: 'Data is required' });
        }

        // Find user data
        let userData = await UserData.findOne({ userId });

        if (!userData) {
            // Create new user data if doesn't exist
            console.log(`[Sync] Creating new data for user ${userId}`);
            userData = new UserData({
                userId,
                version: 1,
                data
            });
        } else {
            console.log(`[Sync] Existing data v:${userData.version}`);

            // Check version for conflict detection
            // Fix: Check strictly for undefined to properly handle version 0
            if (version !== undefined && userData.version > version) {
                console.warn(`[Sync] Conflict detected! Server: ${userData.version}, Client: ${version}`);
                return res.status(409).json({
                    error: 'Conflict detected',
                    serverVersion: userData.version,
                    serverData: userData.data
                });
            }

            // Update data and increment version
            userData.data = data;
            userData.version += 1;
        }

        await userData.save();
        console.log(`[Sync] Push successful. New v:${userData.version}`);

        res.status(200).json({
            message: 'Data synced successfully',
            version: userData.version,
            lastModifiedAt: userData.lastModifiedAt
        });
    } catch (error) {
        console.error('Push error:', error);
        res.status(500).json({ error: 'Sync push failed' });
    }
};

// GET /sync/pull
const pull = async (req, res) => {
    try {
        const userId = req.userId;

        // Find user data
        const userData = await UserData.findOne({ userId });

        if (!userData) {
            console.log(`[Sync] Pull request for user ${userId} - No data found`);
            // Return empty data if user data doesn't exist
            return res.status(200).json({
                data: {},
                version: 0,
                lastModifiedAt: null
            });
        }

        console.log(`[Sync] Pull request for user ${userId} - v:${userData.version}`);

        res.status(200).json({
            data: userData.data,
            version: userData.version,
            lastModifiedAt: userData.lastModifiedAt
        });
    } catch (error) {
        console.error('Pull error:', error);
        res.status(500).json({ error: 'Sync pull failed' });
    }
};

module.exports = {
    push,
    pull
};

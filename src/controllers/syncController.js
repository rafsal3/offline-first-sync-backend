const UserData = require('../models/UserData');

// POST /sync/push
const push = async (req, res) => {
    try {
        const { data, version } = req.body;
        const userId = req.userId;

        // Validate input
        if (!data) {
            return res.status(400).json({ error: 'Data is required' });
        }

        // Find user data
        let userData = await UserData.findOne({ userId });

        if (!userData) {
            // Create new user data if doesn't exist
            userData = new UserData({
                userId,
                version: 1,
                data
            });
        } else {
            // Check version for conflict detection (optional)
            if (version && userData.version > version) {
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
            // Return empty data if user data doesn't exist
            return res.status(200).json({
                data: {},
                version: 0,
                lastModifiedAt: null
            });
        }

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

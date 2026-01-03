const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const UserData = require('../models/UserData');

// POST /auth/register
const register = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate input
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(409).json({ error: 'User already exists' });
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 10);

        // Create user
        const user = new User({
            email,
            passwordHash
        });
        await user.save();

        // Initialize user data with optional backup data from client
        // This supports the new backup model where users can upload local data during registration
        const initialData = req.body.data || {}; // Accept data from client or use empty object
        const userData = new UserData({
            userId: user._id,
            version: 1,
            data: initialData
        });
        await userData.save();

        console.log(`[Auth] User registered. Data backup: ${Object.keys(initialData).length > 0 ? 'Yes' : 'No'}`);

        // Generate token
        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET,
            { expiresIn: '30d' }
        );

        res.status(201).json({
            message: 'User registered successfully',
            token,
            userId: user._id
        });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ error: 'Registration failed', details: error.message });
    }
};

// POST /auth/login
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate input
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        // Find user
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.passwordHash);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Generate token
        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET,
            { expiresIn: '30d' }
        );

        res.status(200).json({
            message: 'Login successful',
            token,
            userId: user._id
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
};

// POST /auth/restore
// This endpoint is specifically for restoring server data to a client
// It's semantically clearer than using /sync/pull for restore operations
const restore = async (req, res) => {
    try {
        const userId = req.userId; // From JWT token via auth middleware

        console.log(`[Auth] Restore request for user ${userId}`);

        // Find user data
        const userData = await UserData.findOne({ userId });

        if (!userData || !userData.data || Object.keys(userData.data).length === 0) {
            console.log(`[Auth] No backup data found for user ${userId}`);
            return res.status(200).json({
                data: {},
                version: 0,
                lastModifiedAt: null,
                hasBackup: false,
                message: 'No backup found. Start fresh or create a backup first.'
            });
        }

        console.log(`[Auth] Restore data found. Version: ${userData.version}`);

        // Return server data for restoration
        res.status(200).json({
            data: userData.data,
            version: userData.version,
            lastModifiedAt: userData.lastModifiedAt,
            hasBackup: true,
            message: 'Backup data retrieved successfully. This will overwrite local data.'
        });
    } catch (error) {
        console.error('Restore error:', error);
        res.status(500).json({ error: 'Restore failed' });
    }
};

module.exports = {
    register,
    login,
    restore
};

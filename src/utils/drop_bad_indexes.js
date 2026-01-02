require('dotenv').config();
const mongoose = require('mongoose');

const fixIndexes = async () => {
    try {
        if (!process.env.MONGODB_URI) {
            console.error('MONGODB_URI not found in environment variables');
            process.exit(1);
        }

        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        try {
            const collection = mongoose.connection.collection('users');
            const indexes = await collection.indexes();
            console.log('Current indexes on users collection:', indexes);

            const badIndex = indexes.find(i => i.name === 'userId_1');
            if (badIndex) {
                console.log('⚠️ Found unwanted index userId_1. Dropping it...');
                await collection.dropIndex('userId_1');
                console.log('✅ Successfully dropped userId_1 index.');
            } else {
                console.log('ℹ️ Index userId_1 not found. No action needed.');
            }
        } catch (err) {
            console.error('Error checking/dropping indexes:', err.message);
        }

    } catch (error) {
        console.error('❌ Database connection error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected');
        process.exit(0);
    }
};

fixIndexes();

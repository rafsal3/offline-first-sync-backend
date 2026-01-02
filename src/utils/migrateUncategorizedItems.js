/**
 * Migration Script: Uncategorized Items
 * 
 * This script migrates existing user data to support the new uncategorizedItems field.
 * It moves any items with categoryId: null from category.items arrays to space.uncategorizedItems.
 * 
 * Usage:
 *   node src/utils/migrateUncategorizedItems.js
 * 
 * This is a one-time migration script that should be run after deploying the backend update.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const UserData = require('../models/UserData');
const { normalizeAndValidate } = require('./dataNormalizer');

// MongoDB connection
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ MongoDB connected successfully');
    } catch (error) {
        console.error('❌ MongoDB connection error:', error);
        process.exit(1);
    }
};

// Migration function
const migrateUncategorizedItems = async () => {
    try {
        console.log('🚀 Starting migration for uncategorized items...\n');

        // Get all user data
        const allUserData = await UserData.find({});
        console.log(`📊 Found ${allUserData.length} user records to process\n`);

        let migratedCount = 0;
        let skippedCount = 0;
        let errorCount = 0;

        for (const userData of allUserData) {
            try {
                const userId = userData.userId;
                const originalData = JSON.parse(JSON.stringify(userData.data)); // Deep clone

                // Normalize and validate the data
                const normalizedData = normalizeAndValidate(userData.data);

                // Check if any changes were made
                const hasChanges = JSON.stringify(originalData) !== JSON.stringify(normalizedData);

                if (hasChanges) {
                    // Count migrated items
                    let itemsMigrated = 0;
                    if (normalizedData.spaces) {
                        normalizedData.spaces.forEach(space => {
                            if (space.uncategorizedItems && space.uncategorizedItems.length > 0) {
                                itemsMigrated += space.uncategorizedItems.length;
                            }
                        });
                    }

                    // Update the user data
                    userData.data = normalizedData;
                    await userData.save();

                    console.log(`✅ Migrated user ${userId}: ${itemsMigrated} uncategorized items`);
                    migratedCount++;
                } else {
                    console.log(`⏭️  Skipped user ${userId}: No changes needed`);
                    skippedCount++;
                }
            } catch (error) {
                console.error(`❌ Error processing user ${userData.userId}:`, error.message);
                errorCount++;
            }
        }

        console.log('\n📈 Migration Summary:');
        console.log(`   ✅ Successfully migrated: ${migratedCount}`);
        console.log(`   ⏭️  Skipped (no changes): ${skippedCount}`);
        console.log(`   ❌ Errors: ${errorCount}`);
        console.log(`   📊 Total processed: ${allUserData.length}`);

        if (errorCount === 0) {
            console.log('\n🎉 Migration completed successfully!');
        } else {
            console.log('\n⚠️  Migration completed with some errors. Please review the logs.');
        }

    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    }
};

// Run migration
const runMigration = async () => {
    try {
        await connectDB();
        await migrateUncategorizedItems();
        await mongoose.connection.close();
        console.log('\n✅ Database connection closed');
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration script failed:', error);
        process.exit(1);
    }
};

// Execute if run directly
if (require.main === module) {
    runMigration();
}

module.exports = { migrateUncategorizedItems };

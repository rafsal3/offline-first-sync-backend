/**
 * Data Normalizer Utility
 * Ensures data structure consistency, especially for uncategorized items
 */

/**
 * Normalizes user data to ensure uncategorizedItems field exists
 * and migrates any orphaned items from categories
 * @param {Object} data - The user data object
 * @returns {Object} - Normalized data
 */
const normalizeUserData = (data) => {
    if (!data || typeof data !== 'object') {
        return data;
    }

    // If no spaces array, return as is
    if (!Array.isArray(data.spaces)) {
        return data;
    }

    // Process each space
    data.spaces = data.spaces.map(space => normalizeSpace(space));

    return data;
};

/**
 * Normalizes a single space object
 * @param {Object} space - The space object
 * @returns {Object} - Normalized space
 */
const normalizeSpace = (space) => {
    if (!space || typeof space !== 'object') {
        return space;
    }

    // Initialize uncategorizedItems if it doesn't exist
    if (!Array.isArray(space.uncategorizedItems)) {
        space.uncategorizedItems = [];
    }

    // If no categories, return the space
    if (!Array.isArray(space.categories)) {
        return space;
    }

    // Migrate orphaned items from categories to uncategorizedItems
    const orphanedItems = [];

    space.categories = space.categories.map(category => {
        if (!category || !Array.isArray(category.items)) {
            return category;
        }

        // Find items with null or missing categoryId
        const validItems = [];
        category.items.forEach(item => {
            if (item && (item.categoryId === null || item.categoryId === undefined)) {
                // This is an orphaned item - should be in uncategorizedItems
                orphanedItems.push({
                    ...item,
                    categoryId: null // Ensure it's explicitly null
                });
            } else if (item) {
                validItems.push(item);
            }
        });

        return {
            ...category,
            items: validItems
        };
    });

    // Add orphaned items to uncategorizedItems (avoid duplicates by ID)
    const existingIds = new Set(space.uncategorizedItems.map(item => item.id));
    orphanedItems.forEach(item => {
        if (!existingIds.has(item.id)) {
            space.uncategorizedItems.push(item);
        }
    });

    return space;
};

/**
 * Validates that uncategorized items have null categoryId
 * @param {Object} data - The user data object
 * @returns {Object} - Validated data
 */
const validateUncategorizedItems = (data) => {
    if (!data || !Array.isArray(data.spaces)) {
        return data;
    }

    data.spaces = data.spaces.map(space => {
        if (!space || !Array.isArray(space.uncategorizedItems)) {
            return space;
        }

        // Ensure all uncategorized items have categoryId: null
        space.uncategorizedItems = space.uncategorizedItems.map(item => ({
            ...item,
            categoryId: null
        }));

        return space;
    });

    return data;
};

/**
 * Full normalization pipeline
 * @param {Object} data - The user data object
 * @returns {Object} - Fully normalized and validated data
 */
const normalizeAndValidate = (data) => {
    let normalized = normalizeUserData(data);
    normalized = validateUncategorizedItems(normalized);
    return normalized;
};

module.exports = {
    normalizeUserData,
    normalizeSpace,
    validateUncategorizedItems,
    normalizeAndValidate
};

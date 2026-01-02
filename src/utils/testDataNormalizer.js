/**
 * Unit Tests for Data Normalizer
 * 
 * Run with: node src/utils/testDataNormalizer.js
 */

const { normalizeAndValidate } = require('./dataNormalizer');

// Test case 1: Migrate orphaned items from categories
console.log('Test 1: Migrate orphaned items from categories');
const testData1 = {
    spaces: [
        {
            id: 'space_1',
            name: 'Personal',
            icon: '👤',
            isHidden: false,
            categories: [
                {
                    id: 'cat_1',
                    name: 'Places',
                    items: [
                        { id: 'item_1', text: 'Visit Paris', categoryId: 'cat_1', isCompleted: false },
                        { id: 'item_2', text: 'Random task', categoryId: null, isCompleted: false }, // Should be migrated
                        { id: 'item_3', text: 'Another task', categoryId: null, isCompleted: true } // Should be migrated
                    ]
                }
            ]
        }
    ]
};

const result1 = normalizeAndValidate(testData1);
console.log('✅ Result:', JSON.stringify(result1, null, 2));
console.log('Expected: 2 items in uncategorizedItems, 1 item in category\n');

// Test case 2: Initialize uncategorizedItems if missing
console.log('Test 2: Initialize uncategorizedItems if missing');
const testData2 = {
    spaces: [
        {
            id: 'space_2',
            name: 'Work',
            icon: '💼',
            isHidden: false,
            categories: []
        }
    ]
};

const result2 = normalizeAndValidate(testData2);
console.log('✅ Result:', JSON.stringify(result2, null, 2));
console.log('Expected: uncategorizedItems array exists and is empty\n');

// Test case 3: Preserve existing uncategorizedItems
console.log('Test 3: Preserve existing uncategorizedItems');
const testData3 = {
    spaces: [
        {
            id: 'space_3',
            name: 'Home',
            icon: '🏠',
            isHidden: false,
            categories: [],
            uncategorizedItems: [
                { id: 'item_4', text: 'Existing task', categoryId: null, isCompleted: false }
            ]
        }
    ]
};

const result3 = normalizeAndValidate(testData3);
console.log('✅ Result:', JSON.stringify(result3, null, 2));
console.log('Expected: Existing uncategorized item preserved\n');

// Test case 4: Avoid duplicates when migrating
console.log('Test 4: Avoid duplicates when migrating');
const testData4 = {
    spaces: [
        {
            id: 'space_4',
            name: 'Projects',
            icon: '📁',
            isHidden: false,
            categories: [
                {
                    id: 'cat_2',
                    name: 'Tasks',
                    items: [
                        { id: 'item_5', text: 'Duplicate test', categoryId: null, isCompleted: false }
                    ]
                }
            ],
            uncategorizedItems: [
                { id: 'item_5', text: 'Duplicate test', categoryId: null, isCompleted: false } // Already exists
            ]
        }
    ]
};

const result4 = normalizeAndValidate(testData4);
console.log('✅ Result:', JSON.stringify(result4, null, 2));
console.log('Expected: Only 1 item in uncategorizedItems (no duplicate)\n');

// Test case 5: Handle empty data
console.log('Test 5: Handle empty data');
const testData5 = {};
const result5 = normalizeAndValidate(testData5);
console.log('✅ Result:', JSON.stringify(result5, null, 2));
console.log('Expected: Empty object returned\n');

// Test case 6: Handle null data
console.log('Test 6: Handle null data');
const testData6 = null;
const result6 = normalizeAndValidate(testData6);
console.log('✅ Result:', result6);
console.log('Expected: null returned\n');

// Test case 7: Validate categoryId is null for uncategorized items
console.log('Test 7: Validate categoryId is null for uncategorized items');
const testData7 = {
    spaces: [
        {
            id: 'space_5',
            name: 'Shopping',
            icon: '🛒',
            isHidden: false,
            categories: [],
            uncategorizedItems: [
                { id: 'item_6', text: 'Buy milk', isCompleted: false } // Missing categoryId
            ]
        }
    ]
};

const result7 = normalizeAndValidate(testData7);
console.log('✅ Result:', JSON.stringify(result7, null, 2));
console.log('Expected: categoryId is explicitly set to null\n');

console.log('🎉 All tests completed!');

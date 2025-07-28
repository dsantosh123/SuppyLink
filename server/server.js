// server/server.js

// Load environment variables from .env file
require('dotenv').config();

// Import necessary modules
const express = require('express');
const path = require('path');
const admin = require('firebase-admin'); // Firebase Admin SDK

// --- Firebase Admin SDK Initialization ---
// IMPORTANT: Replace 'path/to/your/firebase-service-account.json'
// with the actual path to your downloaded service account key file.
// It's highly recommended to use environment variables for this in production.
// For local development, you can use a .env file and process.env.GOOGLE_APPLICATION_CREDENTIALS
// or directly provide the path if you understand the security implications.
try {
    admin.initializeApp({
        credential: admin.credential.applicationDefault() // Automatically uses GOOGLE_APPLICATION_CREDENTIALS env var
    });
    console.log('Firebase Admin SDK initialized successfully.');
} catch (error) {
    console.error('Error initializing Firebase Admin SDK:', error.message);
    // Exit if Firebase initialization fails, as the app won't function without it
    process.exit(1); 
}

const db = admin.firestore(); // Get a Firestore instance

// --- Express App Setup ---
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON bodies from incoming requests
app.use(express.json());

// Serve static files from the 'client' directory
app.use(express.static(path.join(__dirname, '../client')));

// --- Helper Functions for Firestore Paths ---
// These helpers encapsulate Firestore collection paths to ensure consistency
// and adhere to the security rules mentioned in the initial instructions.

// Function to get a reference to an app-specific public collection
const getAppSpecificCollection = (collectionName) => {
    // In a real multi-tenant app, __app_id would be dynamic.
    // For this example, we'll use a placeholder or derive it.
    // Assuming a fixed app ID for server-side operations for now.
    const appId = 'supplylink-app-id'; // Replace with your actual app ID if different
    return db.collection('artifacts').doc(appId).collection('public').doc('data').collection(collectionName);
};

// Function to get a reference to a user-specific private collection
const getUserPrivateCollection = (userId, collectionName) => {
    const appId = 'supplylink-app-id'; // Replace with your actual app ID if different
    return db.collection('artifacts').doc(appId).collection('users').doc(userId).collection(collectionName);
};

// --- API Routes ---

// Root route: serves the main HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/index.html'));
});

// --- Authentication API ---

// POST /api/auth/register
// Registers a new user (vendor or supplier)
app.post('/api/auth/register', async (req, res) => {
    const { name, phone, address, password, role } = req.body;

    if (!name || !phone || !address || !password || !role) {
        return res.status(400).json({ message: 'All fields are required for registration.' });
    }

    try {
        // Check if user with this phone number already exists
        const usersRef = getAppSpecificCollection('users');
        const existingUser = await usersRef.where('phone', '==', phone).limit(1).get();

        if (!existingUser.empty) {
            return res.status(409).json({ message: 'User with this phone number already exists.' });
        }

        // Hash password in a real app (e.g., using bcrypt)
        // For this example, we'll store it as plain text (NOT recommended for production!)
        const newUser = {
            name,
            phone,
            address,
            password, // In production, hash this!
            role,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        };

        const docRef = await usersRef.add(newUser);
        const userId = docRef.id;

        // If it's a supplier, add them to the 'suppliers' public collection too
        if (role === 'supplier') {
            const suppliersRef = getAppSpecificCollection('suppliers');
            await suppliersRef.doc(userId).set({
                id: userId,
                name,
                address,
                phone, // Store phone for contact in supplier details
                rating: 0, // Initial rating
                totalReviews: 0, // Initial total reviews
                distance: Math.floor(Math.random() * 5) + 1, // Simulate distance
                deliveryTime: Math.floor(Math.random() * 60) + 15, // Simulate delivery time
                items: [], // Initial empty items, will be managed via inventory
                userId: userId // Link to the user document
            });
        }

        res.status(201).json({
            message: 'Registration successful!',
            user: { id: userId, name, phone, role }
        });

    } catch (error) {
        console.error('Error during registration:', error);
        res.status(500).json({ message: 'Server error during registration.', error: error.message });
    }
});

// POST /api/auth/login
// Authenticates a user
app.post('/api/auth/login', async (req, res) => {
    const { phone, password, role } = req.body;

    if (!phone || !password || !role) {
        return res.status(400).json({ message: 'Phone, password, and role are required.' });
    }

    try {
        const usersRef = getAppSpecificCollection('users');
        const userQuery = await usersRef
            .where('phone', '==', phone)
            .where('role', '==', role)
            .limit(1)
            .get();

        if (userQuery.empty) {
            return res.status(401).json({ message: 'Invalid phone number or role.' });
        }

        const userData = userQuery.docs[0].data();
        const userId = userQuery.docs[0].id;

        // In production, compare hashed passwords (e.g., bcrypt.compare(password, userData.password))
        if (userData.password !== password) { // Simple comparison for demo
            return res.status(401).json({ message: 'Invalid password.' });
        }

        // In a real app, generate a JWT token here
        res.status(200).json({
            message: 'Login successful!',
            user: { id: userId, name: userData.name, phone: userData.phone, role: userData.role }
        });

    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).json({ message: 'Server error during login.', error: error.message });
    }
});

// GET /api/users/:userId
// Fetches a user's basic profile (used for both vendor and supplier profiles)
app.get('/api/users/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
        const userDoc = await getAppSpecificCollection('users').doc(userId).get();
        if (!userDoc.exists) {
            return res.status(404).json({ message: 'User not found.' });
        }
        const userData = userDoc.data();
        // Exclude sensitive data like password
        const { password, ...profileData } = userData;
        res.status(200).json({ id: userDoc.id, ...profileData });
    } catch (error) {
        console.error(`Error fetching user ${userId} profile:`, error);
        res.status(500).json({ message: 'Failed to fetch user profile.', error: error.message });
    }
});

// --- Vendor Dashboard APIs ---

// GET /api/suppliers
// Fetches all suppliers for the vendor's discover page
app.get('/api/suppliers', async (req, res) => {
    try {
        const suppliersRef = getAppSpecificCollection('suppliers');
        const snapshot = await suppliersRef.get();
        const suppliers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.status(200).json(suppliers);
    } catch (error) {
        console.error('Error fetching suppliers:', error);
        res.status(500).json({ message: 'Failed to fetch suppliers.', error: error.message });
    }
});

// GET /api/suppliers/:supplierId
// Fetches detailed information for a single supplier
app.get('/api/suppliers/:supplierId', async (req, res) => {
    const { supplierId } = req.params;

    try {
        // 1. Fetch basic supplier profile from public collection
        const supplierDoc = await getAppSpecificCollection('suppliers').doc(supplierId).get();
        if (!supplierDoc.exists) {
            return res.status(404).json({ message: 'Supplier not found.' });
        }
        const supplierData = { id: supplierDoc.id, ...supplierDoc.data() };

        // 2. Fetch supplier's inventory items from their private collection
        const inventorySnapshot = await getUserPrivateCollection(supplierId, 'inventory').orderBy('name').get();
        const inventoryItems = inventorySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // 3. Fetch supplier's ratings and reviews from public collection
        const ratingsSnapshot = await getAppSpecificCollection('ratings')
            .where('supplierId', '==', supplierId)
            .orderBy('createdAt', 'desc')
            .get();
        const reviews = ratingsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Calculate overall rating and breakdown for the detailed view
        let totalRating = 0;
        const ratingCounts = { '5': 0, '4': 0, '3': 0, '2': 0, '1': 0 };

        reviews.forEach(r => {
            totalRating += r.overallRating;
            if (ratingCounts[r.overallRating]) {
                ratingCounts[r.overallRating]++;
            } else {
                ratingCounts[r.overallRating] = 1;
            }
        });

        const overallAverage = reviews.length > 0 ? (totalRating / reviews.length).toFixed(1) : 0;


        res.status(200).json({
            ...supplierData, // Basic supplier info
            inventory: inventoryItems, // Detailed inventory
            ratings: { // Aggregated ratings data
                overallRating: parseFloat(overallAverage),
                totalReviews: reviews.length,
                ratingBreakdown: ratingCounts,
                recentReviews: reviews
            }
        });

    } catch (error) {
        console.error(`Error fetching supplier details for ${supplierId}:`, error);
        res.status(500).json({ message: 'Failed to fetch supplier details.', error: error.message });
    }
});


// GET /api/orders/vendor/:vendorId
// Fetches current orders for a specific vendor
app.get('/api/orders/vendor/:vendorId', async (req, res) => {
    const { vendorId } = req.params;
    try {
        const ordersRef = getUserPrivateCollection(vendorId, 'orders');
        const snapshot = await ordersRef
            .where('status', 'in', ['pending', 'confirmed']) // Fetch only active orders
            .orderBy('createdAt', 'desc')
            .get();
        const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.status(200).json(orders);
    } catch (error) {
        console.error(`Error fetching orders for vendor ${vendorId}:`, error);
        res.status(500).json({ message: 'Failed to fetch vendor orders.', error: error.message });
    }
});

// GET /api/orders/history/vendor/:vendorId
// Fetches order history for a specific vendor
app.get('/api/orders/history/vendor/:vendorId', async (req, res) => {
    const { vendorId } = req.params;
    const { status, fromDate, toDate } = req.query; // Filters

    try {
        let ordersRef = getUserPrivateCollection(vendorId, 'orders');
        let query = ordersRef.orderBy('createdAt', 'desc');

        // Apply status filter
        if (status && status !== 'all') {
            query = query.where('status', '==', status);
        } else {
            query = query.where('status', 'in', ['completed', 'cancelled', 'rejected']); // Default for history
        }

        // Apply date filters
        if (fromDate) {
            query = query.where('createdAt', '>=', new Date(fromDate));
        }
        if (toDate) {
            // To include the end of the day, add one day and query strictly less than
            const endOfDay = new Date(toDate);
            endOfDay.setDate(endOfDay.getDate() + 1);
            query = query.where('createdAt', '<', endOfDay);
        }

        const snapshot = await query.get();
        const history = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.status(200).json(history);
    } catch (error) {
        console.error(`Error fetching order history for vendor ${vendorId}:`, error);
        res.status(500).json({ message: 'Failed to fetch order history.', error: error.message });
    }
});

// GET /api/credit/vendor/:vendorId
// Fetches credit tracker data for a specific vendor
app.get('/api/credit/vendor/:vendorId', async (req, res) => {
    const { vendorId } = req.params;
    try {
        const creditRef = getUserPrivateCollection(vendorId, 'creditTransactions');
        const snapshot = await creditRef.orderBy('createdAt', 'desc').get(); // Use createdAt for ordering
        const transactions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Calculate summary (example logic)
        let totalOutstanding = 0;
        let dueThisWeek = 0;
        let thisMonth = 0;

        const now = admin.firestore.Timestamp.now().toDate(); // Get current server time
        const startOfWeek = new Date(now);
        startOfWeek.setHours(0, 0, 0, 0);
        startOfWeek.setDate(now.getDate() - now.getDay()); // Start of current week (Sunday)

        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        startOfMonth.setHours(0, 0, 0, 0);

        transactions.forEach(t => {
            const transactionDate = t.createdAt ? t.createdAt.toDate() : new Date(); // Convert Firestore Timestamp to Date

            if (t.status === 'pending') {
                totalOutstanding += t.amount;
                if (transactionDate >= startOfWeek) {
                    dueThisWeek += t.amount;
                }
            }
            if (transactionDate >= startOfMonth) {
                thisMonth += t.amount;
            }
        });

        res.status(200).json({
            summary: {
                totalOutstanding,
                thisMonth,
                dueThisWeek
            },
            transactions
        });

    } catch (error) {
        console.error(`Error fetching credit data for vendor ${vendorId}:`, error);
        res.status(500).json({ message: 'Failed to fetch credit data.', error: error.message });
    }
});


// POST /api/orders/place
// Allows a vendor to place a new order
app.post('/api/orders/place', async (req, res) => {
    const { vendorId, supplierId, items, total, deliveryFee, paymentMethod, specialNotes } = req.body;

    if (!vendorId || !supplierId || !items || items.length === 0 || !total || !paymentMethod) {
        return res.status(400).json({ message: 'Missing required order details.' });
    }

    try {
        // Fetch vendor's name and address for supplier's incoming order view
        const vendorDoc = await getAppSpecificCollection('users').doc(vendorId).get();
        const vendorData = vendorDoc.exists ? vendorDoc.data() : {};

        // Fetch supplier's name and phone for vendor's order view
        const supplierDoc = await getAppSpecificCollection('users').doc(supplierId).get();
        const supplierData = supplierDoc.exists ? supplierDoc.data() : {};

        const newOrder = {
            vendorId,
            vendorName: vendorData.name || 'Unknown Vendor',
            vendorAddress: vendorData.address || 'Unknown Address',
            supplierId,
            supplierName: supplierData.name || 'Unknown Supplier',
            supplierPhone: supplierData.phone || 'N/A', // Include supplier phone for contact
            items,
            total,
            deliveryFee: deliveryFee || 0,
            paymentMethod,
            specialNotes: specialNotes || '',
            status: 'pending', // Initial status
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };

        // Add order to vendor's private collection
        const vendorOrdersRef = getUserPrivateCollection(vendorId, 'orders');
        const vendorOrderDoc = await vendorOrdersRef.add(newOrder);

        // Add order to supplier's private incoming orders collection
        const supplierIncomingOrdersRef = getUserPrivateCollection(supplierId, 'incomingOrders');
        await supplierIncomingOrdersRef.doc(vendorOrderDoc.id).set({
            ...newOrder,
            orderId: vendorOrderDoc.id, // Store the same ID for easy lookup
            // vendorName and vendorAddress are already in newOrder
        });

        res.status(201).json({ message: 'Order placed successfully!', orderId: vendorOrderDoc.id });

    } catch (error) {
        console.error('Error placing order:', error);
        res.status(500).json({ message: 'Failed to place order.', error: error.message });
    }
});

// PUT /api/orders/vendor/:vendorId/cancel/:orderId
// Allows a vendor to cancel an order
app.put('/api/orders/vendor/:vendorId/cancel/:orderId', async (req, res) => {
    const { vendorId, orderId } = req.params;

    try {
        const vendorOrderDocRef = getUserPrivateCollection(vendorId, 'orders').doc(orderId);
        const orderDoc = await vendorOrderDocRef.get();

        if (!orderDoc.exists) {
            return res.status(404).json({ message: 'Order not found.' });
        }

        const orderData = orderDoc.data();
        if (orderData.status !== 'pending' && orderData.status !== 'confirmed') {
            return res.status(400).json({ message: `Order cannot be cancelled in '${orderData.status}' status.` });
        }

        await vendorOrderDocRef.update({
            status: 'cancelled',
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // Also update the supplier's incoming order status
        const supplierOrderDocRef = getUserPrivateCollection(orderData.supplierId, 'incomingOrders').doc(orderId);
        await supplierOrderDocRef.update({
            status: 'cancelled',
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            timeAgo: 'Cancelled by Vendor'
        });

        res.status(200).json({ message: 'Order cancelled successfully!' });

    } catch (error) {
        console.error(`Error cancelling order ${orderId} for vendor ${vendorId}:`, error);
        res.status(500).json({ message: 'Failed to cancel order.', error: error.message });
    }
});


// POST /api/ratings/submit
// Allows a vendor to submit a rating for a supplier
app.post('/api/ratings/submit', async (req, res) => {
    const { vendorId, supplierId, orderId, overallRating, quality, delivery, communication, reviewText } = req.body;

    if (!vendorId || !supplierId || !orderId || !overallRating) {
        return res.status(400).json({ message: 'Missing required rating details.' });
    }

    try {
        // Fetch vendor's name for the review record
        const vendorDoc = await getAppSpecificCollection('users').doc(vendorId).get();
        const vendorName = vendorDoc.exists ? vendorDoc.data().name : 'Anonymous Vendor';

        const newRating = {
            vendorId,
            vendorName, // Store vendor name with the rating
            supplierId,
            orderId,
            overallRating,
            quality: quality || overallRating,
            delivery: delivery || overallRating,
            communication: communication || overallRating,
            reviewText: reviewText || '',
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        };

        const ratingsRef = getAppSpecificCollection('ratings');
        await ratingsRef.add(newRating);

        // Update supplier's average rating in their public profile
        const supplierDocRef = getAppSpecificCollection('suppliers').doc(supplierId);
        const supplierDoc = await supplierDocRef.get();
        if (supplierDoc.exists) {
            const currentRating = supplierDoc.data().rating || 0;
            const totalReviews = supplierDoc.data().totalReviews || 0;
            const newAverageRating = ((currentRating * totalReviews) + overallRating) / (totalReviews + 1);
            await supplierDocRef.update({
                rating: parseFloat(newAverageRating.toFixed(1)),
                totalReviews: admin.firestore.FieldValue.increment(1)
            });
        }

        res.status(201).json({ message: 'Rating submitted successfully!' });

    } catch (error) {
        console.error('Error submitting rating:', error);
        res.status(500).json({ message: 'Failed to submit rating.', error: error.message });
    }
});


// --- Supplier Dashboard APIs ---

// GET /api/inventory/supplier/:supplierId
// Fetches inventory for a specific supplier
app.get('/api/inventory/supplier/:supplierId', async (req, res) => {
    const { supplierId } = req.params;
    try {
        const inventoryRef = getUserPrivateCollection(supplierId, 'inventory');
        const snapshot = await inventoryRef.orderBy('name').get();
        const inventory = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.status(200).json(inventory);
    } catch (error) {
        console.error(`Error fetching inventory for supplier ${supplierId}:`, error);
        res.status(500).json({ message: 'Failed to fetch inventory.', error: error.message });
    }
});

// POST /api/inventory/supplier/:supplierId/add
// Adds a new item to a supplier's inventory
app.post('/api/inventory/supplier/:supplierId/add', async (req, res) => {
    const { supplierId } = req.params;
    const { name, unit, price, quantity, description } = req.body;

    if (!name || !unit || !price || !quantity) {
        return res.status(400).json({ message: 'Item name, unit, price, and quantity are required.' });
    }

    try {
        const newItem = {
            name,
            unit,
            price: parseFloat(price),
            quantity: parseInt(quantity),
            description: description || '',
            // status: quantity > 10 ? 'in-stock' : (quantity > 0 ? 'low-stock' : 'out-of-stock'), // Status derived on frontend
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };

        const inventoryRef = getUserPrivateCollection(supplierId, 'inventory');
        const docRef = await inventoryRef.add(newItem);
        res.status(201).json({ message: 'Item added successfully!', itemId: docRef.id });

    } catch (error) {
        console.error(`Error adding item for supplier ${supplierId}:`, error);
        res.status(500).json({ message: 'Failed to add item.', error: error.message });
    }
});

// PUT /api/inventory/supplier/:supplierId/update/:itemId
// Updates an existing item in a supplier's inventory
app.put('/api/inventory/supplier/:supplierId/update/:itemId', async (req, res) => {
    const { supplierId, itemId } = req.params;
    const { name, unit, price, quantity, description } = req.body;

    if (!name || !unit || !price || !quantity) {
        return res.status(400).json({ message: 'Item name, unit, price, and quantity are required.' });
    }

    try {
        const updatedItem = {
            name,
            unit,
            price: parseFloat(price),
            quantity: parseInt(quantity),
            description: description || '',
            // status: quantity > 10 ? 'in-stock' : (quantity > 0 ? 'low-stock' : 'out-of-stock'), // Status derived on frontend
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };

        const itemDocRef = getUserPrivateCollection(supplierId, 'inventory').doc(itemId);
        await itemDocRef.update(updatedItem);
        res.status(200).json({ message: 'Item updated successfully!' });

    } catch (error) {
        console.error(`Error updating item ${itemId} for supplier ${supplierId}:`, error);
        res.status(500).json({ message: 'Failed to update item.', error: error.message });
    }
});

// DELETE /api/inventory/supplier/:supplierId/delete/:itemId
// Deletes an item from a supplier's inventory
app.delete('/api/inventory/supplier/:supplierId/delete/:itemId', async (req, res) => {
    const { supplierId, itemId } = req.params;

    try {
        const itemDocRef = getUserPrivateCollection(supplierId, 'inventory').doc(itemId);
        await itemDocRef.delete();
        res.status(200).json({ message: 'Item deleted successfully!' });

    } catch (error) {
        console.error(`Error deleting item ${itemId} for supplier ${supplierId}:`, error);
        res.status(500).json({ message: 'Failed to delete item.', error: error.message });
    }
});

// GET /api/orders/supplier/:supplierId/incoming
// Fetches incoming orders for a specific supplier
app.get('/api/orders/supplier/:supplierId/incoming', async (req, res) => {
    const { supplierId } = req.params;
    const { status } = req.query; // Optional: filter by status

    try {
        let query = getUserPrivateCollection(supplierId, 'incomingOrders')
            .orderBy('createdAt', 'desc');

        if (status && status !== 'all') {
            query = query.where('status', '==', status);
        }

        const snapshot = await query.get();
        const incomingOrders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.status(200).json(incomingOrders);
    } catch (error) {
        console.error(`Error fetching incoming orders for supplier ${supplierId}:`, error);
        res.status(500).json({ message: 'Failed to fetch incoming orders.', error: error.message });
    }
});

// PUT /api/orders/supplier/:supplierId/accept/:orderId
// Accepts an incoming order
app.put('/api/orders/supplier/:supplierId/accept/:orderId', async (req, res) => {
    const { supplierId, orderId } = req.params;

    try {
        // Update status in supplier's incoming orders
        const supplierOrderDocRef = getUserPrivateCollection(supplierId, 'incomingOrders').doc(orderId);
        const supplierOrderDoc = await supplierOrderDocRef.get();
        if (!supplierOrderDoc.exists) {
            return res.status(404).json({ message: 'Incoming order not found.' });
        }
        const orderData = supplierOrderDoc.data();

        // Deduct items from supplier's inventory
        const inventoryRef = getUserPrivateCollection(supplierId, 'inventory');
        for (const item of orderData.items) {
            const itemQuery = await inventoryRef.where('name', '==', item.name).limit(1).get();
            if (!itemQuery.empty) {
                const inventoryItemDoc = itemQuery.docs[0];
                const currentQuantity = inventoryItemDoc.data().quantity;
                const newQuantity = currentQuantity - item.quantity;
                if (newQuantity < 0) {
                    // This is a simplified check. In a real app, you'd check before accepting.
                    return res.status(400).json({ message: `Insufficient stock for ${item.name}.` });
                }
                await inventoryItemDoc.ref.update({ quantity: newQuantity });
            } else {
                console.warn(`Item ${item.name} not found in supplier inventory for deduction.`);
            }
        }

        await supplierOrderDocRef.update({
            status: 'confirmed',
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            timeAgo: 'Confirmed - Ready for delivery' // Update frontend display text
        });

        // Also update status in vendor's original order
        if (orderData && orderData.vendorId) {
            const vendorOrderDocRef = getUserPrivateCollection(orderData.vendorId, 'orders').doc(orderId);
            await vendorOrderDocRef.update({
                status: 'confirmed',
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
        }

        res.status(200).json({ message: 'Order accepted successfully!' });

    } catch (error) {
        console.error(`Error accepting order ${orderId} for supplier ${supplierId}:`, error);
        res.status(500).json({ message: 'Failed to accept order.', error: error.message });
    }
});

// PUT /api/orders/supplier/:supplierId/reject/:orderId
// Rejects an incoming order
app.put('/api/orders/supplier/:supplierId/reject/:orderId', async (req, res) => {
    const { supplierId, orderId } = req.params;

    try {
        // Update status in supplier's incoming orders
        const supplierOrderDocRef = getUserPrivateCollection(supplierId, 'incomingOrders').doc(orderId);
        const supplierOrderDoc = await supplierOrderDocRef.get();
        if (!supplierOrderDoc.exists) {
            return res.status(404).json({ message: 'Incoming order not found.' });
        }
        const orderData = supplierOrderDoc.data();

        await supplierOrderDocRef.update({
            status: 'rejected',
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            timeAgo: 'Rejected'
        });

        // Also update status in vendor's original order
        if (orderData && orderData.vendorId) {
            const vendorOrderDocRef = getUserPrivateCollection(orderData.vendorId, 'orders').doc(orderId);
            await vendorOrderDocRef.update({
                status: 'cancelled', // Vendor sees it as cancelled
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
        }

        res.status(200).json({ message: 'Order rejected successfully!' });

    } catch (error) {
        console.error(`Error rejecting order ${orderId} for supplier ${supplierId}:`, error);
        res.status(500).json({ message: 'Failed to reject order.', error: error.message });
    }
});

// PUT /api/orders/supplier/:supplierId/deliver/:orderId
// Marks an incoming order as delivered
app.put('/api/orders/supplier/:supplierId/deliver/:orderId', async (req, res) => {
    const { supplierId, orderId } = req.params;

    try {
        // Update status in supplier's incoming orders
        const supplierOrderDocRef = getUserPrivateCollection(supplierId, 'incomingOrders').doc(orderId);
        const supplierOrderDoc = await supplierOrderDocRef.get();
        if (!supplierOrderDoc.exists) {
            return res.status(404).json({ message: 'Incoming order not found.' });
        }
        const orderData = supplierOrderDoc.data();

        await supplierOrderDocRef.update({
            status: 'delivered',
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            timeAgo: 'Delivered'
        });

        // Also update status in vendor's original order
        if (orderData && orderData.vendorId) {
            const vendorOrderDocRef = getUserPrivateCollection(orderData.vendorId, 'orders').doc(orderId);
            await vendorOrderDocRef.update({
                status: 'completed', // Vendor sees it as completed
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
        }

        // Optional: Add a credit transaction if payment method was 'Credit'
        if (orderData.paymentMethod === 'Credit') {
            const creditTransactionsRef = getUserPrivateCollection(orderData.vendorId, 'creditTransactions');
            await creditTransactionsRef.add({
                orderId: orderId,
                supplierId: supplierId,
                supplierName: orderData.supplierName,
                amount: orderData.total,
                status: 'pending', // Pending payment from vendor
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });
        }

        res.status(200).json({ message: 'Order marked as delivered successfully!' });

    } catch (error) {
        console.error(`Error marking order ${orderId} as delivered for supplier ${supplierId}:`, error);
        res.status(500).json({ message: 'Failed to mark order as delivered.', error: error.message });
    }
});


// GET /api/sales/supplier/:supplierId
// Fetches sales data for a specific supplier
app.get('/api/sales/supplier/:supplierId', async (req, res) => {
    const { supplierId } = req.params;
    try {
        // In a real app, you'd aggregate sales data from delivered orders.
        // For now, return sample data.
        const sampleSales = {
            today: { amount: 1250, growth: '+15%' },
            week: { amount: 8500, growth: '+8%' },
            month: { amount: 32750, growth: '-3%' },
            trend: [60, 80, 45, 90, 70, 85, 95], // percentages for chart bars
            topItems: [
                { name: 'Onions', sold: '45kg', revenue: 1800 },
                { name: 'Tomatoes', sold: '38kg', revenue: 1330 },
                { name: 'Potatoes', sold: '52kg', revenue: 1300 },
            ]
        };
        res.status(200).json(sampleSales);
    } catch (error) {
        console.error(`Error fetching sales data for supplier ${supplierId}:`, error);
        res.status(500).json({ message: 'Failed to fetch sales data.', error: error.message });
    }
});

// GET /api/ratings/supplier/:supplierId
// Fetches ratings and reviews for a specific supplier
app.get('/api/ratings/supplier/:supplierId', async (req, res) => {
    const { supplierId } = req.params;
    try {
        const ratingsRef = getAppSpecificCollection('ratings');
        const snapshot = await ratingsRef
            .where('supplierId', '==', supplierId)
            .orderBy('createdAt', 'desc')
            .get();
        const reviews = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Calculate overall rating and breakdown
        let totalRating = 0;
        const ratingCounts = { '5': 0, '4': 0, '3': 0, '2': 0, '1': 0 };

        reviews.forEach(r => {
            totalRating += r.overallRating;
            if (ratingCounts[r.overallRating]) {
                ratingCounts[r.overallRating]++;
            } else {
                ratingCounts[r.overallRating] = 1;
            }
        });

        const overallAverage = reviews.length > 0 ? (totalRating / reviews.length).toFixed(1) : 0;

        res.status(200).json({
            overallRating: parseFloat(overallAverage),
            totalReviews: reviews.length,
            ratingBreakdown: ratingCounts,
            recentReviews: reviews
        });

    } catch (error) {
        console.error(`Error fetching ratings for supplier ${supplierId}:`, error);
        res.status(500).json({ message: 'Failed to fetch ratings.', error: error.message });
    }
});


// Start the server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Serving static files from: ${path.join(__dirname, '../client')}`);
    console.log('Ensure GOOGLE_APPLICATION_CREDENTIALS environment variable is set for Firestore access.');
});

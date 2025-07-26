// Global Variables
let currentUser = null;
let currentLocation = null;
let cart = [];
let suppliers = [];
let orders = []; // For Vendor's My Orders
let inventory = []; // For Supplier's Inventory
let incomingOrders = []; // For Supplier's Incoming Orders
let orderHistory = []; // For Vendor's Order History

// DOM Elements
const loadingScreen = document.getElementById('loadingScreen');
const authSection = document.getElementById('authSection');
const vendorDashboard = document.getElementById('vendorDashboard');
const supplierDashboard = document.getElementById('supplierDashboard');
const toastContainer = document.getElementById('toastContainer');

// Initialize App
document.addEventListener('DOMContentLoaded', function() {
    // Show loading screen initially, then transition to auth
    setTimeout(() => {
        loadingScreen.classList.add('hidden');
        authSection.classList.remove('hidden');
    }, 2000);

    initializeEventListeners();
    loadSampleData(); // Load initial sample data
});

// Event Listeners
function initializeEventListeners() {
    // Auth Tab Switching
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const tab = this.getAttribute('data-tab');
            switchAuthTab(tab);
        });
    });

    // Form Submissions
    const loginForm = document.getElementById('loginFormElement');
    const registerForm = document.getElementById('registerFormElement');
    
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }

    // Dashboard Navigation (applies to both vendor and supplier navs)
    // Select all nav-btn elements, regardless of which dashboard they belong to
    const navBtns = document.querySelectorAll('.dashboard-nav .nav-btn'); 
    navBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const section = this.getAttribute('data-section');
            // Determine which dashboard is active to apply active class correctly
            const parentDashboard = this.closest('.dashboard');
            if (parentDashboard) {
                // Remove active class from all nav buttons within the current dashboard
                parentDashboard.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
                // Add active class to the clicked button
                this.classList.add('active');
                // Switch the section
                switchDashboardSection(section, parentDashboard.id);
            }
        });
    });

    // Location Button (Vendor Dashboard)
    const locationBtn = document.getElementById('getLocationBtn');
    if (locationBtn) {
        locationBtn.addEventListener('click', getCurrentLocation);
    }

    // Logout Buttons
    const vendorLogout = document.getElementById('vendorLogout');
    const supplierLogout = document.getElementById('supplierLogout');
    
    if (vendorLogout) {
        vendorLogout.addEventListener('click', logout);
    }
    
    if (supplierLogout) {
        supplierLogout.addEventListener('click', logout);
    }

    // Modal Controls
    initializeModals();
    
    // Supplier Actions (for Vendor Dashboard)
    initializeSupplierActions();
    
    // Order Actions (for Vendor Dashboard)
    initializeOrderActions();
    
    // Inventory Actions (for Supplier Dashboard)
    initializeInventoryActions();
    
    // Rating System (for Vendor Dashboard)
    initializeRatingSystem();

    // Supplier Incoming Orders Filter Buttons
    const incomingOrderFilterBtns = document.querySelectorAll('#incomingSection .filter-btn');
    incomingOrderFilterBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const status = this.getAttribute('data-status');
            // Remove active class from all filter buttons
            incomingOrderFilterBtns.forEach(b => b.classList.remove('active'));
            // Add active class to the clicked button
            this.classList.add('active');
            filterIncomingOrders(status);
        });
    });
}

// Authentication Functions
function switchAuthTab(tab) {
    const tabBtns = document.querySelectorAll('.auth-tabs .tab-btn');
    const authForms = document.querySelectorAll('.auth-form');
    
    tabBtns.forEach(btn => btn.classList.remove('active'));
    authForms.forEach(form => form.classList.remove('active'));
    
    document.querySelector(`.auth-tabs [data-tab="${tab}"]`).classList.add('active');
    document.getElementById(`${tab}Form`).classList.add('active');
}

function handleLogin(e) {
    e.preventDefault();
    
    const phone = document.getElementById('loginPhone').value;
    const password = document.getElementById('loginPassword').value;
    const role = document.querySelector('input[name="loginRole"]:checked').value;
    
    // Simulate authentication
    if (phone && password) {
        currentUser = {
            phone: phone,
            role: role,
            name: role === 'vendor' ? 'Demo Vendor' : 'Demo Supplier'
        };
        
        showToast('Login successful!', 'success');
        
        setTimeout(() => {
            authSection.classList.add('hidden');
            if (role === 'vendor') {
                vendorDashboard.classList.remove('hidden');
                switchDashboardSection('discover', 'vendorDashboard'); // Load default vendor section
            } else {
                supplierDashboard.classList.remove('hidden');
                switchDashboardSection('inventory', 'supplierDashboard'); // Load default supplier section
            }
        }, 1000);
    } else {
        showToast('Please fill in all fields', 'error');
    }
}

function handleRegister(e) {
    e.preventDefault();
    
    const name = document.getElementById('registerName').value;
    const phone = document.getElementById('registerPhone').value;
    const address = document.getElementById('registerAddress').value;
    const password = document.getElementById('registerPassword').value;
    const role = document.querySelector('input[name="registerRole"]:checked').value;
    
    if (name && phone && address && password) {
        currentUser = {
            name: name,
            phone: phone,
            address: address,
            role: role
        };
        
        showToast('Registration successful!', 'success');
        
        setTimeout(() => {
            authSection.classList.add('hidden');
            if (role === 'vendor') {
                vendorDashboard.classList.remove('hidden');
                switchDashboardSection('discover', 'vendorDashboard'); // Load default vendor section
            } else {
                supplierDashboard.classList.remove('hidden');
                switchDashboardSection('inventory', 'supplierDashboard'); // Load default supplier section
            }
        }, 1000);
    } else {
        showToast('Please fill in all fields', 'error');
    }
}

function logout() {
    currentUser = null;
    currentLocation = null;
    cart = [];
    
    vendorDashboard.classList.add('hidden');
    supplierDashboard.classList.add('hidden');
    authSection.classList.remove('hidden');
    
    showToast('Logged out successfully', 'info');
}

// Dashboard Functions
function switchDashboardSection(section, dashboardId) {
    // Hide all sections within the active dashboard
    const sections = document.querySelectorAll(`#${dashboardId} .dashboard-section`);
    sections.forEach(sec => sec.classList.remove('active'));
    
    // Show the requested section
    document.getElementById(`${section}Section`).classList.add('active');
    
    // Load data based on the section
    if (dashboardId === 'vendorDashboard') {
        if (section === 'discover') {
            loadSuppliers();
        } else if (section === 'orders') {
            loadOrders();
        } else if (section === 'history') {
            loadOrderHistory();
        } else if (section === 'credit') {
            loadCreditTracker(); // New function for credit tracker
        }
    } else if (dashboardId === 'supplierDashboard') {
        if (section === 'inventory') {
            loadInventory();
        } else if (section === 'incoming') {
            loadIncomingOrders();
        } else if (section === 'sales') {
            loadSales(); // New function for sales
        } else if (section === 'ratings') {
            loadRatings(); // New function for ratings
        }
    }
}

// Location Functions
function getCurrentLocation() {
    const locationTextElement = document.getElementById('locationText');
    if (navigator.geolocation) {
        showToast('Getting your location...', 'info');
        
        navigator.geolocation.getCurrentPosition(
            function(position) {
                currentLocation = {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude
                };
                
                if (locationTextElement) {
                    locationTextElement.textContent = 'Location Found';
                }
                showToast('Location detected successfully!', 'success');
                loadSuppliers(); // Reload suppliers based on new location
            },
            function(error) {
                showToast('Could not get location. Please enable location services.', 'error');
                if (locationTextElement) {
                    locationTextElement.textContent = 'Detect Location'; // Reset text on error
                }
            }
        );
    } else {
        showToast('Geolocation is not supported by this browser', 'error');
    }
}

// Vendor Dashboard Functions
function loadSuppliers() {
    const suppliersList = document.getElementById('suppliersList');
    if (!suppliersList) return;
    
    // Sample suppliers data (You can replace this with actual data fetching)
    const sampleSuppliers = [
        {
            id: 1,
            name: 'Fresh Mart Supplies',
            address: 'Market Street, Sector 5',
            rating: 4.5,
            distance: 0.8,
            deliveryTime: 30,
            items: [
                { name: 'Onions', price: 40, stock: 50, unit: 'kg' },
                { name: 'Tomatoes', price: 35, stock: 30, unit: 'kg' },
                { name: 'Potatoes', price: 25, stock: 80, unit: 'kg' }
            ]
        },
        {
            id: 2,
            name: 'Local Veggie Hub',
            address: 'Green Plaza, Block A',
            rating: 4.2,
            distance: 1.2,
            deliveryTime: 45,
            items: [
                { name: 'Carrots', price: 45, stock: 25, unit: 'kg' },
                { name: 'Cabbage', price: 30, stock: 40, unit: 'kg' },
                { name: 'Capsicum', price: 60, stock: 15, unit: 'kg' }
            ]
        },
        {
            id: 3,
            name: 'Spice & More',
            address: 'Central Market, Shop 12',
            rating: 4.8,
            distance: 2.1,
            deliveryTime: 60,
            items: [
                { name: 'Garam Masala', price: 200, stock: 10, unit: 'kg' },
                { name: 'Turmeric Powder', price: 150, stock: 20, unit: 'kg' },
                { name: 'Red Chili Powder', price: 180, stock: 15, unit: 'kg' }
            ]
        }
    ];
    
    suppliers = sampleSuppliers; // Update global suppliers array
    renderSuppliers(suppliers);
}

function renderSuppliers(suppliersData) {
    const suppliersList = document.getElementById('suppliersList');
    if (!suppliersList) return;
    
    suppliersList.innerHTML = '';
    
    suppliersData.forEach(supplier => {
        const supplierCard = createSupplierCard(supplier);
        suppliersList.appendChild(supplierCard);
    });
}

function createSupplierCard(supplier) {
    const card = document.createElement('div');
    card.className = 'supplier-card';
    card.setAttribute('data-supplier-id', supplier.id);
    
    const stars = generateStars(supplier.rating);
    
    card.innerHTML = `
        <div class="supplier-header">
            <div class="supplier-info">
                <h3>${supplier.name}</h3>
                <p class="supplier-address">${supplier.address}</p>
            </div>
            <div class="supplier-rating">
                <div class="rating-stars">${stars}</div>
                <span class="rating-number">${supplier.rating}</span>
            </div>
        </div>
        <div class="supplier-details">
            <p class="distance"><i class="fas fa-map-marker-alt"></i> ${supplier.distance} km away</p>
            <p class="delivery-time"><i class="fas fa-clock"></i> ${supplier.deliveryTime} min delivery</p>
        </div>
        <div class="supplier-items">
            ${supplier.items.map(item => `
                <div class="item-row">
                    <span class="item-name">${item.name}</span>
                    <span class="item-price">₹${item.price}/${item.unit}</span>
                    <span class="item-stock">${item.stock}${item.unit} available</span>
                </div>
            `).join('')}
        </div>
        <div class="supplier-actions">
            <button class="btn secondary view-supplier-btn">
                <i class="fas fa-eye"></i>
                View Details
            </button>
            <button class="btn primary order-now-btn">
                <i class="fas fa-shopping-cart"></i>
                Order Now
            </button>
        </div>
    `;
    
    return card;
}

function generateStars(rating) {
    const fullStars = Math.floor(rating);
    const hasHalf = rating % 1 !== 0;
    const emptyStars = 5 - Math.ceil(rating);
    
    let stars = '';
    
    for (let i = 0; i < fullStars; i++) {
        stars += '<i class="fas fa-star"></i>';
    }
    
    if (hasHalf) {
        stars += '<i class="fas fa-star-half-alt"></i>';
    }
    
    for (let i = 0; i < emptyStars; i++) {
        stars += '<i class="far fa-star"></i>';
    }
    
    return stars;
}

function loadOrders() {
    const ordersSection = document.getElementById('ordersSection');
    if (!ordersSection) return;

    // Sample current orders (You can replace this with actual data fetching)
    const sampleOrders = [
        {
            id: 'SL001',
            supplier: 'Fresh Mart Supplies',
            status: 'pending',
            items: [
                { name: 'Onions', quantity: 2, price: 80, unit: 'kg' },
                { name: 'Tomatoes', quantity: 3, price: 105, unit: 'kg' }
            ],
            total: 205,
            deliveryFee: 20
        },
        {
            id: 'SL002',
            supplier: 'Local Veggie Hub',
            status: 'confirmed',
            items: [
                { name: 'Carrots', quantity: 1, price: 45, unit: 'kg' },
                { name: 'Cabbage', quantity: 2, price: 60, unit: 'kg' }
            ],
            total: 125,
            deliveryFee: 20,
            eta: 15
        }
    ];
    
    orders = sampleOrders; // Update global orders array
    renderOrders(orders);
}

function renderOrders(ordersData) {
    const ordersContainer = document.querySelector('#ordersSection .orders-container');
    if (!ordersContainer) return;
    
    ordersContainer.innerHTML = '';
    
    if (ordersData.length === 0) {
        ordersContainer.innerHTML = '<p class="no-data-message">No active orders found.</p>';
        return;
    }

    ordersData.forEach(order => {
        const orderCard = createOrderCard(order);
        ordersContainer.appendChild(orderCard);
    });
}

function createOrderCard(order) {
    const card = document.createElement('div');
    card.className = `order-card ${order.status}`;
    
    const statusClass = order.status === 'pending' ? 'pending' : 'confirmed';
    const statusIcon = order.status === 'pending' ? 'fas fa-clock' : 'fas fa-check-circle';
    const statusText = order.status === 'pending' ? 'Pending Confirmation' : 'Confirmed - Out for Delivery';
    
    card.innerHTML = `
        <div class="order-header">
            <div class="order-info">
                <h4>Order #${order.id}</h4>
                <p class="supplier-name">${order.supplier}</p>
            </div>
            <div class="order-status ${statusClass}">
                <i class="${statusIcon}"></i>
                ${statusText}
            </div>
        </div>
        <div class="order-details">
            <div class="order-items">
                ${order.items.map(item => `
                    <div class="item">
                        <span>${item.name} - ${item.quantity}${item.unit}</span>
                        <span>₹${item.price}</span>
                    </div>
                `).join('')}
                <div class="delivery-fee">
                    <span>Delivery Fee</span>
                    <span>₹${order.deliveryFee}</span>
                </div>
            </div>
            <div class="order-total">
                <strong>Total: ₹${order.total}</strong>
            </div>
            ${order.eta ? `
                <div class="delivery-info">
                    <p><i class="fas fa-map-marker-alt"></i> ETA: ${order.eta} minutes</p>
                </div>
            ` : ''}
        </div>
        <div class="order-actions">
            ${order.status === 'pending' ? `
                <button class="btn secondary call-supplier-btn">
                    <i class="fas fa-phone"></i>
                    Call Supplier
                </button>
                <button class="btn danger cancel-order-btn" data-order-id="${order.id}">
                    <i class="fas fa-times"></i>
                    Cancel Order
                </button>
            ` : `
                <button class="btn primary track-live-btn">
                    <i class="fas fa-map"></i>
                    Track Live
                </button>
            `}
        </div>
    `;
    
    return card;
}

function loadOrderHistory() {
    const historySection = document.getElementById('historySection');
    if (!historySection) return;

    // Sample order history (You can replace this with actual data fetching)
    const sampleHistory = [
        {
            id: 'SL000',
            supplier: 'Fresh Mart Supplies',
            date: 'Yesterday, 3:30 PM',
            status: 'completed',
            summary: '3 items • ₹180 • Cash Payment',
            canRate: true
        },
        {
            id: 'SL-001',
            supplier: 'Spice & More',
            date: '2 days ago, 1:15 PM',
            status: 'completed',
            summary: '2 items • ₹350 • Credit Payment',
            canRate: true
        }
    ];
    orderHistory = sampleHistory;
    renderOrderHistory(orderHistory);
    showToast('Order history loaded.', 'info');
}

function renderOrderHistory(historyData) {
    const historyContainer = document.querySelector('#historySection .history-container');
    if (!historyContainer) return;

    historyContainer.innerHTML = '';

    if (historyData.length === 0) {
        historyContainer.innerHTML = '<p class="no-data-message">No order history found.</p>';
        return;
    }

    historyData.forEach(order => {
        const orderCard = document.createElement('div');
        orderCard.className = `order-card ${order.status}`;
        orderCard.innerHTML = `
            <div class="order-header">
                <div class="order-info">
                    <h4>Order #${order.id}</h4>
                    <p class="supplier-name">${order.supplier}</p>
                    <p class="order-date">${order.date}</p>
                </div>
                <div class="order-status ${order.status}">
                    <i class="fas fa-check-circle"></i>
                    ${order.status === 'completed' ? 'Delivered' : 'Cancelled'}
                </div>
            </div>
            <div class="order-details">
                <div class="order-summary">
                    <span>${order.summary}</span>
                </div>
            </div>
            <div class="order-actions">
                <button class="btn secondary view-receipt-btn">
                    <i class="fas fa-receipt"></i>
                    View Receipt
                </button>
                ${order.canRate ? `
                <button class="btn primary rate-supplier-btn" data-order-id="${order.id}" data-supplier-name="${order.supplier}" data-order-date="${order.date}">
                    <i class="fas fa-star"></i>
                    Rate Supplier
                </button>` : ''}
                <button class="btn secondary reorder-btn">
                    <i class="fas fa-redo"></i>
                    Reorder
                </button>
            </div>
        `;
        historyContainer.appendChild(orderCard);
    });
}

function loadCreditTracker() {
    const creditSection = document.getElementById('creditSection');
    if (!creditSection) return;
    // You would typically load dynamic credit data here
    showToast('Credit tracker loaded.', 'info');
}


// Supplier Dashboard Functions
function loadInventory() {
    const inventorySection = document.getElementById('inventorySection');
    if (!inventorySection) return;

    // Sample inventory data (replace with actual data fetching)
    const sampleInventory = [
        { id: 1, name: 'Onions', price: 40, quantity: 50, unit: 'kg', status: 'in-stock' },
        { id: 2, name: 'Tomatoes', price: 35, quantity: 8, unit: 'kg', status: 'low-stock' },
        { id: 3, name: 'Potatoes', price: 25, quantity: 0, unit: 'kg', status: 'out-of-stock' },
        { id: 4, name: 'Carrots', price: 45, quantity: 25, unit: 'kg', status: 'in-stock' }
    ];
    
    inventory = sampleInventory; // Update global inventory array
    renderInventory(inventory);
    showToast('Inventory loaded.', 'info');
}

function renderInventory(inventoryData) {
    const inventoryGrid = document.getElementById('inventoryGrid');
    if (!inventoryGrid) return;
    
    inventoryGrid.innerHTML = '';
    
    if (inventoryData.length === 0) {
        inventoryGrid.innerHTML = '<p class="no-data-message">No inventory items found.</p>';
        return;
    }

    inventoryData.forEach(item => {
        const inventoryItem = createInventoryItem(item);
        inventoryGrid.appendChild(inventoryItem);
    });
}

function createInventoryItem(item) {
    const itemDiv = document.createElement('div');
    itemDiv.className = `inventory-item ${item.status}`;
    itemDiv.setAttribute('data-item-id', item.id); // Add data-id for editing/deleting
    
    const statusText = {
        'in-stock': 'In Stock',
        'low-stock': 'Low Stock',
        'out-of-stock': 'Out of Stock'
    };
    
    const statusIndicatorClass = {
        'in-stock': 'good',
        'low-stock': 'warning',
        'out-of-stock': 'danger'
    };
    
    itemDiv.innerHTML = `
        <div class="item-header">
            <h4>${item.name}</h4>
            <div class="stock-status">
                <span class="status-indicator ${statusIndicatorClass[item.status]}"></span>
                <span>${statusText[item.status]}</span>
            </div>
        </div>
        <div class="item-details">
            <div class="detail-row">
                <span>Price:</span>
                <span class="price">₹${item.price}/${item.unit}</span>
            </div>
            <div class="detail-row">
                <span>Available:</span>
                <span class="quantity">${item.quantity}${item.unit}</span>
            </div>
            <div class="detail-row">
                <span>Unit:</span>
                <span>${item.unit === 'kg' ? 'Kilogram' : item.unit.charAt(0).toUpperCase() + item.unit.slice(1)}</span>
            </div>
        </div>
        <div class="item-actions">
            ${item.status === 'out-of-stock' ? `
                <button class="btn primary small restock-btn" data-item-id="${item.id}">
                    <i class="fas fa-plus"></i>
                    Restock
                </button>
            ` : ''}
            <button class="btn secondary small edit-item-btn" data-item-id="${item.id}">
                <i class="fas fa-edit"></i>
                Edit
            </button>
            <button class="btn danger small delete-item-btn" data-item-id="${item.id}">
                <i class="fas fa-trash"></i>
                Delete
            </button>
        </div>
    `;
    
    return itemDiv;
}

function loadIncomingOrders() {
    const incomingSection = document.getElementById('incomingSection');
    if (!incomingSection) return;

    // Sample incoming orders for suppliers (replace with actual data fetching)
    const sampleIncomingOrders = [
        {
            id: 'ORD001',
            vendor: 'Ram\'s Food Stall',
            distance: 0.5,
            timeAgo: '5 minutes ago',
            amount: 185,
            items: [
                { name: 'Onions', quantity: 2, unit: 'kg', price: 80 },
                { name: 'Tomatoes', quantity: 3, unit: 'kg', price: 105 }
            ],
            payment: 'Cash on Delivery',
            notes: 'Please select fresh vegetables',
            status: 'pending'
        },
        {
            id: 'ORD002',
            vendor: 'Sharma Snacks Corner',
            distance: 1.2,
            timeAgo: '12 minutes ago',
            amount: 250,
            items: [
                { name: 'Potatoes', quantity: 5, unit: 'kg', price: 125 },
                { name: 'Onions', quantity: 3, unit: 'kg', price: 120 }
            ],
            payment: 'Credit (Pay Later)',
            notes: 'Need delivery before 2 PM',
            status: 'pending'
        },
        {
            id: 'ORD003',
            vendor: 'Gupta Chaat Wala',
            distance: 0.8,
            timeAgo: 'Confirmed - Ready for delivery',
            amount: 320,
            items: [
                { name: 'Carrots', quantity: 4, unit: 'kg', price: 180 },
                { name: 'Tomatoes', quantity: 4, unit: 'kg', price: 140 }
            ],
            payment: 'Cash on Delivery',
            notes: '',
            status: 'confirmed'
        }
    ];
    incomingOrders = sampleIncomingOrders;
    renderIncomingOrders(incomingOrders); // Render all initially
    showToast('Incoming orders loaded.', 'info');
}

function renderIncomingOrders(ordersData) {
    const incomingOrdersContainer = document.querySelector('#incomingSection .incoming-orders');
    if (!incomingOrdersContainer) return;

    incomingOrdersContainer.innerHTML = '';

    if (ordersData.length === 0) {
        incomingOrdersContainer.innerHTML = '<p class="no-data-message">No incoming orders found for this status.</p>';
        return;
    }

    ordersData.forEach(order => {
        const orderRequestCard = createIncomingOrderCard(order);
        incomingOrdersContainer.appendChild(orderRequestCard);
    });
}

function createIncomingOrderCard(order) {
    const card = document.createElement('div');
    card.className = `order-request ${order.status}`;
    card.setAttribute('data-order-id', order.id);

    card.innerHTML = `
        <div class="order-header">
            <div class="vendor-info">
                <h4>${order.vendor}</h4>
                <p><i class="fas fa-map-marker-alt"></i> ${order.distance} km away</p>
                <p><i class="fas fa-clock"></i> ${order.timeAgo}</p>
            </div>
            <div class="order-amount">
                <span class="amount">₹${order.amount}</span>
            </div>
        </div>
        <div class="order-items">
            ${order.items.map(item => `
                <div class="item">
                    <span>${item.name} - ${item.quantity}${item.unit}</span>
                    <span>₹${item.price}</span>
                </div>
            `).join('')}
        </div>
        <div class="order-details">
            <p><strong>Payment:</strong> ${order.payment}</p>
            ${order.notes ? `<p><strong>Special Notes:</strong> ${order.notes}</p>` : ''}
        </div>
        <div class="order-actions">
            ${order.status === 'pending' ? `
                <button class="btn danger reject-order-btn" data-order-id="${order.id}">
                    <i class="fas fa-times"></i>
                    Reject
                </button>
                <button class="btn primary accept-order-btn" data-order-id="${order.id}">
                    <i class="fas fa-check"></i>
                    Accept Order
                </button>
            ` : `
                <button class="btn secondary call-vendor-btn">
                    <i class="fas fa-phone"></i>
                    Call Vendor
                </button>
                <button class="btn primary mark-delivered-btn" data-order-id="${order.id}">
                    <i class="fas fa-check-circle"></i>
                    Mark as Delivered
                </button>
            `}
        </div>
    `;
    return card;
}

function filterIncomingOrders(status) {
    let filtered = incomingOrders;
    if (status !== 'all') {
        filtered = incomingOrders.filter(order => order.status === status);
    }
    renderIncomingOrders(filtered);
}

function loadSales() {
    const salesSection = document.getElementById('salesSection');
    if (!salesSection) return;
    // You would typically load dynamic sales data and render charts here
    showToast('Sales analytics loaded.', 'info');
}

function loadRatings() {
    const ratingsSection = document.getElementById('ratingsSection');
    if (!ratingsSection) return;
    // You would typically load dynamic ratings data here
    showToast('Customer ratings loaded.', 'info');
}

// Modal Functions
function initializeModals() {
    const modals = document.querySelectorAll('.modal');
    const closeBtns = document.querySelectorAll('.modal .close-btn, .modal .btn.secondary'); // Also close with secondary buttons

    // Function to show modal
    window.showModal = function(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('visible');
        }
    };

    // Function to hide modal
    window.hideModal = function(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('visible');
        }
    };
    
    closeBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const modal = this.closest('.modal');
            if (modal) {
                hideModal(modal.id);
            }
        });
    });
    
    // Close modal when clicking outside
    modals.forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) { // Only close if clicking on the modal overlay itself
                hideModal(this.id);
            }
        });
    });
    
    // Add Inventory Button
    const addInventoryBtn = document.getElementById('addInventoryBtn');
    if (addInventoryBtn) {
        addInventoryBtn.addEventListener('click', function() {
            // Reset form and set title for 'Add' mode
            const inventoryForm = document.getElementById('inventoryForm');
            if (inventoryForm) inventoryForm.reset();
            const modalTitle = document.getElementById('inventoryModalTitle');
            if (modalTitle) modalTitle.textContent = 'Add Inventory Item';
            // Clear any hidden item ID if it was an edit
            inventoryForm.removeAttribute('data-editing-item-id');
            showModal('inventoryModal');
        });
    }
    
    // Inventory Form Submission
    const inventoryForm = document.getElementById('inventoryForm');
    if (inventoryForm) {
        inventoryForm.addEventListener('submit', handleInventorySubmit);
    }
}

function handleInventorySubmit(e) {
    e.preventDefault();
    
    const name = document.getElementById('itemName').value;
    const unit = document.getElementById('itemUnit').value;
    const price = parseFloat(document.getElementById('itemPrice').value);
    const quantity = parseInt(document.getElementById('itemQuantity').value);
    const description = document.getElementById('itemDescription').value;
    const editingItemId = e.target.getAttribute('data-editing-item-id');

    if (name && unit && !isNaN(price) && !isNaN(quantity)) {
        if (editingItemId) {
            // Edit existing item
            const itemIndex = inventory.findIndex(item => item.id === parseInt(editingItemId));
            if (itemIndex > -1) {
                inventory[itemIndex] = {
                    ...inventory[itemIndex],
                    name: name,
                    unit: unit,
                    price: price,
                    quantity: quantity,
                    description: description,
                    status: quantity > 10 ? 'in-stock' : (quantity > 0 ? 'low-stock' : 'out-of-stock')
                };
                showToast('Item updated successfully!', 'success');
            }
        } else {
            // Add new item
            const newItem = {
                id: inventory.length > 0 ? Math.max(...inventory.map(item => item.id)) + 1 : 1,
                name: name,
                price: price,
                quantity: quantity,
                unit: unit,
                description: description,
                status: quantity > 10 ? 'in-stock' : (quantity > 0 ? 'low-stock' : 'out-of-stock')
            };
            inventory.push(newItem);
            showToast('Item added successfully!', 'success');
        }
        
        renderInventory(inventory); // Re-render the inventory list
        hideModal('inventoryModal'); // Close the modal
        e.target.reset(); // Reset the form
        e.target.removeAttribute('data-editing-item-id'); // Clear editing state
    } else {
        showToast('Please fill in all required fields and ensure valid numbers for price/quantity.', 'error');
    }
}

// Additional Action Initializers
function initializeSupplierActions() {
    document.addEventListener('click', function(e) {
        // View supplier details, order now, etc.
        if (e.target.classList.contains('view-supplier-btn') || e.target.closest('.view-supplier-btn')) {
            showToast('Supplier details opened (functionality to be implemented)', 'info');
        }
        
        if (e.target.classList.contains('order-now-btn') || e.target.closest('.order-now-btn')) {
            showToast('Order form opened (functionality to be implemented)', 'info');
        }
    });
}

function initializeOrderActions() {
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('accept-order-btn') || e.target.closest('.accept-order-btn')) {
            const orderId = e.target.getAttribute('data-order-id') || e.target.closest('.accept-order-btn').getAttribute('data-order-id');
            // Logic to accept order (e.g., update status in incomingOrders array)
            const orderIndex = incomingOrders.findIndex(order => order.id === orderId);
            if (orderIndex > -1) {
                incomingOrders[orderIndex].status = 'confirmed';
                incomingOrders[orderIndex].timeAgo = 'Confirmed - Ready for delivery'; // Update status text
                renderIncomingOrders(incomingOrders); // Re-render to reflect change
                showToast(`Order ${orderId} accepted successfully!`, 'success');
            }
        }
        
        if (e.target.classList.contains('mark-delivered-btn') || e.target.closest('.mark-delivered-btn')) {
            const orderId = e.target.getAttribute('data-order-id') || e.target.closest('.mark-delivered-btn').getAttribute('data-order-id');
            // Logic to mark as delivered (e.g., move from incomingOrders to a 'completed' array)
            const orderIndex = incomingOrders.findIndex(order => order.id === orderId);
            if (orderIndex > -1) {
                const deliveredOrder = incomingOrders.splice(orderIndex, 1)[0]; // Remove and get the order
                deliveredOrder.status = 'delivered';
                deliveredOrder.timeAgo = 'Delivered'; // Update status text
                // You would typically add this to a 'deliveredOrders' array or similar
                // For now, just re-render incoming orders
                renderIncomingOrders(incomingOrders); 
                showToast(`Order ${orderId} marked as delivered!`, 'success');
            }
        }

        if (e.target.classList.contains('cancel-order-btn') || e.target.closest('.cancel-order-btn')) {
            const orderId = e.target.getAttribute('data-order-id') || e.target.closest('.cancel-order-btn').getAttribute('data-order-id');
            // Use a custom message box instead of confirm()
            showToast(`Are you sure you want to cancel Order ${orderId}? (Cancellation logic to be implemented)`, 'warning');
            // Implement actual cancellation logic here, perhaps with a custom modal for confirmation
        }

        if (e.target.classList.contains('reject-order-btn') || e.target.closest('.reject-order-btn')) {
            const orderId = e.target.getAttribute('data-order-id') || e.target.closest('.reject-order-btn').getAttribute('data-order-id');
            // Use a custom message box instead of confirm()
            showToast(`Are you sure you want to reject Order ${orderId}? (Rejection logic to be implemented)`, 'warning');
            // Implement actual rejection logic here
        }
        
        if (e.target.classList.contains('rate-supplier-btn') || e.target.closest('.rate-supplier-btn')) {
            const btn = e.target.closest('.rate-supplier-btn');
            const orderId = btn.getAttribute('data-order-id');
            const supplierName = btn.getAttribute('data-supplier-name');
            const orderDate = btn.getAttribute('data-order-date');

            // Populate rating modal with order info
            document.getElementById('ratingSupplierName').textContent = supplierName;
            document.getElementById('ratingOrderInfo').textContent = `Order #${orderId} • ${orderDate}`;
            document.getElementById('submitRating').setAttribute('data-order-id', orderId); // Store order ID for submission

            // Reset stars
            const mainStars = document.querySelectorAll('#starRating i');
            mainStars.forEach(s => s.className = 'far fa-star');
            const miniStars = document.querySelectorAll('.mini-stars i');
            miniStars.forEach(s => s.className = 'far fa-star');
            document.getElementById('reviewText').value = ''; // Clear review text

            showModal('ratingModal');
        }
    });
}

function initializeInventoryActions() {
    document.addEventListener('click', function(e) {
        // Edit item
        if (e.target.classList.contains('edit-item-btn') || e.target.closest('.edit-item-btn')) {
            const itemId = e.target.getAttribute('data-item-id') || e.target.closest('.edit-item-btn').getAttribute('data-item-id');
            const itemToEdit = inventory.find(item => item.id === parseInt(itemId));
            
            if (itemToEdit) {
                const inventoryForm = document.getElementById('inventoryForm');
                const modalTitle = document.getElementById('inventoryModalTitle');

                if (modalTitle) modalTitle.textContent = 'Edit Inventory Item';
                if (inventoryForm) {
                    document.getElementById('itemName').value = itemToEdit.name;
                    document.getElementById('itemUnit').value = itemToEdit.unit;
                    document.getElementById('itemPrice').value = itemToEdit.price;
                    document.getElementById('itemQuantity').value = itemToEdit.quantity;
                    document.getElementById('itemDescription').value = itemToEdit.description || '';
                    inventoryForm.setAttribute('data-editing-item-id', itemToEdit.id); // Store ID for update
                }
                showModal('inventoryModal');
            } else {
                showToast('Item not found for editing.', 'error');
            }
        }
        
        // Delete item
        if (e.target.classList.contains('delete-item-btn') || e.target.closest('.delete-item-btn')) {
            const itemId = e.target.getAttribute('data-item-id') || e.target.closest('.delete-item-btn').getAttribute('data-item-id');
            // Instead of confirm(), show a toast and implement a custom confirmation modal if needed
            showToast(`Item ${itemId} will be deleted. (Deletion logic to be implemented)`, 'warning');
            // Implement actual deletion logic here, perhaps with a custom modal for confirmation
        }
        
        if (e.target.classList.contains('restock-btn') || e.target.closest('.restock-btn')) {
            showToast('Restock functionality (to be implemented)', 'info');
        }
    });
}

function initializeRatingSystem() {
    const starRating = document.getElementById('starRating');
    const submitRatingBtn = document.getElementById('submitRating');
    
    if (starRating) {
        const stars = starRating.querySelectorAll('i');
        let selectedRating = 0;
        
        stars.forEach((star, index) => {
            star.addEventListener('click', function() {
                selectedRating = index + 1;
                
                stars.forEach((s, i) => {
                    if (i < selectedRating) {
                        s.className = 'fas fa-star';
                    } else {
                        s.className = 'far fa-star';
                    }
                });
            });
        });

        // Initialize mini-stars for categories
        document.querySelectorAll('.mini-stars').forEach(miniStarContainer => {
            const miniStars = miniStarContainer.querySelectorAll('i');
            miniStars.forEach((star, index) => {
                star.addEventListener('click', function() {
                    const currentRating = index + 1;
                    miniStars.forEach((s, i) => {
                        if (i < currentRating) {
                            s.className = 'fas fa-star';
                        } else {
                            s.className = 'far fa-star';
                        }
                    });
                });
            });
        });
    }
    
    if (submitRatingBtn) {
        submitRatingBtn.addEventListener('click', function() {
            const orderId = this.getAttribute('data-order-id');
            const overallRating = document.querySelectorAll('#starRating .fas.fa-star').length;
            const reviewText = document.getElementById('reviewText').value;
            
            // Get category ratings
            const qualityRating = document.querySelector('.mini-stars[data-category="quality"] .fas.fa-star').length;
            const deliveryRating = document.querySelector('.mini-stars[data-category="delivery"] .fas.fa-star').length;
            const communicationRating = document.querySelector('.mini-stars[data-category="communication"] .fas.fa-star').length;

            if (overallRating === 0) {
                showToast('Please provide an overall rating.', 'error');
                return;
            }

            showToast(`Rating for Order ${orderId} submitted! Overall: ${overallRating} stars.`, 'success');
            
            hideModal('ratingModal');
        });
    }
}

// Utility Functions
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = {
        success: 'fas fa-check-circle',
        error: 'fas fa-exclamation-triangle',
        info: 'fas fa-info-circle',
        warning: 'fas fa-exclamation-circle'
    };
    
    toast.innerHTML = `
        <i class="${icons[type] || icons.info}"></i>
        ${message}
    `;
    
    toastContainer.appendChild(toast);
    
    // Remove toast after 3 seconds, allowing CSS animation to complete
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

function loadSampleData() {
    // Initial load for vendor dashboard (if it's the default view)
    // For now, this is handled by login/register setting the initial dashboard
    // and calling switchDashboardSection.
}

// Search and Filter Functions (for Vendor's Discover Suppliers)
document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('searchItems');
    const sortBySelect = document.getElementById('sortBy');
    const radiusFilterSelect = document.getElementById('radiusFilter'); // Assuming this exists in HTML

    if (searchInput) {
        searchInput.addEventListener('input', filterAndSortSuppliers);
    }
    
    if (sortBySelect) {
        sortBySelect.addEventListener('change', filterAndSortSuppliers);
    }

    if (radiusFilterSelect) {
        radiusFilterSelect.addEventListener('change', filterAndSortSuppliers);
    }

    function filterAndSortSuppliers() {
        let currentSuppliers = [...suppliers]; // Start with all original suppliers

        // Apply search filter
        const query = searchInput ? searchInput.value.toLowerCase() : '';
        if (query) {
            currentSuppliers = currentSuppliers.filter(supplier => 
                supplier.name.toLowerCase().includes(query) ||
                supplier.items.some(item => item.name.toLowerCase().includes(query))
            );
        }

        // Apply radius filter
        const selectedRadius = radiusFilterSelect ? parseFloat(radiusFilterSelect.value) : null;
        if (selectedRadius !== null) {
            currentSuppliers = currentSuppliers.filter(supplier => supplier.distance <= selectedRadius);
        }

        // Apply sort
        const sortByCriteria = sortBySelect ? sortBySelect.value : 'distance';
        switch(sortByCriteria) {
            case 'distance':
                currentSuppliers.sort((a, b) => a.distance - b.distance);
                break;
            case 'price':
                currentSuppliers.sort((a, b) => {
                    const avgPriceA = a.items.reduce((sum, item) => sum + item.price, 0) / a.items.length;
                    const avgPriceB = b.items.reduce((sum, item) => sum + item.price, 0) / b.items.length;
                    return avgPriceA - avgPriceB;
                });
                break;
            case 'rating':
                currentSuppliers.sort((a, b) => b.rating - a.rating);
                break;
        }
        
        renderSuppliers(currentSuppliers);
    }
});

// Hidden class utility (already in your CSS, but good to have here for completeness if used dynamically)
document.addEventListener('DOMContentLoaded', function() {
    const style = document.createElement('style');
    style.textContent = `
        .hidden {
            display: none !important;
        }
        .no-data-message {
            text-align: center;
            color: #757575;
            font-size: 16px;
            padding: 40px 20px;
            background: #f0f0f0;
            border-radius: 12px;
            margin-top: 20px;
        }
    `;
    document.head.appendChild(style);
});

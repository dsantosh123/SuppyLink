// Global Variables
let currentUser = null; // Will store user data (id, name, role) after login/registration
let currentLocation = null;
let cart = []; // Still client-side for now, would typically be managed on backend for persistence
let suppliers = []; // Data fetched from backend (for vendor discover)
let orders = []; // Vendor's My Orders, fetched from backend
let inventory = []; // Supplier's Inventory, fetched from backend
let incomingOrders = []; // Supplier's Incoming Orders, fetched from backend
let orderHistory = []; // Vendor's Order History, fetched from backend

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

    // Profile Buttons
    const vendorProfileBtn = document.getElementById('vendorProfile');
    if (vendorProfileBtn) {
        vendorProfileBtn.addEventListener('click', showVendorProfile);
    }
    const supplierProfileBtn = document.getElementById('supplierProfile');
    if (supplierProfileBtn) {
        supplierProfileBtn.addEventListener('click', showSupplierProfile);
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
    initializeModals(); // This function initializes modal event listeners

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

    // Vendor Order History Filter Buttons (if they exist)
    const historyFilterSelect = document.getElementById('historyFilter');
    if (historyFilterSelect) {
        historyFilterSelect.addEventListener('change', loadOrderHistory); // Reload history on filter change
    }
    const fromDateInput = document.getElementById('fromDate');
    const toDateInput = document.getElementById('toDate');
    if (fromDateInput) fromDateInput.addEventListener('change', loadOrderHistory);
    if (toDateInput) toDateInput.addEventListener('change', loadOrderHistory);

    // Supplier Notifications Button
    const notificationBtn = document.getElementById('notificationBtn');
    if (notificationBtn) {
        notificationBtn.addEventListener('click', showNotifications);
    }
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

async function handleLogin(e) {
    e.preventDefault();
    
    const phone = document.getElementById('loginPhone').value;
    const password = document.getElementById('loginPassword').value;
    const role = document.querySelector('input[name="loginRole"]:checked').value;
    
    if (!phone || !password || !role) {
        showToast('Please fill in all fields', 'error');
        return;
    }

    const loginBtn = e.submitter; // Get the clicked submit button
    loginBtn.classList.add('loading'); // Add loading state
    loginBtn.disabled = true;

    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ phone, password, role })
        });

        const data = await response.json();

        if (response.ok) {
            currentUser = data.user; // Store user data
            showToast('Login successful!', 'success');
            
            setTimeout(() => {
                authSection.classList.add('hidden');
                if (currentUser.role === 'vendor') {
                    vendorDashboard.classList.remove('hidden');
                    switchDashboardSection('discover', 'vendorDashboard'); // Load default vendor section
                } else {
                    supplierDashboard.classList.remove('hidden');
                    switchDashboardSection('inventory', 'supplierDashboard'); // Load default supplier section
                }
            }, 500); // Shorten delay for smoother transition
        } else {
            showToast(data.message || 'Login failed. Please try again.', 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showToast('Network error. Could not connect to server.', 'error');
    } finally {
        loginBtn.classList.remove('loading'); // Remove loading state
        loginBtn.disabled = false;
    }
}

async function handleRegister(e) {
    e.preventDefault();
    
    const name = document.getElementById('registerName').value;
    const phone = document.getElementById('registerPhone').value;
    const address = document.getElementById('registerAddress').value;
    const password = document.getElementById('registerPassword').value;
    const role = document.querySelector('input[name="registerRole"]:checked').value;
    
    if (!name || !phone || !address || !password || !role) {
        showToast('Please fill in all fields', 'error');
        return;
    }

    const registerBtn = e.submitter;
    registerBtn.classList.add('loading');
    registerBtn.disabled = true;

    try {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, phone, address, password, role })
        });

        const data = await response.json();

        if (response.ok) {
            currentUser = data.user; // Store user data
            showToast('Registration successful!', 'success');
            
            setTimeout(() => {
                authSection.classList.add('hidden');
                if (currentUser.role === 'vendor') {
                    vendorDashboard.classList.remove('hidden');
                    switchDashboardSection('discover', 'vendorDashboard');
                } else {
                    supplierDashboard.classList.remove('hidden');
                    switchDashboardSection('inventory', 'supplierDashboard');
                }
            }, 500);
        } else {
            showToast(data.message || 'Registration failed. Please try again.', 'error');
        }
    } catch (error) {
        console.error('Registration error:', error);
        showToast('Network error. Could not connect to server.', 'error');
    } finally {
        registerBtn.classList.remove('loading');
        registerBtn.disabled = false;
    }
}

function logout() {
    currentUser = null;
    currentLocation = null;
    cart = [];
    // Clear any local storage items if you were using them for persistence
    // localStorage.removeItem('currentUser'); 
    
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
            loadCreditTracker();
        }
    } else if (dashboardId === 'supplierDashboard') {
        if (section === 'inventory') {
            loadInventory();
        } else if (section === 'incoming') {
            loadIncomingOrders();
        } else if (section === 'sales') {
            loadSales();
        } else if (section === 'ratings') {
            loadRatings();
        }
    }
}

// Profile Functions
async function loadProfileData(userId, role) {
    try {
        const response = await fetch(`/api/users/${userId}`);
        const data = await response.json();
        if (response.ok) {
            return data;
        } else {
            showToast(data.message || `Failed to load ${role} profile.`, 'error');
            return null;
        }
    } catch (error) {
        console.error(`Error loading ${role} profile:`, error);
        showToast(`Network error. Could not load ${role} profile.`, 'error');
        return null;
    }
}

async function showVendorProfile() {
    if (!currentUser || currentUser.role !== 'vendor') {
        showToast('Please log in as a vendor to view your profile.', 'error');
        return;
    }

    const profileData = await loadProfileData(currentUser.id, 'vendor');
    if (profileData) {
        document.getElementById('vendorProfileName').textContent = profileData.name;
        document.getElementById('vendorProfilePhone').textContent = profileData.phone;
        document.getElementById('vendorProfileAddress').textContent = profileData.address;
        document.getElementById('vendorProfileRole').textContent = profileData.role.charAt(0).toUpperCase() + profileData.role.slice(1);
        showModal('vendorProfileModal');
    }
}

async function showSupplierProfile() {
    if (!currentUser || currentUser.role !== 'supplier') {
        showToast('Please log in as a supplier to view your profile.', 'error');
        return;
    }

    const profileData = await loadProfileData(currentUser.id, 'supplier');
    if (profileData) {
        document.getElementById('supplierProfileName').textContent = profileData.name;
        document.getElementById('supplierProfilePhone').textContent = profileData.phone;
        document.getElementById('supplierProfileAddress').textContent = profileData.address;
        document.getElementById('supplierProfileRole').textContent = profileData.role.charAt(0).toUpperCase() + profileData.role.slice(1);
        // Fetch supplier-specific public data for rating
        try {
            const supplierPublicResponse = await fetch(`/api/suppliers/${currentUser.id}`);
            const supplierPublicData = await supplierPublicResponse.json();
            if (supplierPublicResponse.ok) {
                document.getElementById('supplierProfileRating').textContent = supplierPublicData.rating.toFixed(1);
                document.getElementById('supplierProfileTotalReviews').textContent = supplierPublicData.totalReviews;
            } else {
                console.warn('Could not load public supplier data for profile:', supplierPublicData.message);
                document.getElementById('supplierProfileRating').textContent = 'N/A';
                document.getElementById('supplierProfileTotalReviews').textContent = 'N/A';
            }
        } catch (error) {
            console.error('Error fetching public supplier data for profile:', error);
            document.getElementById('supplierProfileRating').textContent = 'N/A';
            document.getElementById('supplierProfileTotalReviews').textContent = 'N/A';
        }
        showModal('supplierProfileModal');
    }
}


// Location Functions (Vendor specific)
async function getCurrentLocation() {
    const locationTextElement = document.getElementById('locationText');
    if (!locationTextElement) return;

    if (navigator.geolocation) {
        showToast('Getting your location...', 'info');
        
        navigator.geolocation.getCurrentPosition(
            function(position) {
                currentLocation = {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude
                };
                
                locationTextElement.textContent = 'Location Found';
                showToast('Location detected successfully!', 'success');
                // You might want to re-load suppliers based on the new location here
                loadSuppliers(); // Reload suppliers based on new location
            },
            function(error) {
                showToast('Could not get location. Please enable location services.', 'error');
                locationTextElement.textContent = 'Detect Location'; // Reset text on error
            }
        );
    } else {
        showToast('Geolocation is not supported by this browser', 'error');
    }
}

// Vendor Dashboard Functions

// Fetches suppliers from the backend API
async function loadSuppliers() {
    const suppliersList = document.getElementById('suppliersList');
    if (!suppliersList) return;

    try {
        const response = await fetch('/api/suppliers');
        const data = await response.json();

        if (response.ok) {
            suppliers = data; // Update global suppliers array
            filterAndSortSuppliers(); // Apply current filters/sort after loading
        } else {
            showToast(data.message || 'Failed to load suppliers.', 'error');
        }
    } catch (error) {
        console.error('Error loading suppliers:', error);
        showToast('Network error. Could not load suppliers.', 'error');
    }
}

function renderSuppliers(suppliersData) {
    const suppliersList = document.getElementById('suppliersList');
    if (!suppliersList) return;
    
    suppliersList.innerHTML = '';
    
    if (suppliersData.length === 0) {
        suppliersList.innerHTML = '<p class="no-data-message">No suppliers found matching your criteria.</p>';
        return;
    }

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
                <span class="rating-number">${supplier.rating.toFixed(1)}</span>
            </div>
        </div>
        <div class="supplier-details">
            <p class="distance"><i class="fas fa-map-marker-alt"></i> ${supplier.distance} km away</p>
            <p class="delivery-time"><i class="fas fa-clock"></i> ${supplier.deliveryTime} min delivery</p>
        </div>
        <div class="supplier-items">
            ${supplier.items && supplier.items.length > 0 ? supplier.items.map(item => `
                <div class="item-row">
                    <span class="item-name">${item.name}</span>
                    <span class="item-price">₹${item.price}/${item.unit}</span>
                    <span class="item-stock">${item.stock}${item.unit} available</span>
                </div>
            `).join('') : '<p class="no-data-message small">No items listed.</p>'}
        </div>
        <div class="supplier-actions">
            <button class="btn secondary view-supplier-btn" data-supplier-id="${supplier.id}">
                <i class="fas fa-eye"></i>
                View Details
            </button>
            <button class="btn primary order-now-btn" data-supplier-id="${supplier.id}">
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

// Fetches current orders for the vendor from the backend API
async function loadOrders() {
    const ordersSection = document.getElementById('ordersSection');
    if (!ordersSection || !currentUser || !currentUser.id) {
        document.querySelector('#ordersSection .orders-container').innerHTML = '<p class="no-data-message">Please log in as a vendor to view orders.</p>';
        return;
    }

    try {
        const response = await fetch(`/api/orders/vendor/${currentUser.id}`);
        const data = await response.json();

        if (response.ok) {
            orders = data; // Update global orders array
            renderOrders(orders);
            // Update orders badge
            const ordersBadge = document.getElementById('ordersBadge');
            if (ordersBadge) {
                ordersBadge.textContent = orders.length;
                ordersBadge.style.display = orders.length > 0 ? 'flex' : 'none';
            }
        } else {
            showToast(data.message || 'Failed to load current orders.', 'error');
        }
    } catch (error) {
        console.error('Error loading orders:', error);
        showToast('Network error. Could not load current orders.', 'error');
    }
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
    card.setAttribute('data-order-id', order.id);
    
    const statusClass = order.status === 'pending' ? 'pending' : 'confirmed';
    const statusIcon = order.status === 'pending' ? 'fas fa-clock' : 'fas fa-check-circle';
    const statusText = order.status === 'pending' ? 'Pending Confirmation' : 'Confirmed - Out for Delivery';
    
    card.innerHTML = `
        <div class="order-header">
            <div class="order-info">
                <h4>Order #${order.id}</h4>
                <p class="supplier-name">${order.supplierName || 'Unknown Supplier'}</p>
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
                        <span>${item.name} - ${item.quantity}${item.unit || ''}</span>
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
                <button class="btn secondary call-supplier-btn" data-supplier-phone="${order.supplierPhone || ''}">
                    <i class="fas fa-phone"></i>
                    Call Supplier
                </button>
                <button class="btn danger cancel-order-btn" data-order-id="${order.id}">
                    <i class="fas fa-times"></i>
                    Cancel Order
                </button>
            ` : `
                <button class="btn primary track-live-btn" data-order-id="${order.id}">
                    <i class="fas fa-map"></i>
                    Track Live
                </button>
            `}
        </div>
    `;
    
    return card;
}

// Fetches order history for the vendor from the backend API
async function loadOrderHistory() {
    const historySection = document.getElementById('historySection');
    if (!historySection || !currentUser || !currentUser.id) {
        document.querySelector('#historySection .history-container').innerHTML = '<p class="no-data-message">Please log in as a vendor to view order history.</p>';
        return;
    }

    const historyFilter = document.getElementById('historyFilter') ? document.getElementById('historyFilter').value : 'all';
    const fromDate = document.getElementById('fromDate') ? document.getElementById('fromDate').value : '';
    const toDate = document.getElementById('toDate') ? document.getElementById('toDate').value : '';

    try {
        let url = `/api/orders/history/vendor/${currentUser.id}`;
        const params = new URLSearchParams();
        if (historyFilter !== 'all') params.append('status', historyFilter);
        if (fromDate) params.append('fromDate', fromDate);
        if (toDate) params.append('toDate', toDate);
        if (params.toString()) url += `?${params.toString()}`;

        const response = await fetch(url);
        const data = await response.json();

        if (response.ok) {
            orderHistory = data; // Update global order history array
            renderOrderHistory(orderHistory);
            showToast('Order history loaded.', 'info');
        } else {
            showToast(data.message || 'Failed to load order history.', 'error');
        }
    } catch (error) {
        console.error('Error loading order history:', error);
        showToast('Network error. Could not load order history.', 'error');
    }
}

function renderOrderHistory(historyData) {
    const historyContainer = document.querySelector('#historySection .history-container');
    if (!historyContainer) return;

    historyContainer.innerHTML = '';

    if (historyData.length === 0) {
        historyContainer.innerHTML = '<p class="no-data-message">No order history found for the selected filters.</p>';
        return;
    }

    historyData.forEach(order => {
        const orderCard = document.createElement('div');
        orderCard.className = `order-card ${order.status}`;
        orderCard.innerHTML = `
            <div class="order-header">
                <div class="order-info">
                    <h4>Order #${order.id}</h4>
                    <p class="supplier-name">${order.supplierName || 'Unknown Supplier'}</p>
                    <p class="order-date">${order.createdAt ? new Date(order.createdAt._seconds * 1000).toLocaleString() : 'N/A'}</p>
                </div>
                <div class="order-status ${order.status}">
                    <i class="fas fa-check-circle"></i>
                    ${order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                </div>
            </div>
            <div class="order-details">
                <div class="order-summary">
                    <span>${order.items.length} items • ₹${order.total} • ${order.paymentMethod}</span>
                </div>
            </div>
            <div class="order-actions">
                <button class="btn secondary view-receipt-btn" data-order-id="${order.id}">
                    <i class="fas fa-receipt"></i>
                    View Receipt
                </button>
                ${order.status === 'completed' ? `
                <button class="btn primary rate-supplier-btn" data-order-id="${order.id}" data-supplier-id="${order.supplierId}" data-supplier-name="${order.supplierName || 'Unknown Supplier'}" data-order-date="${order.createdAt ? new Date(order.createdAt._seconds * 1000).toLocaleDateString() : 'N/A'}">
                    <i class="fas fa-star"></i>
                    Rate Supplier
                </button>` : ''}
                <button class="btn secondary reorder-btn" data-order-id="${order.id}">
                    <i class="fas fa-redo"></i>
                    Reorder
                </button>
            </div>
        `;
        historyContainer.appendChild(orderCard);
    });
}

// Fetches credit tracker data for the vendor from the backend API
async function loadCreditTracker() {
    const creditSection = document.getElementById('creditSection');
    if (!creditSection || !currentUser || !currentUser.id) {
        document.querySelector('#creditSection .credit-transactions .transaction-list').innerHTML = '<p class="no-data-message">Please log in as a vendor to view credit tracker.</p>';
        // Reset summary cards if not logged in
        document.querySelector('.credit-card.total .credit-amount').textContent = `₹0`;
        document.querySelector('.credit-card.total small').textContent = `Across 0 suppliers`;
        document.querySelector('.credit-card.monthly .credit-amount').textContent = `₹0`;
        document.querySelector('.credit-card.monthly small').textContent = `0 credit purchases`;
        document.querySelector('.credit-card.due .credit-amount').textContent = `₹0`;
        document.querySelector('.credit-card.due small').textContent = `No payments due`;
        return;
    }

    try {
        const response = await fetch(`/api/credit/vendor/${currentUser.id}`);
        const data = await response.json();

        if (response.ok) {
            // Update summary cards
            document.querySelector('.credit-card.total .credit-amount').textContent = `₹${data.summary.totalOutstanding}`;
            document.querySelector('.credit-card.total small').textContent = `Across ${data.transactions.length} suppliers`; // More accurate count
            document.querySelector('.credit-card.monthly .credit-amount').textContent = `₹${data.summary.thisMonth}`;
            document.querySelector('.credit-card.monthly small').textContent = `${data.transactions.filter(t => t.createdAt && new Date(t.createdAt._seconds * 1000).getMonth() === new Date().getMonth()).length} credit purchases`;
            document.querySelector('.credit-card.due .credit-amount').textContent = `₹${data.summary.dueThisWeek}`;
            document.querySelector('.credit-card.due small').textContent = data.summary.dueThisWeek > 0 ? 'Payment overdue' : 'No payments due';
            
            // Render transactions
            const transactionList = document.querySelector('.credit-transactions .transaction-list');
            if (transactionList) {
                transactionList.innerHTML = '';
                if (data.transactions.length === 0) {
                    transactionList.innerHTML = '<p class="no-data-message">No credit transactions found.</p>';
                } else {
                    data.transactions.forEach(t => {
                        const transactionItem = document.createElement('div');
                        transactionItem.className = `transaction-item ${t.status}`;
                        transactionItem.innerHTML = `
                            <div class="transaction-info">
                                <h4>${t.supplierName || 'Unknown Supplier'}</h4>
                                <p>Order #${t.orderId} • ${t.createdAt ? new Date(t.createdAt._seconds * 1000).toLocaleDateString() : 'N/A'}</p>
                            </div>
                            <div class="transaction-amount">
                                <span class="amount">₹${t.amount}</span>
                                <span class="status">${t.status.charAt(0).toUpperCase() + t.status.slice(1)}</span>
                            </div>
                            ${t.status === 'pending' ? `<button class="btn primary small pay-now-btn" data-transaction-id="${t.id}">Pay Now</button>` : `<i class="fas fa-check-circle paid-icon"></i>`}
                        `;
                        transactionList.appendChild(transactionItem);
                    });
                }
            }
            showToast('Credit tracker loaded.', 'info');
        } else {
            showToast(data.message || 'Failed to load credit tracker.', 'error');
        }
    } catch (error) {
        console.error('Error loading credit tracker:', error);
        showToast('Network error. Could not load credit tracker.', 'error');
    }
}


// Supplier Dashboard Functions

// Fetches inventory for the supplier from the backend API
async function loadInventory() {
    const inventorySection = document.getElementById('inventorySection');
    if (!inventorySection || !currentUser || !currentUser.id) {
        document.getElementById('inventoryGrid').innerHTML = '<p class="no-data-message">Please log in as a supplier to manage inventory.</p>';
        // Reset stats if not logged in
        document.querySelector('.inventory-stats .stat-card:nth-child(1) h3').textContent = '0';
        document.querySelector('.inventory-stats .stat-card:nth-child(2) h3').textContent = '0';
        document.querySelector('.inventory-stats .stat-card:nth-child(3) h3').textContent = '0';
        return;
    }

    try {
        const response = await fetch(`/api/inventory/supplier/${currentUser.id}`);
        const data = await response.json();

        if (response.ok) {
            inventory = data; // Update global inventory array
            renderInventory(inventory);
            // Update inventory stats
            document.querySelector('.inventory-stats .stat-card:nth-child(1) h3').textContent = inventory.length;
            document.querySelector('.inventory-stats .stat-card:nth-child(2) h3').textContent = inventory.filter(item => item.quantity > 0 && item.quantity <= 10).length; // Assuming low stock is <=10
            document.querySelector('.inventory-stats .stat-card:nth-child(3) h3').textContent = inventory.filter(item => item.quantity === 0).length;
            showToast('Inventory loaded.', 'info');
        } else {
            showToast(data.message || 'Failed to load inventory.', 'error');
        }
    } catch (error) {
        console.error('Error loading inventory:', error);
        showToast('Network error. Could not load inventory.', 'error');
    }
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
    // Determine status based on quantity for display
    let displayStatus = 'in-stock';
    if (item.quantity === 0) {
        displayStatus = 'out-of-stock';
    } else if (item.quantity <= 10) { // Assuming <=10 is low stock
        displayStatus = 'low-stock';
    }

    itemDiv.className = `inventory-item ${displayStatus}`;
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
                <span class="status-indicator ${statusIndicatorClass[displayStatus]}"></span>
                <span>${statusText[displayStatus]}</span>
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
            ${displayStatus === 'out-of-stock' ? `
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

// Fetches incoming orders for the supplier from the backend API
async function loadIncomingOrders() {
    const incomingSection = document.getElementById('incomingSection');
    if (!incomingSection || !currentUser || !currentUser.id) {
        document.getElementById('incomingOrdersContainer').innerHTML = '<p class="no-data-message">Please log in as a supplier to view incoming orders.</p>';
        // Reset counts if not logged in
        document.getElementById('incomingBadge').textContent = '0';
        document.getElementById('incomingBadge').style.display = 'none';
        document.getElementById('pendingOrdersCount').textContent = '0';
        document.getElementById('confirmedOrdersCount').textContent = '0';
        document.getElementById('deliveredOrdersCount').textContent = '0';
        return;
    }

    const filterStatus = document.querySelector('#incomingSection .filter-btn.active')?.getAttribute('data-status') || 'all';

    try {
        const response = await fetch(`/api/orders/supplier/${currentUser.id}/incoming?status=${filterStatus}`);
        const data = await response.json();

        if (response.ok) {
            incomingOrders = data; // Update global array
            renderIncomingOrders(incomingOrders);
            // Update notification badge and filter counts
            const pendingCount = incomingOrders.filter(order => order.status === 'pending').length;
            const confirmedCount = incomingOrders.filter(order => order.status === 'confirmed').length;
            const deliveredCount = incomingOrders.filter(order => order.status === 'delivered').length;

            document.getElementById('incomingBadge').textContent = pendingCount;
            document.getElementById('incomingBadge').style.display = pendingCount > 0 ? 'flex' : 'none';

            document.getElementById('pendingOrdersCount').textContent = pendingCount;
            document.getElementById('confirmedOrdersCount').textContent = confirmedCount;
            document.getElementById('deliveredOrdersCount').textContent = deliveredCount;

            showToast('Incoming orders loaded.', 'info');
        } else {
            showToast(data.message || 'Failed to load incoming orders.', 'error');
        }
    } catch (error) {
        console.error('Error loading incoming orders:', error);
        showToast('Network error. Could not load incoming orders.', 'error');
    }
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

    // Format createdAt timestamp for timeAgo
    let timeAgoText = 'N/A';
    if (order.createdAt && order.createdAt._seconds) {
        const orderDate = new Date(order.createdAt._seconds * 1000);
        const now = new Date();
        const diffMinutes = Math.floor((now - orderDate) / (1000 * 60));
        const diffHours = Math.floor(diffMinutes / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMinutes < 60) {
            timeAgoText = `${diffMinutes} minutes ago`;
        } else if (diffHours < 24) {
            timeAgoText = `${diffHours} hours ago`;
        } else {
            timeAgoText = `${diffDays} days ago`;
        }
    }

    // Adjust timeAgoText for confirmed/delivered states
    if (order.status === 'confirmed') {
        timeAgoText = 'Confirmed - Ready for delivery';
    } else if (order.status === 'delivered') {
        timeAgoText = 'Delivered';
    } else if (order.status === 'rejected') {
        timeAgoText = 'Rejected by supplier';
    }


    card.innerHTML = `
        <div class="order-header">
            <div class="vendor-info">
                <h4>${order.vendorName || 'Unknown Vendor'}</h4>
                <p><i class="fas fa-map-marker-alt"></i> ${order.distance || 'N/A'} km away</p>
                <p><i class="fas fa-clock"></i> ${timeAgoText}</p>
            </div>
            <div class="order-amount">
                <span class="amount">₹${order.total}</span>
            </div>
        </div>
        <div class="order-items">
            ${order.items.map(item => `
                <div class="item">
                    <span>${item.name} - ${item.quantity}${item.unit || ''}</span>
                    <span>₹${item.price}</span>
                </div>
            `).join('')}
        </div>
        <div class="order-details">
            <p><strong>Payment:</strong> ${order.paymentMethod}</p>
            ${order.specialNotes ? `<p><strong>Special Notes:</strong> ${order.specialNotes}</p>` : ''}
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
            ` : order.status === 'confirmed' ? `
                <button class="btn secondary call-vendor-btn" data-vendor-phone="${order.vendorPhone || ''}">
                    <i class="fas fa-phone"></i>
                    Call Vendor
                </button>
                <button class="btn primary mark-delivered-btn" data-order-id="${order.id}">
                    <i class="fas fa-check-circle"></i>
                    Mark as Delivered
                </button>
            ` : `
                <button class="btn secondary view-details-btn" data-order-id="${order.id}">
                    <i class="fas fa-info-circle"></i>
                    View Details
                </button>
            `}
        </div>
    `;
    return card;
}

function filterIncomingOrders(status) {
    // This function now just triggers a reload with the new filter status
    loadIncomingOrders();
}

// Fetches sales data for the supplier from the backend API
async function loadSales() {
    const salesSection = document.getElementById('salesSection');
    if (!salesSection || !currentUser || !currentUser.id) {
        document.querySelector('#salesSection .sales-summary').innerHTML = `
            <p class="no-data-message" style="grid-column: 1 / -1;">Please log in as a supplier to view sales analytics.</p>
        `;
        document.querySelector('#salesSection .sales-details').innerHTML = ''; // Clear details
        return;
    }

    try {
        const response = await fetch(`/api/sales/supplier/${currentUser.id}`);
        const data = await response.json();

        if (response.ok) {
            // Update sales summary cards
            document.querySelector('.sales-card.today .sales-amount').textContent = `₹${data.today.amount.toLocaleString()}`;
            document.querySelector('.sales-card.today .growth').textContent = data.today.growth;
            document.querySelector('.sales-card.week .sales-amount').textContent = `₹${data.week.amount.toLocaleString()}`;
            document.querySelector('.sales-card.week .growth').textContent = data.week.growth;
            document.querySelector('.sales-card.month .sales-amount').textContent = `₹${data.month.amount.toLocaleString()}`;
            document.querySelector('.sales-card.month .growth').textContent = data.month.growth;

            // Render sales trend chart (placeholder bars)
            const chartBarsContainer = document.querySelector('.chart-bars');
            if (chartBarsContainer) {
                chartBarsContainer.innerHTML = data.trend.map((height, index) => {
                    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
                    return `<div class="bar" style="height: ${height}%"><span>${days[index]}</span></div>`;
                }).join('');
            }

            // Render top selling items
            const topItemsList = document.querySelector('.top-items .item-list');
            if (topItemsList) {
                topItemsList.innerHTML = '';
                if (data.topItems.length === 0) {
                    topItemsList.innerHTML = '<p class="no-data-message">No top selling items found.</p>';
                } else {
                    data.topItems.forEach(item => {
                        const topItemDiv = document.createElement('div');
                        topItemDiv.className = 'top-item';
                        topItemDiv.innerHTML = `
                            <div class="item-info">
                                <h4>${item.name}</h4>
                                <p>${item.sold} sold this week</p>
                            </div>
                            <div class="item-revenue">₹${item.revenue.toLocaleString()}</div>
                        `;
                        topItemsList.appendChild(topItemDiv);
                    });
                }
            }
            showToast('Sales analytics loaded.', 'info');
        } else {
            showToast(data.message || 'Failed to load sales data.', 'error');
        }
    } catch (error) {
        console.error('Error loading sales data:', error);
        showToast('Network error. Could not load sales data.', 'error');
    }
}

// Fetches ratings for the supplier from the backend API
async function loadRatings() {
    const ratingsSection = document.getElementById('ratingsSection');
    if (!ratingsSection || !currentUser || !currentUser.id) {
        document.querySelector('#ratingsSection .rating-overview').innerHTML = `<p class="no-data-message" style="grid-column: 1 / -1;">Please log in as a supplier to view ratings.</p>`;
        document.querySelector('#ratingsSection .recent-reviews').innerHTML = ''; // Clear details
        return;
    }

    try {
        const response = await fetch(`/api/ratings/supplier/${currentUser.id}`);
        const data = await response.json();

        if (response.ok) {
            // Update overall rating
            document.querySelector('.overall-rating .rating-number').textContent = data.overallRating;
            document.querySelector('.overall-rating p').textContent = `Based on ${data.totalReviews} reviews`;
            document.querySelector('.overall-rating .rating-stars').innerHTML = generateStars(data.overallRating);

            // Update rating breakdown
            const ratingBreakdownContainer = document.querySelector('.rating-breakdown');
            if (ratingBreakdownContainer) {
                const totalReviews = data.totalReviews;
                const starCounts = data.ratingBreakdown;
                const starRows = [5, 4, 3, 2, 1].map(star => {
                    const count = starCounts[String(star)] || 0; // Ensure key is string
                    const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
                    return `
                        <div class="rating-row">
                            <span>${star} stars</span>
                            <div class="rating-bar">
                                <div class="bar-fill" style="width: ${percentage}%"></div>
                            </div>
                            <span>${count}</span>
                        </div>
                    `;
                }).join('');
                ratingBreakdownContainer.innerHTML = starRows;
            }

            // Render recent reviews
            const reviewList = document.querySelector('.recent-reviews .review-list');
            if (reviewList) {
                reviewList.innerHTML = '';
                if (data.recentReviews.length === 0) {
                    reviewList.innerHTML = '<p class="no-data-message">No recent reviews found.</p>';
                } else {
                    data.recentReviews.forEach(review => {
                        const reviewItem = document.createElement('div');
                        reviewItem.className = 'review-item';
                        reviewItem.innerHTML = `
                            <div class="review-header">
                                <div class="reviewer-info">
                                    <h4>${review.vendorName || 'Anonymous Vendor'}</h4>
                                    <div class="review-rating">
                                        ${generateStars(review.overallRating)}
                                        <span>${review.overallRating.toFixed(1)}</span>
                                    </div>
                                </div>
                                <span class="review-date">${review.createdAt ? new Date(review.createdAt._seconds * 1000).toLocaleDateString() : 'N/A'}</span>
                            </div>
                            <p class="review-text">"${review.reviewText || 'No specific review text provided.'}"</p>
                        `;
                        reviewList.appendChild(reviewItem);
                    });
                }
            }
            showToast('Customer ratings loaded.', 'info');
        } else {
            showToast(data.message || 'Failed to load ratings.', 'error');
        }
    } catch (error) {
        console.error('Error loading ratings:', error);
        showToast('Network error. Could not load ratings.', 'error');
    }
}

// Modal Functions
function initializeModals() {
    const modals = document.querySelectorAll('.modal');
    // Select all close buttons: those with class 'close-btn' AND those with class 'btn secondary'
    // that are direct children of .modal-actions (like 'Cancel' or 'Skip')
    const closeBtns = document.querySelectorAll('.modal .close-btn, .modal .modal-actions > .btn.secondary'); 

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
    
    // Add Inventory Button (Supplier)
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
    
    // Inventory Form Submission (Supplier)
    const inventoryForm = document.getElementById('inventoryForm');
    if (inventoryForm) {
        inventoryForm.addEventListener('submit', handleInventorySubmit);
    }

    // Order from Details button (inside supplierDetailsModal - Vendor)
    const orderFromDetailsBtn = document.getElementById('orderFromDetailsBtn');
    if (orderFromDetailsBtn) {
        orderFromDetailsBtn.addEventListener('click', function() {
            const supplierId = this.getAttribute('data-supplier-id');
            hideModal('supplierDetailsModal'); // Close supplier details modal
            showOrderPlacementModal(supplierId); // Open order placement modal
        });
    }

    // Submit Order Button (inside orderPlacementModal - Vendor)
    const submitOrderBtn = document.getElementById('submitOrderBtn');
    if (submitOrderBtn) {
        submitOrderBtn.addEventListener('click', handlePlaceOrder);
    }
    // Handle quantity changes in order placement modal
    document.getElementById('orderItemsSelection').addEventListener('input', function(e) {
        if (e.target.classList.contains('item-quantity-input')) {
            updateOrderSummary();
        }
    });

    // Edit Profile buttons (Vendor & Supplier) - currently just open modals
    const editVendorProfileBtn = document.getElementById('editVendorProfileBtn');
    if (editVendorProfileBtn) {
        editVendorProfileBtn.addEventListener('click', () => showToast('Edit Vendor Profile functionality to be implemented!', 'info'));
    }
    const editSupplierProfileBtn = document.getElementById('editSupplierProfileBtn');
    if (editSupplierProfileBtn) {
        editSupplierProfileBtn.addEventListener('click', () => showToast('Edit Supplier Profile functionality to be implemented!', 'info'));
    }

    // Close buttons for new modals (explicitly added for clarity, though covered by general closeBtns)
    // const closeVendorProfileModal = document.getElementById('closeVendorProfileModal');
    // if (closeVendorProfileModal) closeVendorProfileModal.addEventListener('click', () => hideModal('vendorProfileModal'));
    // const closeSupplierProfileModal = document.getElementById('closeSupplierProfileModal');
    // if (closeSupplierProfileModal) closeSupplierProfileModal.addEventListener('click', () => hideModal('supplierProfileModal'));
    // const closeOrderPlacementModal = document.getElementById('closeOrderPlacementModal');
    // if (closeOrderPlacementModal) closeOrderPlacementModal.addEventListener('click', () => hideModal('orderPlacementModal'));
    // const closeNotificationsModal = document.getElementById('closeNotificationsModal');
    // if (closeNotificationsModal) closeNotificationsModal.addEventListener('click', () => hideModal('notificationsModal'));
}

// Handler functions moved to global scope
async function handleInventorySubmit(e) {
    e.preventDefault();
    
    const name = document.getElementById('itemName').value;
    const unit = document.getElementById('itemUnit').value;
    const price = parseFloat(document.getElementById('itemPrice').value);
    const quantity = parseInt(document.getElementById('itemQuantity').value);
    const description = document.getElementById('itemDescription').value;
    const editingItemId = e.target.getAttribute('data-editing-item-id');

    if (!name || !unit || isNaN(price) || isNaN(quantity)) {
        showToast('Please fill in all required fields and ensure valid numbers for price/quantity.', 'error');
        return;
    }
    if (!currentUser || !currentUser.id) {
        showToast('User not logged in.', 'error');
        return;
    }

    const submitBtn = e.submitter;
    submitBtn.classList.add('loading');
    submitBtn.disabled = true;

    try {
        let response;
        if (editingItemId) {
            // Update existing item
            response = await fetch(`/api/inventory/supplier/${currentUser.id}/update/${editingItemId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, unit, price, quantity, description })
            });
        } else {
            // Add new item
            response = await fetch(`/api/inventory/supplier/${currentUser.id}/add`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, unit, price, quantity, description })
            });
        }

        const data = await response.json();

        if (response.ok) {
            showToast(data.message, 'success');
            loadInventory(); // Reload inventory to reflect changes
            hideModal('inventoryModal');
            e.target.reset();
            e.target.removeAttribute('data-editing-item-id');
        } else {
            showToast(data.message || 'Operation failed.', 'error');
        }
    } catch (error) {
        console.error('Inventory submission error:', error);
        showToast('Network error. Could not save item.', 'error');
    } finally {
        submitBtn.classList.remove('loading');
        submitBtn.disabled = false;
    }
}

// NEW FUNCTION: Show Order Placement Modal
async function showOrderPlacementModal(supplierId) {
    if (!currentUser || currentUser.role !== 'vendor') {
        showToast('Please log in as a vendor to place orders.', 'error');
        return;
    }
    if (!supplierId) {
        showToast('Cannot place order: No supplier selected.', 'error');
        return;
    }

    const orderPlacementModal = document.getElementById('orderPlacementModal');
    const orderModalSupplierName = document.getElementById('orderModalSupplierName');
    const orderModalSupplierAddress = document.getElementById('orderModalSupplierAddress');
    const orderModalDeliveryTime = document.getElementById('orderModalDeliveryTime');
    const orderItemsSelection = document.getElementById('orderItemsSelection');

    // Clear previous items and show loading
    orderItemsSelection.innerHTML = '<p class="no-data-message">Loading items...</p>';
    updateOrderSummary(true); // Reset totals to 0

    showModal('orderPlacementModal');

    try {
        // Fetch full supplier details to get their inventory
        const response = await fetch(`/api/suppliers/${supplierId}`);
        const supplierData = await response.json();

        if (response.ok) {
            orderModalSupplierName.textContent = supplierData.name;
            orderModalSupplierAddress.textContent = supplierData.address;
            orderModalDeliveryTime.textContent = supplierData.deliveryTime || '--';

            if (supplierData.inventory && supplierData.inventory.length > 0) {
                orderItemsSelection.innerHTML = supplierData.inventory.map(item => `
                    <div class="order-item-selectable" data-item-id="${item.id}" data-item-price="${item.price}" data-item-unit="${item.unit}" data-item-name="${item.name}" data-item-stock="${item.quantity}">
                        <div class="order-item-info">
                            <span>${item.name}</span>
                            <span>₹${item.price}/${item.unit} (${item.quantity}${item.unit} in stock)</span>
                        </div>
                        <div class="order-item-controls">
                            <button type="button" class="decrease-quantity-btn" data-item-id="${item.id}"><i class="fas fa-minus"></i></button>
                            <input type="number" class="item-quantity-input" data-item-id="${item.id}" value="0" min="0" max="${item.quantity}" readonly>
                            <button type="button" class="increase-quantity-btn" data-item-id="${item.id}"><i class="fas fa-plus"></i></button>
                        </div>
                    </div>
                `).join('');

                // Add event listeners for quantity buttons
                orderItemsSelection.querySelectorAll('.increase-quantity-btn').forEach(btn => {
                    btn.addEventListener('click', function() {
                        const itemId = this.getAttribute('data-item-id');
                        const input = orderItemsSelection.querySelector(`.item-quantity-input[data-item-id="${itemId}"]`);
                        if (input) {
                            const currentVal = parseInt(input.value);
                            const maxVal = parseInt(input.max);
                            if (currentVal < maxVal) {
                                input.value = currentVal + 1;
                                updateOrderSummary();
                            }
                        }
                    });
                });
                orderItemsSelection.querySelectorAll('.decrease-quantity-btn').forEach(btn => {
                    btn.addEventListener('click', function() {
                        const itemId = this.getAttribute('data-item-id');
                        const input = orderItemsSelection.querySelector(`.item-quantity-input[data-item-id="${itemId}"]`);
                        if (input) {
                            const currentVal = parseInt(input.value);
                            if (currentVal > 0) {
                                input.value = currentVal - 1;
                                updateOrderSummary();
                            }
                        }
                    });
                });
                updateOrderSummary(); // Initial calculation
            } else {
                orderItemsSelection.innerHTML = '<p class="no-data-message">This supplier currently has no items available.</p>';
            }
            document.getElementById('submitOrderBtn').setAttribute('data-supplier-id', supplierId); // Pass supplierId to submit button
        } else {
            showToast(supplierData.message || 'Failed to load supplier items for order.', 'error');
            hideModal('orderPlacementModal');
        }
    } catch (error) {
        console.error('Error loading supplier items for order:', error);
        showToast('Network error. Could not load supplier items for order.', 'error');
        hideModal('orderPlacementModal');
    }
}

// NEW FUNCTION: Update Order Summary in Modal
function updateOrderSummary(reset = false) {
    const orderSubtotalSpan = document.getElementById('orderSubtotal');
    const orderDeliveryFeeSpan = document.getElementById('orderDeliveryFee');
    const orderTotalSpan = document.getElementById('orderTotal');
    const orderItemsSelection = document.getElementById('orderItemsSelection');

    if (reset) {
        orderSubtotalSpan.textContent = '0.00';
        orderDeliveryFeeSpan.textContent = '20.00'; // Assuming fixed delivery fee
        orderTotalSpan.textContent = '20.00';
        return;
    }

    let subtotal = 0;
    orderItemsSelection.querySelectorAll('.order-item-selectable').forEach(itemDiv => {
        const quantityInput = itemDiv.querySelector('.item-quantity-input');
        const price = parseFloat(itemDiv.getAttribute('data-item-price'));
        const quantity = parseInt(quantityInput.value);
        if (!isNaN(price) && !isNaN(quantity)) {
            subtotal += price * quantity;
        }
    });

    const deliveryFee = parseFloat(orderDeliveryFeeSpan.textContent); // Get current delivery fee
    const total = subtotal + deliveryFee;

    orderSubtotalSpan.textContent = subtotal.toFixed(2);
    orderTotalSpan.textContent = total.toFixed(2);
}

// NEW FUNCTION: Handle Place Order Submission
async function handlePlaceOrder(e) {
    e.preventDefault();

    if (!currentUser || currentUser.role !== 'vendor') {
        showToast('You must be logged in as a vendor to place an order.', 'error');
        return;
    }

    const supplierId = e.target.getAttribute('data-supplier-id');
    const paymentMethod = document.getElementById('paymentMethod').value;
    const specialNotes = document.getElementById('specialNotes').value;

    const selectedItems = [];
    let totalOrderAmount = 0;
    const orderItemsSelection = document.getElementById('orderItemsSelection');

    orderItemsSelection.querySelectorAll('.order-item-selectable').forEach(itemDiv => {
        const quantityInput = itemDiv.querySelector('.item-quantity-input');
        const quantity = parseInt(quantityInput.value);
        if (quantity > 0) {
            const itemId = itemDiv.getAttribute('data-item-id');
            const itemName = itemDiv.getAttribute('data-item-name');
            const itemPrice = parseFloat(itemDiv.getAttribute('data-item-price'));
            const itemUnit = itemDiv.getAttribute('data-item-unit');
            selectedItems.push({
                id: itemId,
                name: itemName,
                quantity: quantity,
                price: itemPrice * quantity, // Store total price for this item
                unit: itemUnit
            });
            totalOrderAmount += itemPrice * quantity;
        }
    });

    if (selectedItems.length === 0) {
        showToast('Please select at least one item to order.', 'error');
        return;
    }

    const deliveryFee = parseFloat(document.getElementById('orderDeliveryFee').textContent);
    totalOrderAmount += deliveryFee;

    const submitBtn = e.target;
    submitBtn.classList.add('loading');
    submitBtn.disabled = true;

    try {
        const response = await fetch('/api/orders/place', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                vendorId: currentUser.id,
                supplierId: supplierId,
                items: selectedItems,
                total: totalOrderAmount,
                deliveryFee: deliveryFee,
                paymentMethod: paymentMethod,
                specialNotes: specialNotes
            })
        });
        const data = await response.json();

        if (response.ok) {
            showToast(data.message, 'success');
            hideModal('orderPlacementModal');
            loadOrders(); // Refresh vendor's current orders
        } else {
            showToast(data.message || 'Failed to place order.', 'error');
        }
    } catch (error) {
        console.error('Error placing order:', error);
        showToast('Network error. Could not place order.', 'error');
    } finally {
        submitBtn.classList.remove('loading');
        submitBtn.disabled = false;
    }
}


function initializeOrderActions() {
    document.addEventListener('click', async function(e) {
        // Accept Order (Supplier)
        if (e.target.classList.contains('accept-order-btn') || e.target.closest('.accept-order-btn')) {
            if (!currentUser || currentUser.role !== 'supplier') {
                showToast('Only suppliers can accept orders.', 'error');
                return;
            }
            const orderId = e.target.getAttribute('data-order-id') || e.target.closest('.accept-order-btn').getAttribute('data-order-id');
            try {
                const response = await fetch(`/api/orders/supplier/${currentUser.id}/accept/${orderId}`, {
                    method: 'PUT'
                });
                const data = await response.json();
                if (response.ok) {
                    showToast(data.message, 'success');
                    loadIncomingOrders(); // Reload incoming orders
                } else {
                    showToast(data.message || 'Failed to accept order.', 'error');
                }
            } catch (error) {
                console.error('Error accepting order:', error);
                showToast('Network error. Could not accept order.', 'error');
            }
        }
        
        // Mark as Delivered (Supplier)
        if (e.target.classList.contains('mark-delivered-btn') || e.target.closest('.mark-delivered-btn')) {
            if (!currentUser || currentUser.role !== 'supplier') {
                showToast('Only suppliers can mark orders as delivered.', 'error');
                return;
            }
            const orderId = e.target.getAttribute('data-order-id') || e.target.closest('.mark-delivered-btn').getAttribute('data-order-id');
            try {
                const response = await fetch(`/api/orders/supplier/${currentUser.id}/deliver/${orderId}`, {
                    method: 'PUT'
                });
                const data = await response.json();
                if (response.ok) {
                    showToast(data.message, 'success');
                    loadIncomingOrders(); // Reload incoming orders
                } else {
                    showToast(data.message || 'Failed to mark order as delivered.', 'error');
                }
            } catch (error) {
                console.error('Error marking order delivered:', error);
                showToast('Network error. Could not mark order as delivered.', 'error');
            }
        }
        
        // Cancel Order (Vendor)
        if (e.target.classList.contains('cancel-order-btn') || e.target.closest('.cancel-order-btn')) {
            if (!currentUser || currentUser.role !== 'vendor') {
                showToast('Only vendors can cancel orders.', 'error');
                return;
            }
            const orderId = e.target.getAttribute('data-order-id') || e.target.closest('.cancel-order-btn').getAttribute('data-order-id');
            // For a real app, you'd show a custom confirmation modal here.
            try {
                const response = await fetch(`/api/orders/vendor/${currentUser.id}/cancel/${orderId}`, {
                    method: 'PUT' // Or DELETE, depending on API design
                });
                const data = await response.json();
                if (response.ok) {
                    showToast(data.message, 'success');
                    loadOrders(); // Refresh current orders
                    loadOrderHistory(); // Refresh history
                } else {
                    showToast(data.message || 'Failed to cancel order.', 'error');
                }
            } catch (error) {
                console.error('Error cancelling order:', error);
                showToast('Network error. Could not cancel order.', 'error');
            }
        }

        // Reject Order (Supplier)
        if (e.target.classList.contains('reject-order-btn') || e.target.closest('.reject-order-btn')) {
            if (!currentUser || currentUser.role !== 'supplier') {
                showToast('Only suppliers can reject orders.', 'error');
                return;
            }
            const orderId = e.target.getAttribute('data-order-id') || e.target.closest('.reject-order-btn').getAttribute('data-order-id');
            // For a real app, you'd show a custom confirmation modal here.
            try {
                const response = await fetch(`/api/orders/supplier/${currentUser.id}/reject/${orderId}`, {
                    method: 'PUT'
                });
                const data = await response.json();
                if (response.ok) {
                    showToast(data.message, 'success');
                    loadIncomingOrders(); // Refresh incoming orders
                } else {
                    showToast(data.message || 'Failed to reject order.', 'error');
                }
            } catch (error) {
                console.error('Error rejecting order:', error);
                showToast('Network error. Could not reject order.', 'error');
            }
        }
        
        // Rate Supplier (Vendor) - Opens modal
        if (e.target.classList.contains('rate-supplier-btn') || e.target.closest('.rate-supplier-btn')) {
            if (!currentUser || currentUser.role !== 'vendor') {
                showToast('Please log in as a vendor to rate suppliers.', 'error');
                return;
            }
            const btn = e.target.closest('.rate-supplier-btn');
            const orderId = btn.getAttribute('data-order-id');
            const supplierId = btn.getAttribute('data-supplier-id');
            const supplierName = btn.getAttribute('data-supplier-name');
            const orderDate = btn.getAttribute('data-order-date');

            // Populate rating modal with order info
            document.getElementById('ratingSupplierName').textContent = supplierName;
            document.getElementById('ratingOrderInfo').textContent = `Order #${orderId} • ${orderDate}`;
            document.getElementById('submitRating').setAttribute('data-order-id', orderId); // Store order ID for submission
            document.getElementById('submitRating').setAttribute('data-supplier-id', supplierId); // Store supplier ID

            // Reset stars and text area
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
    document.addEventListener('click', async function(e) {
        // Edit item
        if (e.target.classList.contains('edit-item-btn') || e.target.closest('.edit-item-btn')) {
            if (!currentUser || currentUser.role !== 'supplier') {
                showToast('Only suppliers can edit inventory.', 'error');
                return;
            }
            const itemId = e.target.getAttribute('data-item-id') || e.target.closest('.edit-item-btn').getAttribute('data-item-id');
            const itemToEdit = inventory.find(item => item.id === itemId); // Use itemId directly as string from backend

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
            if (!currentUser || currentUser.role !== 'supplier') {
                showToast('Only suppliers can delete inventory items.', 'error');
                return;
            }
            const itemId = e.target.getAttribute('data-item-id') || e.target.closest('.delete-item-btn').getAttribute('data-item-id');
            
            // In a real app, you'd show a custom confirmation modal here before deleting.
            // For now, we'll proceed with a toast message and direct API call.
            showToast(`Attempting to delete item ${itemId}...`, 'info');

            try {
                const response = await fetch(`/api/inventory/supplier/${currentUser.id}/delete/${itemId}`, {
                    method: 'DELETE'
                });
                const data = await response.json();
                if (response.ok) {
                    showToast(data.message, 'success');
                    loadInventory(); // Reload inventory
                } else {
                    showToast(data.message || 'Failed to delete item.', 'error');
                }
            } catch (error) {
                console.error('Error deleting item:', error);
                showToast('Network error. Could not delete item.', 'error');
            }
        }
        
        if (e.target.classList.contains('restock-btn') || e.target.closest('.restock-btn')) {
            showToast('Restock functionality (to be implemented: opens modal to add quantity)', 'info');
            // You might want to open the inventory modal pre-filled for restock
        }
    });
}

function initializeRatingSystem() {
    const starRating = document.getElementById('starRating');
    const submitRatingBtn = document.getElementById('submitRating');
    
    if (starRating) {
        const stars = starRating.querySelectorAll('i');
        let selectedOverallRating = 0; // Track overall rating

        stars.forEach((star, index) => {
            star.addEventListener('click', function() {
                selectedOverallRating = index + 1;
                stars.forEach((s, i) => {
                    if (i < selectedOverallRating) {
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
        submitRatingBtn.addEventListener('click', async function() {
            if (!currentUser || currentUser.role !== 'vendor') {
                showToast('Please log in as a vendor to submit ratings.', 'error');
                return;
            }

            const orderId = this.getAttribute('data-order-id');
            const supplierId = this.getAttribute('data-supplier-id');
            const overallRating = document.querySelectorAll('#starRating .fas.fa-star').length;
            const reviewText = document.getElementById('reviewText').value;
            
            const qualityRating = document.querySelector('.mini-stars[data-category="quality"] .fas.fa-star').length;
            const deliveryRating = document.querySelector('.mini-stars[data-category="delivery"] .fas.fa-star').length;
            const communicationRating = document.querySelector('.mini-stars[data-category="communication"] .fas.fa-star').length;

            if (overallRating === 0) {
                showToast('Please provide an overall rating.', 'error');
                return;
            }

            try {
                const response = await fetch('/api/ratings/submit', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        vendorId: currentUser.id,
                        supplierId: supplierId,
                        orderId: orderId,
                        overallRating: overallRating,
                        quality: qualityRating,
                        delivery: deliveryRating,
                        communication: communicationRating,
                        reviewText: reviewText
                    })
                });
                const data = await response.json();
                if (response.ok) {
                    showToast(data.message, 'success');
                    hideModal('ratingModal');
                    loadOrderHistory(); // Refresh order history to reflect rating submission
                } else {
                    showToast(data.message || 'Failed to submit rating.', 'error');
                }
            } catch (error) {
                console.error('Error submitting rating:', error);
                showToast('Network error. Could not submit rating.', 'error');
            }
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

// Search and Filter Functions (for Vendor's Discover Suppliers)
// This function now just applies filters/sort to the 'suppliers' array
// which is loaded from the backend.
function filterAndSortSuppliers() {
    let currentSuppliers = [...suppliers]; // Start with all original suppliers

    const searchInput = document.getElementById('searchItems');
    const sortBySelect = document.getElementById('sortBy');
    const radiusFilterSelect = document.getElementById('radiusFilter');

    // Apply search filter
    const query = searchInput ? searchInput.value.toLowerCase() : '';
    if (query) {
        currentSuppliers = currentSuppliers.filter(supplier => 
            supplier.name.toLowerCase().includes(query) ||
            (supplier.items && supplier.items.some(item => item.name.toLowerCase().includes(query)))
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
                // Calculate average price for sorting, handle empty items array
                const avgPriceA = a.items && a.items.length > 0 ? a.items.reduce((sum, item) => sum + item.price, 0) / a.items.length : 0;
                const avgPriceB = b.items && b.items.length > 0 ? b.items.reduce((sum, item) => sum + item.price, 0) / b.items.length : 0;
                return avgPriceA - avgPriceB;
            });
            break;
        case 'rating':
            currentSuppliers.sort((a, b) => b.rating - a.rating);
            break;
    }
    
    renderSuppliers(currentSuppliers);
}

// NEW FUNCTION: Show Notifications Modal
async function showNotifications() {
    if (!currentUser || currentUser.role !== 'supplier') {
        showToast('Please log in as a supplier to view notifications.', 'error');
        return;
    }

    const notificationList = document.getElementById('notificationList');
    if (!notificationList) return;

    notificationList.innerHTML = '<p class="no-data-message">Loading notifications...</p>';
    showModal('notificationsModal');

    try {
        // For a real app, you'd fetch notifications from a backend API
        // For now, let's simulate some
        const simulatedNotifications = [
            { id: 1, type: 'order', message: 'New order received from Ram\'s Food Stall!', timestamp: new Date(Date.now() - 5 * 60 * 1000).toLocaleString() },
            { id: 2, type: 'new', message: 'Your inventory item "Onions" is running low.', timestamp: new Date(Date.now() - 30 * 60 * 1000).toLocaleString() },
            { id: 3, type: 'alert', message: 'Payment due from Sharma Snacks Corner in 2 days.', timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toLocaleString() },
            { id: 4, type: 'order', message: 'Order #ORD003 has been marked as delivered.', timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toLocaleString() },
        ];

        if (simulatedNotifications.length > 0) {
            notificationList.innerHTML = simulatedNotifications.map(notif => `
                <div class="notification-item ${notif.type}">
                    <i class="fas ${notif.type === 'order' ? 'fa-shopping-cart' : notif.type === 'new' ? 'fa-exclamation-circle' : notif.type === 'alert' ? 'fa-bell' : 'fa-info-circle'}"></i>
                    <div class="notification-content">
                        <p>${notif.message}</p>
                        <small>${notif.timestamp}</small>
                    </div>
                </div>
            `).join('');
        } else {
            notificationList.innerHTML = '<p class="no-data-message">No new notifications.</p>';
        }
        // Reset badge after viewing (in a real app, this would be a backend call)
        document.getElementById('notificationBtn').querySelector('.notification-count').textContent = '0';
        document.getElementById('notificationBtn').querySelector('.notification-count').style.display = 'none';

    } catch (error) {
        console.error('Error loading notifications:', error);
        showToast('Failed to load notifications.', 'error');
        hideModal('notificationsModal');
    }
}

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

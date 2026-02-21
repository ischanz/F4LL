// State management
let inventory = JSON.parse(localStorage.getItem('emergencyInventory')) || [];
let currentCategory = 'all';
let editingId = null;

// Category icons mapping
const categoryIcons = {
    medical: 'heart-pulse',
    food: 'utensils',
    fire: 'flame',
    tools: 'wrench',
    sanitation: 'droplets',
    other: 'box'
};

// Category colors
const categoryColors = {
    medical: 'text-red-600 bg-red-50',
    food: 'text-green-600 bg-green-50',
    fire: 'text-orange-600 bg-orange-50',
    tools: 'text-blue-600 bg-blue-50',
    sanitation: 'text-cyan-600 bg-cyan-50',
    other: 'text-slate-600 bg-slate-50'
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    renderInventory();
    updateStats();
    
    // Set today's date as min for expiry
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('itemExpiry').setAttribute('min', today);
    
    // Update auth controls after render
    setTimeout(() => {
        if (window.AuthManager) {
            AuthManager.updateQuantityControls();
        }
    }, 200);
});

// Modal functions
function openModal(itemId = null) {
    // Check admin access
    if (!AuthManager.protect()) return;
    const modal = document.getElementById('itemModal');
    const form = document.getElementById('itemForm');
    const title = document.getElementById('modalTitle');
    
    editingId = itemId;
    
    if (itemId) {
        const item = inventory.find(i => i.id === itemId);
        if (item) {
            title.textContent = 'Edit Item';
            document.getElementById('itemId').value = item.id;
            document.getElementById('itemName').value = item.name;
            document.getElementById('itemCategory').value = item.category;
            document.getElementById('itemQuantity').value = item.quantity;
            document.getElementById('itemUnit').value = item.unit;
            document.getElementById('itemMinStock').value = item.minStock;
            document.getElementById('itemExpiry').value = item.expiry || '';
            document.getElementById('itemNotes').value = item.notes || '';
        }
    } else {
        title.textContent = 'Add Item';
        form.reset();
        document.getElementById('itemId').value = '';
    }
    
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    const modal = document.getElementById('itemModal');
    modal.classList.add('hidden');
    document.body.style.overflow = '';
    editingId = null;
}

// CRUD Operations
function saveItem(event) {
    event.preventDefault();
    
    // Verify admin status
    if (!AuthManager.isAdmin()) {
        showToast('Admin access required');
        return;
    }
    
    const itemData = {
        id: editingId || Date.now().toString(),
        name: document.getElementById('itemName').value,
        category: document.getElementById('itemCategory').value,
        quantity: parseInt(document.getElementById('itemQuantity').value),
        unit: document.getElementById('itemUnit').value,
        minStock: parseInt(document.getElementById('itemMinStock').value),
        expiry: document.getElementById('itemExpiry').value,
        notes: document.getElementById('itemNotes').value,
        updatedAt: new Date().toISOString()
    };
    
    if (editingId) {
        const index = inventory.findIndex(i => i.id === editingId);
        if (index !== -1) {
            inventory[index] = itemData;
            showToast('Item updated successfully');
        }
    } else {
        inventory.push(itemData);
        showToast('Item added successfully');
    }
    
    saveToStorage();
    closeModal();
    renderInventory();
    updateStats();
    
    // Re-apply auth controls after render
    setTimeout(() => AuthManager.updateQuantityControls(), 100);
}

function deleteItem(id) {
    // Verify admin status
    if (!AuthManager.isAdmin()) {
        showToast('Admin access required');
        return;
    }
    
    if (confirm('Are you sure you want to delete this item?')) {
        inventory = inventory.filter(i => i.id !== id);
        saveToStorage();
        renderInventory();
        updateStats();
        showToast('Item deleted');
        
        // Re-apply auth controls after render
        setTimeout(() => AuthManager.updateQuantityControls(), 100);
    }
}

function updateQuantity(id, change) {
    // Verify admin status
    if (!AuthManager.isAdmin()) {
        showToast('Admin access required');
        return;
    }
    
    const item = inventory.find(i => i.id === id);
    if (item) {
        const newQuantity = item.quantity + change;
        if (newQuantity >= 0) {
            item.quantity = newQuantity;
            item.updatedAt = new Date().toISOString();
            saveToStorage();
            renderInventory();
            updateStats();
            
            // Re-apply auth controls after render
            setTimeout(() => AuthManager.updateQuantityControls(), 100);
        }
    }
}

// Rendering
function renderInventory() {
    const grid = document.getElementById('inventoryGrid');
    const emptyState = document.getElementById('emptyState');
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    
    let filtered = inventory;
    
    // Category filter
    if (currentCategory !== 'all') {
        filtered = filtered.filter(item => item.category === currentCategory);
    }
    
    // Search filter
    if (searchTerm) {
        filtered = filtered.filter(item => 
            item.name.toLowerCase().includes(searchTerm) ||
            item.notes?.toLowerCase().includes(searchTerm)
        );
    }
    
    // Sort by status priority: expired > expiring soon > low stock > normal
    filtered.sort((a, b) => {
        const aStatus = getItemStatus(a);
        const bStatus = getItemStatus(b);
        const priority = { expired: 0, expiring: 1, low: 2, good: 3 };
        return priority[aStatus] - priority[bStatus];
    });
    
    if (filtered.length === 0) {
        grid.innerHTML = '';
        emptyState.classList.remove('hidden');
        return;
    }
    
    emptyState.classList.add('hidden');
    grid.innerHTML = filtered.map(item => {
        const status = getItemStatus(item);
        const statusConfig = getStatusConfig(status, item);
        const categoryIcon = categoryIcons[item.category] || 'box';
        const categoryColor = categoryColors[item.category] || 'text-slate-600 bg-slate-50';
        
        return `
            <div class="item-card bg-white rounded-xl p-5 border border-slate-200 shadow-sm relative overflow-hidden">
                ${status === 'expired' ? '<div class="absolute top-0 left-0 w-full h-1 bg-red-500"></div>' : ''}
                ${status === 'expiring' ? '<div class="absolute top-0 left-0 w-full h-1 bg-orange-500"></div>' : ''}
                ${status === 'low' ? '<div class="absolute top-0 left-0 w-full h-1 bg-amber-500"></div>' : ''}
                
                <div class="flex justify-between items-start mb-3">
                    <div class="flex items-center gap-3">
                        <div class="p-2 rounded-lg ${categoryColor}">
                            <i data-lucide="${categoryIcon}" class="w-5 h-5"></i>
                        </div>
                        <div>
                            <h3 class="font-semibold text-slate-900 line-clamp-1">${escapeHtml(item.name)}</h3>
                            <span class="text-xs text-slate-500 capitalize">${item.category}</span>
                        </div>
                    </div>
                    <div class="flex gap-1">
                        <button onclick="openModal('${item.id}')" class="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                            <i data-lucide="pencil" class="w-4 h-4"></i>
                        </button>
                        <button onclick="deleteItem('${item.id}')" class="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                            <i data-lucide="trash-2" class="w-4 h-4"></i>
                        </button>
                    </div>
                </div>
                
                <div class="flex items-center justify-between mb-4">
                    <div class="flex items-center gap-2">
                        ${AuthManager.canEdit() ? `
                        <button onclick="updateQuantity('${item.id}', -1)" class="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors">
                            <i data-lucide="minus" class="w-4 h-4"></i>
                        </button>
                        <span class="text-lg font-bold text-slate-900 w-12 text-center">${item.quantity}</span>
                        <button onclick="updateQuantity('${item.id}', 1)" class="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors">
                            <i data-lucide="plus" class="w-4 h-4"></i>
                        </button>
                        ` : `
                        <span class="text-sm text-slate-500 mr-2">Qty:</span>
                        <span class="text-lg font-bold text-slate-900 w-12 text-center">${item.quantity}</span>
                        `}
                    </div>
                    <span class="text-sm text-slate-500">${escapeHtml(item.unit)}</span>
                </div>
                
                <div class="flex flex-wrap gap-2 mb-3">
                    <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig.class}">
                        <i data-lucide="${statusConfig.icon}" class="w-3.5 h-3.5"></i>
                        ${statusConfig.text}
                    </span>
                </div>
                
                ${item.expiry ? `
                    <div class="flex items-center gap-2 text-xs ${getExpiryColor(item.expiry)} mb-2">
                        <i data-lucide="calendar" class="w-3.5 h-3.5"></i>
                        <span>Expires: ${formatDate(item.expiry)}</span>
                    </div>
                ` : ''}
                
                ${item.notes ? `
                    <div class="text-xs text-slate-500 line-clamp-2 mt-2 pt-2 border-t border-slate-100">
                        ${escapeHtml(item.notes)}
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');
    
    // Re-initialize icons for dynamic content
    lucide.createIcons();
}

// Status helpers
function getItemStatus(item) {
    if (item.expiry && isExpired(item.expiry)) return 'expired';
    if (item.expiry && isExpiringSoon(item.expiry)) return 'expiring';
    if (item.quantity <= item.minStock) return 'low';
    return 'good';
}

function getStatusConfig(status, item) {
    switch(status) {
        case 'expired':
            return {
                class: 'bg-red-100 text-red-700 border border-red-200',
                icon: 'alert-circle',
                text: 'Expired'
            };
        case 'expiring':
            return {
                class: 'bg-orange-100 text-orange-700 border border-orange-200',
                icon: 'clock',
                text: 'Expiring Soon'
            };
        case 'low':
            return {
                class: 'bg-amber-100 text-amber-700 border border-amber-200',
                icon: 'alert-triangle',
                text: `Low Stock (${item.quantity} left)`
            };
        default:
            return {
                class: 'bg-green-100 text-green-700 border border-green-200',
                icon: 'check-circle',
                text: 'In Stock'
            };
    }
}

function isExpired(dateString) {
    const expiry = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return expiry < today;
}

function isExpiringSoon(dateString, days = 30) {
    const expiry = new Date(dateString);
    const today = new Date();
    const soon = new Date();
    soon.setDate(today.getDate() + days);
    today.setHours(0, 0, 0, 0);
    return expiry >= today && expiry <= soon;
}

function getExpiryColor(dateString) {
    if (isExpired(dateString)) return 'text-red-600 font-medium';
    if (isExpiringSoon(dateString)) return 'text-orange-600 font-medium';
    return 'text-slate-500';
}

// Statistics
function updateStats() {
    const total = inventory.length;
    const lowStock = inventory.filter(i => i.quantity <= i.minStock && !isExpired(i.expiry)).length;
    const expiring = inventory.filter(i => i.expiry && isExpiringSoon(i.expiry) && !isExpired(i.expiry)).length;
    const expired = inventory.filter(i => i.expiry && isExpired(i.expiry)).length;
    
    animateNumber('statTotal', total);
    animateNumber('statLowStock', lowStock);
    animateNumber('statExpiring', expiring);
    animateNumber('statExpired', expired);
    
    // Add pulse animation to cards with issues
    const statCards = document.querySelectorAll('.grid > div');
    if (lowStock > 0) statCards[1].classList.add('ring-2', 'ring-amber-200');
    if (expiring > 0) statCards[2].classList.add('ring-2', 'ring-orange-200');
    if (expired > 0) statCards[3].classList.add('ring-2', 'ring-red-200', 'pulse-alert');
}

function animateNumber(id, value) {
    const element = document.getElementById(id);
    const start = parseInt(element.textContent) || 0;
    const duration = 500;
    const startTime = performance.now();
    
    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeProgress = 1 - Math.pow(1 - progress, 3);
        const current = Math.round(start + (value - start) * easeProgress);
        element.textContent = current;
        
        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }
    
    requestAnimationFrame(update);
}

// Filter functions
function setCategory(category) {
    currentCategory = category;
    
    // Update button styles
    document.querySelectorAll('.category-btn').forEach(btn => {
        if (btn.dataset.category === category) {
            btn.classList.remove('bg-white', 'text-slate-600', 'border', 'border-slate-300');
            btn.classList.add('bg-red-600', 'text-white');
        } else {
            btn.classList.add('bg-white', 'text-slate-600', 'border', 'border-slate-300');
            btn.classList.remove('bg-red-600', 'text-white');
        }
    });
    
    renderInventory();
}

function filterItems() {
    renderInventory();
}

// Data persistence
function saveToStorage() {
    localStorage.setItem('emergencyInventory', JSON.stringify(inventory));
}

function exportData() {
    const dataStr = JSON.stringify(inventory, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `emergency-inventory-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Data exported successfully');
}

function importData(input) {
    const file = input.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            if (Array.isArray(data)) {
                if (confirm(`This will replace ${inventory.length} current items with ${data.length} items from backup. Continue?`)) {
                    inventory = data;
                    saveToStorage();
                    renderInventory();
                    updateStats();
                    showToast('Data imported successfully');
                }
            } else {
                alert('Invalid backup file format');
            }
        } catch (err) {
            alert('Error reading file: ' + err.message);
        }
    };
    reader.readAsText(file);
    input.value = '';
}

// Utilities
function showToast(message) {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');
    toastMessage.textContent = message;
    toast.classList.remove('hidden');
    
    setTimeout(() => {
        toast.classList.add('hidden');
    }, 3000);
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeModal();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        document.getElementById('searchInput').focus();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        openModal();
    }
});
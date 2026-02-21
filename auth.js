// Authentication Manager
const AuthManager = {
    // Check if user is authenticated as admin
    isAdmin() {
        return sessionStorage.getItem('emergencyInventoryAuth') === 'admin';
    },

    // Initialize the page based on auth status
    init() {
        const isAdmin = this.isAdmin();
        const adminControls = document.getElementById('adminControls');
        const readOnlyBanner = document.getElementById('readOnlyBanner');
        
        if (adminControls) {
            if (isAdmin) {
                // Show admin controls
                adminControls.innerHTML = `
                    <button onclick="exportData()" class="hidden sm:flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
                        <i data-lucide="download" class="w-4 h-4"></i>
                        Export
                    </button>
                    <label class="hidden sm:flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer">
                        <i data-lucide="upload" class="w-4 h-4"></i>
                        Import
                        <input type="file" id="importFile" class="hidden" accept=".json" onchange="importData(this)">
                    </label>
                    <button onclick="openModal()" class="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 shadow-md transition-all hover:shadow-lg">
                        <i data-lucide="plus" class="w-4 h-4"></i>
                        <span class="hidden sm:inline">Add Item</span>
                    </button>
                    <button onclick="AuthManager.logout()" class="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
                        <i data-lucide="log-out" class="w-4 h-4"></i>
                        <span class="hidden sm:inline">Logout</span>
                    </button>
                `;
                
                // Re-initialize icons
                if (typeof lucide !== 'undefined') {
                    setTimeout(() => lucide.createIcons(), 0);
                }
            } else {
                // Show read-only exit button only
                adminControls.innerHTML = `
                    <button onclick="window.location.href='index.html'" class="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
                        <i data-lucide="log-in" class="w-4 h-4"></i>
                        <span class="hidden sm:inline">Admin Login</span>
                    </button>
                `;
                
                // Re-initialize icons
                if (typeof lucide !== 'undefined') {
                    setTimeout(() => lucide.createIcons(), 0);
                }
            }
        }
        
        // Show/hide read-only banner
        if (readOnlyBanner) {
            if (isAdmin) {
                readOnlyBanner.classList.add('hidden');
            } else {
                readOnlyBanner.classList.remove('hidden');
            }
        }
        
        // Disable quantity buttons in read-only mode
        this.updateQuantityControls();
    },

    // Logout function
    logout() {
        sessionStorage.removeItem('emergencyInventoryAuth');
        window.location.href = 'index.html';
    },

    // Update quantity controls based on auth status
    updateQuantityControls() {
        const isAdmin = this.isAdmin();
        
        // This will be called after inventory renders
        setTimeout(() => {
            const quantityButtons = document.querySelectorAll('[onclick^="updateQuantity"]');
            quantityButtons.forEach(btn => {
                if (!isAdmin) {
                    btn.disabled = true;
                    btn.classList.add('opacity-50', 'cursor-not-allowed');
                    btn.classList.remove('hover:bg-slate-200');
                    btn.removeAttribute('onclick');
                    btn.title = 'Admin login required';
                }
            });
        }, 100);
    },

    // Check if edit/delete buttons should be shown
    canEdit() {
        return this.isAdmin();
    },

    // Protect admin-only functions
    protect() {
        if (!this.isAdmin()) {
            alert('Admin access required. Please log in.');
            return false;
        }
        return true;
    }
};

// Make auth globally available
window.AuthManager = AuthManager;

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    AuthManager.init();
});
// --- CONFIG ---
// ----------------
// Set to "https://your-backend.onrender.com" for production
const API_BASE_URL = 'http://localhost:4000'; 
const APP_BASE_URL = 'https://predictpro.netlify.app'; // Your Netlify URL

// --- GLOBALS ---
// -----------------
const token = localStorage.getItem('token');
const userRole = localStorage.getItem('role');
const userEmail = localStorage.getItem('email');
const currentPath = window.location.pathname;

// --- UTILITIES ---
// -----------------

/**
 * Shows a toast notification.
 * @param {string} message - The message to display.
 * @param {string} type - 'success', 'error', or 'info'.
 */
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type} mb-2`;
    toast.textContent = message;

    container.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 4000);
}

/**
 * Starts a countdown timer.
 * @param {HTMLElement} element - The DOM element to update.
 * @param {string} expiryDateISO - The ISO string of the expiry date.
 */
function startCountdown(element, expiryDateISO) {
    if (!expiryDateISO) {
        element.textContent = 'N/A';
        return;
    }

    const expiryTime = new Date(expiryDateISO).getTime();

    const interval = setInterval(() => {
        const now = new Date().getTime();
        const distance = expiryTime - now;

        if (distance < 0) {
            clearInterval(interval);
            element.textContent = 'Expired';
            // Optionally reload the page to refresh status
            window.location.reload();
            return;
        }

        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);

        element.textContent = `${days}D ${hours}H ${minutes}M ${seconds}S`;
    }, 1000);
}

/**
 * Handles user logout.
 */
function handleLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('email');
    localStorage.removeItem('assistantExpires');
    window.location.href = '/index.html';
}

/**
 * API Fetch Wrapper
 * @param {string} endpoint - The API endpoint (e.g., '/api/auth/request-otp').
 * @param {string} method - 'GET', 'POST', 'PUT', 'DELETE'.
 * @param {object} body - The JSON body for POST/PUT requests.
 * @param {boolean} isFormData - Set to true if body is FormData.
 * @returns {Promise<object>} - The JSON response data.
 */
async function apiFetch(endpoint, method = 'GET', body = null, isFormData = false) {
    const headers = {};
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
        method,
        headers,
    };

    if (body) {
        if (isFormData) {
            // Don't set Content-Type, browser will do it
            config.body = body;
        } else {
            headers['Content-Type'] = 'application/json';
            config.body = JSON.stringify(body);
        }
    }

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
        const data = await response.json();

        if (!response.ok) {
            // Handle HTTP errors (e.g., 401, 403, 500)
            const errorMsg = data.msg || `Error: ${response.status} ${response.statusText}`;
            showToast(errorMsg, 'error');
            
            // Handle specific auth errors
            if (response.status === 401 || (data.banned && currentPath !== '/index.html')) {
                // Token invalid or user banned, force logout
                handleLogout();
            }
            throw new Error(errorMsg);
        }

        return data;
    } catch (err) {
        console.error('API Fetch Error:', err);
        // showToast(err.message, 'error'); // Already shown in most cases
        throw err;
    }
}


// --- PAGE-SPECIFIC LOGIC ---
// ---------------------------

/**
 * Logic for index.html (Login/Signup Page)
 */
function initIndexPage() {
    // If user is already logged in, redirect
    if (token) {
        const role = localStorage.getItem('role');
        if (role && role !== 'User' && role !== 'Banned') {
            window.location.href = '/admin.html';
        } else {
            window.location.href = '/dashboard.html';
        }
        return;
    }

    const requestForm = document.getElementById('request-otp-form');
    const verifyForm = document.getElementById('verify-otp-form');
    const requestBtn = document.getElementById('request-otp-btn');
    const verifyBtn = document.getElementById('verify-otp-btn');
    const resendBtn = document.getElementById('resend-otp-btn');
    const emailInput = document.getElementById('email');
    const otpInput = document.getElementById('otp');
    const emailDisplay = document.getElementById('user-email-display');

    // Get referral code from URL
    const urlParams = new URLSearchParams(window.location.search);
    const refCode = urlParams.get('ref');

    // Handle OTP Request
    requestForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        requestBtn.disabled = true;
        requestBtn.textContent = 'Sending...';

        try {
            const data = await apiFetch('/api/auth/request-otp', 'POST', {
                email: emailInput.value,
                refCode: refCode,
            });
            showToast(data.msg, 'success');
            requestForm.classList.add('hidden');
            verifyForm.classList.remove('hidden');
            emailDisplay.textContent = emailInput.value;
        } catch (err) {
            // Error toast is handled by apiFetch
        } finally {
            requestBtn.disabled = false;
            requestBtn.textContent = 'Send Login Code';
        }
    });
    
    // Resend OTP
    resendBtn.addEventListener('click', () => {
        requestForm.dispatchEvent(new Event('submit'));
    });

    // Handle OTP Verification
    verifyForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        verifyBtn.disabled = true;
        verifyBtn.textContent = 'Verifying...';

        try {
            const data = await apiFetch('/api/auth/verify-otp', 'POST', {
                email: emailInput.value,
                otp: otpInput.value,
            });

            // Store credentials
            localStorage.setItem('token', data.token);
            localStorage.setItem('role', data.role);
            localStorage.setItem('email', data.email);
            if(data.assistantExpires) {
                 localStorage.setItem('assistantExpires', data.assistantExpires);
            }

            showToast('Login successful!', 'success');

            // Redirect based on role
            if (data.role === 'User' || data.role === 'Banned') {
                window.location.href = '/dashboard.html';
            } else {
                window.location.href = '/admin.html';
            }

        } catch (err) {
            // Handle specific ban error
            if (err.message.includes('suspended')) {
                // Don't redirect, just show error
            }
        } finally {
            verifyBtn.disabled = false;
            verifyBtn.textContent = 'Login / Verify';
        }
    });
}

/**
 * Logic for dashboard.html
 */
async function initDashboardPage() {
    // Page Protection
    if (!token) {
        window.location.href = '/index.html';
        return;
    }
    // If admin lands here, redirect
    if (userRole && userRole !== 'User' && userRole !== 'Banned') {
         window.location.href = '/admin.html';
        return;
    }

    document.getElementById('logout-btn').addEventListener('click', handleLogout);
    document.getElementById('user-email').textContent = userEmail;

    try {
        const data = await apiFetch('/api/user/dashboard');
        const { user, referrals, transactions, odds } = data;

        // --- 1. Handle Ban Status ---
        if (user.role === 'Banned' && user.banExpires) {
            const banNotification = document.getElementById('ban-notification');
            banNotification.classList.remove('hidden');
            document.getElementById('ban-reason').textContent = user.banReason;
            const banCountdownEl = document.getElementById('ban-countdown');
            startCountdown(banCountdownEl, user.banExpires);
            document.getElementById('user-status').textContent = 'Banned';
            document.getElementById('user-status').classList.replace('text-green-400', 'text-red-500');
        }

        // --- 2. Handle Premium Status ---
        document.getElementById('user-role').textContent = user.role;
        document.getElementById('premium-status').textContent = user.premiumStatus;
        if (user.premiumStatus !== 'None' && user.premiumExpires) {
            document.getElementById('premium-status').classList.replace('text-yellow-400', 'text-green-400');
            const premiumNotification = document.getElementById('premium-notification');
            premiumNotification.classList.remove('hidden');
            document.getElementById('premium-plan-name').textContent = user.premiumStatus;
            const premiumCountdownEl = document.getElementById('premium-countdown');
            startCountdown(premiumCountdownEl, user.premiumExpires);
        }

        // --- 3. Handle Referrals ---
        document.getElementById('referral-points').textContent = user.referralPoints;
        const refLink = `${APP_BASE_URL}/?ref=${user.referralCode}`;
        const refLinkInput = document.getElementById('referral-link');
        refLinkInput.value = refLink;
        document.getElementById('copy-ref-link-btn').addEventListener('click', () => {
            refLinkInput.select();
            document.execCommand('copy');
            showToast('Referral link copied!', 'success');
        });

        // --- 4. Load Odds ---
        const oddsContainer = document.getElementById('odds-container');
        oddsContainer.innerHTML = ''; // Clear placeholders
        const categoryIcons = { 'Crash': '🔥', 'Gems': '💎', 'Mines': '💣', 'Aviator': '✈️' };
        
        odds.forEach(odd => {
            const isDisabled = odd.category === 'Aviator'; // Example disabled logic
            oddsContainer.innerHTML += `
                <div classclass="p-4 bg-gray-700 rounded-lg ${isDisabled ? 'opacity-50' : ''}">
                    <h4 class="text-lg font-bold">${categoryIcons[odd.category] || '🎯'} ${odd.title}</h4>
                    <p class="text-sm text-gray-300">${odd.content.substring(0, 50)}...</p>
                    <button class="mt-2 text-sm ${isDisabled ? 'text-gray-500' : 'text-green-400'} font-bold" ${isDisabled ? 'disabled' : ''}>
                        ${isDisabled ? 'Locked' : `Get Odds (${odd.oddsValue} KES)`}
                    </button>
                </div>
            `;
        });
        
        // --- 5. Handle Payment Form ---
        const paymentForm = document.getElementById('payment-form');
        const paymentTypeSelect = document.getElementById('payment-type');
        const premiumPlanSelect = document.getElementById('premium-plan-select');
        
        // Load premium plans into select
        const plans = await apiFetch('/api/premium/plans');
        plans.forEach(plan => {
            premiumPlanSelect.innerHTML += `<option value="${plan.name}">${plan.name} (${plan.price} KES)</option>`;
        });
        
        paymentTypeSelect.addEventListener('change', (e) => {
            if (e.target.value === 'Premium') {
                premiumPlanSelect.classList.remove('hidden');
            } else {
                premiumPlanSelect.classList.add('hidden');
            }
        });

        paymentForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(paymentForm);
            
            try {
                const data = await apiFetch('/api/payment/submit', 'POST', formData, true);
                showToast(data.msg, 'success');
                paymentForm.reset();
            } catch (err) {
                // Error shown by apiFetch
            }
        });
        
        // --- 6. TODO: Support Button ---
        document.getElementById('support-btn').addEventListener('click', () => {
             showToast('Support system coming soon!', 'info');
             // TODO: Implement html2canvas screenshot and modal
        });


    } catch (err) {
        console.error('Failed to load dashboard data:', err);
    }
}

/**
 * Logic for admin.html
 */
async function initAdminPage() {
    // Page Protection
    if (!token) {
        window.location.href = '/index.html';
        return;
    }
    if (userRole === 'User' || userRole === 'Banned') {
         window.location.href = '/dashboard.html';
         return;
    }
    
    document.getElementById('logout-btn').addEventListener('click', handleLogout);
    document.getElementById('admin-email').textContent = userEmail;
    document.getElementById('admin-role').textContent = userRole;

    // --- 1. Role-based UI ---
    if (userRole === 'AssistantAdmin') {
        // Hide super admin tabs
        document.getElementById('assistants-tab').style.display = 'none';
        document.getElementById('tab-assistants').style.display = 'none';
        // Show and start expiry timer
        const assistantTimerEl = document.getElementById('assistant-timer');
        const expiry = localStorage.getItem('assistantExpires');
        if(expiry) {
            assistantTimerEl.classList.remove('hidden');
            startCountdown(assistantTimerEl, expiry);
        }
    }
    
    if(userRole === 'Admin') {
         // Hide super admin tabs
        document.getElementById('assistants-tab').style.display = 'none';
        document.getElementById('tab-assistants').style.display = 'none';
    }
    
    // --- 2. Tabbed Navigation ---
    const tabs = document.querySelectorAll('.admin-tab');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabs[0].classList.add('active'); // Activate first tab by default
    document.getElementById('tab-dashboard').classList.remove('hidden');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Deactivate all
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(c => c.classList.add('hidden'));
            
            // Activate clicked
            tab.classList.add('active');
            document.getElementById(tab.dataset.tab).classList.remove('hidden');
        });
    });
    
    // --- 3. Load Data ---
    try {
        // Load Dashboard Summary
        const summary = await apiFetch('/api/admin/summary');
        document.getElementById('stat-total-users').textContent = summary.users;
        document.getElementById('stat-pending-payments').textContent = summary.pendingTransactions;
        document.getElementById('stat-active-odds').textContent = summary.totalOdds;
        
        // Load Admins list (for SuperAdmin)
        if (userRole === 'SuperAdmin') {
            const adminContainer = document.getElementById('admin-list-container');
            adminContainer.innerHTML = '';
            summary.admins.forEach(admin => {
                adminContainer.innerHTML += `
                    <div class="card flex justify-between items-center text-sm">
                        <div>
                            <p class="font-bold">${admin.email}</p>
                            <p class="text-purple-300">${admin.role}</p>
                        </div>
                        <p class="text-gray-400">${admin.assistantExpires ? 'Expires: ' + new Date(admin.assistantExpires).toLocaleDateString() : ''}</p>
                    </div>
                `;
            });
        }
        
        // Load Pending Payments
        const payments = await apiFetch('/api/admin/payments');
        const paymentsContainer = document.getElementById('pending-payments-container');
        paymentsContainer.innerHTML = '';
        if (payments.length === 0) {
            paymentsContainer.innerHTML = '<p class="text-gray-400">No pending payments.</p>';
        }
        
        payments.forEach(tx => {
            const proofLink = tx.proof.startsWith('/uploads') ? 
                `<a href="${API_BASE_URL}${tx.proof}" target="_blank" class="text-blue-400 hover:underline">View Screenshot</a>` :
                `<p class="text-gray-300 font-mono">${tx.proof}</p>`;
            
            paymentsContainer.innerHTML += `
                <div class="card">
                    <div class="flex justify-between items-start">
                        <div>
                            <p class="font-bold text-lg">${tx.type} - ${tx.amount} KES</p>
                            <p class="text-sm text-gray-400">User: ${tx.user.email}</p>
                            <p class="text-sm text-gray-400">Date: ${new Date(tx.createdAt).toLocaleString()}</p>
                            ${tx.type === 'Premium' ? `<p class="text-yellow-300">Plan: ${tx.premiumPlan}</p>` : ''}
                        </div>
                        <div class="text-right">
                            ${proofLink}
                        </div>
                    </div>
                    <div class="mt-4 flex space-x-2">
                        <button class="btn-verify bg-green-600 hover:bg-green-700 text-white py-1 px-3 rounded text-sm" data-id="${tx._id}" data-status="Approved">Approve</button>
                        <button class="btn-verify bg-red-600 hover:bg-red-700 text-white py-1 px-3 rounded text-sm" data-id="${tx._id}" data-status="Rejected">Reject</button>
                    </div>
                </div>
            `;
        });

    } catch(err) {
        console.error('Failed to load admin data', err);
    }
    
    // --- 4. Event Handlers ---
    
    // Handle Payment Verification
    document.getElementById('pending-payments-container').addEventListener('click', async (e) => {
        if (!e.target.classList.contains('btn-verify')) return;
        
        const btn = e.target;
        const id = btn.dataset.id;
        const status = btn.dataset.status;
        let notes = '';
        
        if (status === 'Rejected') {
            notes = prompt('Reason for rejection (optional):');
        }
        
        btn.disabled = true;
        btn.textContent = '...';
        
        try {
            await apiFetch(`/api/admin/verify-payment/${id}`, 'POST', { status, adminNotes: notes });
            showToast(`Payment ${status.toLowerCase()}!`, 'success');
            // Remove the card from UI
            btn.closest('.card').remove();
        } catch (err) {
             btn.disabled = false;
             btn.textContent = status;
        }
    });

    // Handle Create Assistant
    if (userRole === 'SuperAdmin') {
        document.getElementById('create-assistant-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('assistant-email').value;
            const durationDays = document.getElementById('assistant-duration').value;
            
            try {
                await apiFetch('/api/admin/create-assistant', 'POST', { email, durationDays });
                showToast('Assistant admin created!', 'success');
                // Reload to refresh list (simple)
                window.location.reload();
            } catch(err) {
                // error shown by apiFetch
            }
        });
    }

}


// --- ROUTER / INITIALIZATION ---
// -------------------------------
document.addEventListener('DOMContentLoaded', () => {
    if (currentPath.includes('index.html') || currentPath === '/') {
        initIndexPage();
    } else if (currentPath.includes('dashboard.html')) {
        initDashboardPage();
    } else if (currentPath.includes('admin.html')) {
        initAdminPage();
    }
});

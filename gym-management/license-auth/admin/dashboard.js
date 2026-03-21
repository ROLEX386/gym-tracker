const API_BASE_URL = 'http://localhost:3000';

document.addEventListener('DOMContentLoaded', () => {
    // State
    let currentTab = 'pending';
    let denyRequestId = null;
    let revokeRequestId = null;
    let autoRefreshInterval;

    // Elements
    const loginScreen = document.getElementById('login-screen');
    const dashboardScreen = document.getElementById('dashboard-screen');
    const loginForm = document.getElementById('login-form');
    const loginError = document.getElementById('login-error');
    const requestsContainer = document.getElementById('requests-container');
    const noDataMsg = document.getElementById('no-data-msg');
    const lastUpdated = document.getElementById('last-updated');
    const tabBtns = document.querySelectorAll('.tab-btn');
    const denyModal = document.getElementById('deny-modal');

    // Init
    checkAuth();

    function checkAuth() {
        const token = localStorage.getItem('gym_admin_token');
        if (token) {
            loginScreen.classList.remove('active');
            dashboardScreen.classList.add('active');
            fetchRequests();
            startAutoRefresh();
        } else {
            loginScreen.classList.add('active');
            dashboardScreen.classList.remove('active');
            stopAutoRefresh();
        }
    }

    function getAuthHeaders() {
        return {
            'Authorization': `Bearer ${localStorage.getItem('gym_admin_token')}`,
            'Content-Type': 'application/json'
        };
    }

    function startAutoRefresh() {
        stopAutoRefresh();
        autoRefreshInterval = setInterval(() => {
            if (currentTab === 'pending') fetchRequests(true);
        }, 10000);
    }

    function stopAutoRefresh() {
        if (autoRefreshInterval) clearInterval(autoRefreshInterval);
    }

    // Login
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        loginError.textContent = '';
        
        const btn = document.getElementById('login-btn');
        btn.textContent = 'Logging in...';
        btn.disabled = true;

        try {
            const res = await fetch(`${API_BASE_URL}/api/admin/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await res.json();
            
            if (res.ok && data.token) {
                localStorage.setItem('gym_admin_token', data.token);
                checkAuth();
            } else {
                loginError.textContent = data.error || 'Login failed';
            }
        } catch (error) {
            loginError.textContent = 'Network error during login';
        } finally {
            btn.textContent = 'Login';
            btn.disabled = false;
        }
    });

    // Logout
    document.getElementById('logout-btn').addEventListener('click', () => {
        localStorage.removeItem('gym_admin_token');
        checkAuth();
    });

    // Tabs
    tabBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            tabBtns.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentTab = e.target.getAttribute('data-status');
            fetchRequests();
        });
    });

    // Refresh
    document.getElementById('refresh-btn').addEventListener('click', () => fetchRequests());

    // Fetch Data
    async function fetchRequests(silent = false) {
        if (!silent) {
            requestsContainer.innerHTML = '';
            noDataMsg.style.display = 'none';
        }

        try {
            const res = await fetch(`${API_BASE_URL}/api/admin/requests?status=${currentTab}`, {
                headers: getAuthHeaders()
            });
            
            if (res.status === 401) {
                localStorage.removeItem('gym_admin_token');
                checkAuth();
                return;
            }

            const data = await res.json();
            
            if (!silent) lastUpdated.textContent = `Last updated: ${new Date().toLocaleTimeString()}`;
            
            renderRequests(data);
        } catch (error) {
            console.error('Fetch error:', error);
        }
    }

    function renderRequests(requests) {
        if (!requests || requests.length === 0) {
            requestsContainer.innerHTML = '';
            noDataMsg.style.display = 'block';
            return;
        }
        
        noDataMsg.style.display = 'none';
        
        requestsContainer.innerHTML = requests.map(req => `
            <div class="request-card">
                <div class="card-header">
                    <h3>${escapeHtml(req.businessName)}</h3>
                    <span class="badge ${req.status}">${req.status}</span>
                </div>
                <div class="card-body">
                    <p><strong>Name:</strong> ${escapeHtml(req.name)}</p>
                    <p><strong>Email:</strong> ${escapeHtml(req.email)}</p>
                    <p><strong>Device ID:</strong> ${escapeHtml(req.deviceId)}</p>
                    <div class="date"><p><strong>Date:</strong> ${new Date(req.createdAt).toLocaleString()}</p></div>
                    ${req.denialReason ? `<div class="reason"><p><strong>Denial Reason:</strong> ${escapeHtml(req.denialReason)}</p></div>` : ''}
                </div>
                ${req.status === 'pending' ? `
                <div class="card-actions">
                    <button class="btn btn-success" onclick="approveRequest('${req.id}')">✅ Approve</button>
                    <button class="btn btn-danger" onclick="openDenyModal('${req.id}')">❌ Deny</button>
                </div>
                ` : ''}
                ${req.status === 'approved' ? `
                <div class="card-actions">
                    <button class="btn btn-revoke" onclick="openRevokeModal('${req.id}')">🚫 Revoke Approval</button>
                </div>
                ` : ''}
            </div>
        `).join('');
    }

    // Actions
    window.approveRequest = async (id) => {
        if (!confirm('Are you sure you want to approve this request?')) return;
        
        try {
            const res = await fetch(`${API_BASE_URL}/api/admin/approve/${id}`, {
                method: 'POST',
                headers: getAuthHeaders()
            });
            
            if (res.ok) {
                fetchRequests();
            } else {
                const data = await res.json();
                alert(`Error: ${data.error}`);
            }
        } catch (error) {
            alert('Approval failed due to network error');
        }
    };

    window.openDenyModal = (id) => {
        denyRequestId = id;
        document.getElementById('deny-reason').value = '';
        denyModal.classList.add('active');
    };

    window.openRevokeModal = (id) => {
        revokeRequestId = id;
        document.getElementById('revoke-reason').value = '';
        document.getElementById('revoke-modal').classList.add('active');
    };

    document.getElementById('cancel-revoke-btn').addEventListener('click', () => {
        document.getElementById('revoke-modal').classList.remove('active');
        revokeRequestId = null;
    });

    document.getElementById('confirm-revoke-btn').addEventListener('click', async () => {
        const reason = document.getElementById('revoke-reason').value.trim();
        if (!reason) { alert('Please provide a revocation reason'); return; }

        try {
            const res = await fetch(`${API_BASE_URL}/api/admin/revoke/${revokeRequestId}`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({ reason })
            });
            if (res.ok) {
                document.getElementById('revoke-modal').classList.remove('active');
                revokeRequestId = null;
                fetchRequests();
            } else {
                const data = await res.json();
                alert(`Error: ${data.error}`);
            }
        } catch (error) {
            alert('Revoke failed due to network error');
        }
    });

    document.getElementById('cancel-deny-btn').addEventListener('click', () => {
        denyModal.classList.remove('active');
        denyRequestId = null;
    });

    document.getElementById('confirm-deny-btn').addEventListener('click', async () => {
        const reason = document.getElementById('deny-reason').value.trim();
        if (!reason) {
            alert('Please provide a reason');
            return;
        }

        try {
            const res = await fetch(`${API_BASE_URL}/api/admin/deny/${denyRequestId}`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({ reason })
            });
            
            if (res.ok) {
                denyModal.classList.remove('active');
                denyRequestId = null;
                fetchRequests();
            } else {
                const data = await res.json();
                alert(`Error: ${data.error}`);
            }
        } catch (error) {
            alert('Denial failed due to network error');
        }
    });

    function escapeHtml(unsafe) {
        if(!unsafe) return '';
        return unsafe.toString()
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
});

// SINA Admin - Navigation Shell & Real-time Alert Toast System
(function() {
  function renderAdminNav() {
    const admin = window.sinaAdminAuth ? window.sinaAdminAuth.getCurrentAdmin() : null;
    const isLoginPage = window.location.pathname.endsWith('login.html');
    if (isLoginPage) return;

    const currentPath = window.location.pathname;
    const isHome = currentPath.endsWith('index.html') || currentPath.endsWith('/') || currentPath.endsWith('SINA%20Admin/') || currentPath.endsWith('SINA Admin/');
    const isReps = currentPath.endsWith('representatives.html') || currentPath.endsWith('rep-detail.html');
    const isHistory = currentPath.endsWith('history.html');
    const isCatalog = currentPath.endsWith('catalog.html');
    const isFirms = currentPath.endsWith('firms.html');
    const isApprovals = currentPath.endsWith('approvals.html');
    const isAnalytics = currentPath.endsWith('analytics.html');

    const icons = window.SINA_ICONS;
    if (!icons) return;

    // 1. TOP HEADER
    let topHeader = document.getElementById('sina-admin-header');
    if (!topHeader) {
      topHeader = document.createElement('header');
      topHeader.id = 'sina-admin-header';
      topHeader.className = 'admin-top-bar';
      document.body.prepend(topHeader);
    }

    const notifications = JSON.parse(localStorage.getItem('sina_admin_notifications') || '[]');
    const unreadCount = notifications.filter(n => !n.read).length;

    topHeader.innerHTML = `
      <div class="top-bar-left">
        <button id="admin-drawer-toggle-btn" class="icon-btn" aria-label="Open menu">
          ${icons.get('menu', { size: 22 })}
        </button>
        <div class="admin-branding">
          <span class="brand-name">SINA</span>
          <span class="admin-tag">ADMIN PORTAL</span>
        </div>
      </div>
      <div class="top-bar-right">
        <button id="admin-settings-btn" class="icon-btn" title="App Settings & Policies">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
        </button>
        <button id="admin-notif-btn" class="icon-btn notif-bell-btn" title="Live Alerts">
          ${icons.get('bell', { size: 20 })}
          ${unreadCount > 0 ? `<span class="notif-counter">${unreadCount}</span>` : ''}
        </button>
        <button id="admin-refresh-btn" class="icon-btn refresh-btn" title="Instant Refresh Data" aria-label="Refresh">
          ${icons.get('refresh', { size: 20 })}
        </button>
      </div>
    `;

    // 2. SLIDE-OUT DRAWER
    let drawer = document.getElementById('sina-admin-drawer');
    if (!drawer) {
      drawer = document.createElement('div');
      drawer.id = 'sina-admin-drawer';
      drawer.className = 'sina-drawer';
      document.body.appendChild(drawer);
    }

    drawer.innerHTML = `
      <div class="drawer-backdrop" id="admin-drawer-backdrop"></div>
      <div class="drawer-panel">
        <div class="drawer-header admin-grad-header">
          <div class="rep-avatar-box">
            ${icons.get('shield', { size: 26, stroke: '#FFFFFF' })}
          </div>
          <div class="rep-info">
            <h4 class="rep-name">${admin ? admin.name : 'Operations Admin'}</h4>
            <span class="rep-phone">${admin ? admin.email : 'admin@sina.com'}</span>
            <span class="rep-route-pill">Super Admin</span>
          </div>
          <button class="icon-btn close-drawer-btn" id="close-admin-drawer-btn">
            ${icons.get('close', { size: 20 })}
          </button>
        </div>

        <nav class="drawer-nav">
          <a href="index.html" class="drawer-link ${isHome ? 'active' : ''}">
            <span class="nav-icon">${icons.get('home', { size: 20 })}</span>
            <span class="nav-label">Operations Dashboard</span>
          </a>
          <a href="representatives.html" class="drawer-link ${isReps ? 'active' : ''}">
            <span class="nav-icon">${icons.get('users', { size: 20 })}</span>
            <span class="nav-label">Representatives & Passwords</span>
          </a>
          <a href="history.html" class="drawer-link ${isHistory ? 'active' : ''}">
            <span class="nav-icon">${icons.get('clock', { size: 20 }) || icons.get('receipt', { size: 20 })}</span>
            <span class="nav-label">Purchase History</span>
          </a>
          <a href="catalog.html" class="drawer-link ${isCatalog ? 'active' : ''}">
            <span class="nav-icon">${icons.get('catalog', { size: 20 }) || icons.get('box', { size: 20 })}</span>
            <span class="nav-label">Commodities & Product Master</span>
          </a>
          <a href="firms.html" class="drawer-link ${isFirms ? 'active' : ''}">
            <span class="nav-icon">${icons.get('store', { size: 20 }) || icons.get('cart', { size: 20 })}</span>
            <span class="nav-label">Firms Directory</span>
          </a>
          <a href="approvals.html" class="drawer-link ${isApprovals ? 'active' : ''}">
            <span class="nav-icon">${icons.get('checkCircle', { size: 20 })}</span>
            <span class="nav-label">Payment Approvals</span>
          </a>
          <a href="analytics.html" class="drawer-link ${isAnalytics ? 'active' : ''}">
            <span class="nav-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg></span>
            <span class="nav-label">Operational Analytics</span>
          </a>
        </nav>

        <div class="drawer-footer">
          <button class="btn btn-outline-purple btn-block" style="margin-bottom: 8px;" onclick="window.openSettingsModal()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            App Policies & Settings
          </button>
          <button class="btn btn-outline-purple btn-block" style="color: var(--danger-color); border-color: rgba(220,38,38,0.4); margin-bottom: 8px;" onclick="window.triggerSystemReset()">
            ${icons.get('refresh', { size: 18 })} Reset All Data
          </button>
          <button class="btn btn-logout btn-block" onclick="window.sinaAdminAuth.logout()">
            ${icons.get('logout', { size: 18 })} Sign Out
          </button>
        </div>
      </div>
    `;

    // 3. SETTINGS MODAL INJECTION
    let settingsModal = document.getElementById('admin-settings-modal');
    if (!settingsModal) {
      settingsModal = document.createElement('div');
      settingsModal.id = 'admin-settings-modal';
      settingsModal.className = 'sina-modal-backdrop';
      settingsModal.innerHTML = `
        <div class="sina-modal-card" style="max-width: 480px; padding: 20px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
            <h3 style="font-size: 1.15rem; font-weight: 800; color: var(--purple-primary); margin: 0;">App Policies & Configuration</h3>
            <button class="icon-btn" onclick="window.closeSettingsModal()">&times;</button>
          </div>
          
          <div style="background: var(--bg-secondary); border-radius: var(--radius-sm); padding: 14px; margin-bottom: 16px; border: 1px solid var(--border-color);">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div>
                <strong style="font-size: 0.95rem; color: var(--text-primary);">Mandatory Expense Receipt Photo</strong>
                <p class="text-muted" style="font-size: 0.78rem; margin: 4px 0 0 0;">Require field reps to upload a bill/receipt photo before an expense can be saved.</p>
              </div>
              <label style="position: relative; display: inline-block; width: 44px; height: 24px; margin-left: 12px;">
                <input type="checkbox" id="setting-require-receipt-chk" style="opacity: 0; width: 0; height: 0;">
                <span id="slider-require-receipt" style="position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #CBD5E1; transition: .3s; border-radius: 24px;"></span>
              </label>
            </div>
          </div>

          <div style="display: flex; justify-content: flex-end;">
            <button class="btn btn-primary" onclick="window.saveSettings()">Save Configuration</button>
          </div>
        </div>
      `;
      document.body.appendChild(settingsModal);
    }

    window.openSettingsModal = async function() {
      const modal = document.getElementById('admin-settings-modal');
      const chk = document.getElementById('setting-require-receipt-chk');
      const slider = document.getElementById('slider-require-receipt');
      if (modal && window.sinaAdminDB) {
        const settings = await window.sinaAdminDB.getSettings();
        const isRequired = settings['require_expense_receipt'] === 'true';
        if (chk) chk.checked = isRequired;
        if (slider) slider.style.backgroundColor = isRequired ? 'var(--purple-primary)' : '#CBD5E1';
        modal.classList.add('active');
      }
    };

    window.closeSettingsModal = function() {
      const modal = document.getElementById('admin-settings-modal');
      if (modal) modal.classList.remove('active');
    };

    window.saveSettings = async function() {
      const chk = document.getElementById('setting-require-receipt-chk');
      if (chk && window.sinaAdminDB) {
        const val = chk.checked ? 'true' : 'false';
        await window.sinaAdminDB.setSetting('require_expense_receipt', val);
        alert(`Expense Receipt Policy updated to: ${chk.checked ? 'MANDATORY' : 'OPTIONAL'}`);
        window.closeSettingsModal();
      }
    };

    const settingsBtn = document.getElementById('admin-settings-btn');
    if (settingsBtn) {
      settingsBtn.addEventListener('click', window.openSettingsModal);
    }

    const chk = document.getElementById('setting-require-receipt-chk');
    const slider = document.getElementById('slider-require-receipt');
    if (chk && slider) {
      chk.addEventListener('change', () => {
        slider.style.backgroundColor = chk.checked ? 'var(--purple-primary)' : '#CBD5E1';
      });
    }

    window.triggerSystemReset = async function() {
      if (confirm('Are you sure you want to reset all field data?\n\nThis will wipe all orders, reset field expenses to ₹0, restore fresh morning cash given, and reset representative passwords back to default (rep123).')) {
        await window.sinaAdminDB.resetAllData();
        alert('All field operations data has been reset to starting fresh state.');
        window.location.reload();
      }
    };

    // 3. TOAST CONTAINER FOR REAL-TIME ALERTS
    let toastContainer = document.getElementById('admin-toast-container');
    if (!toastContainer) {
      toastContainer = document.createElement('div');
      toastContainer.id = 'admin-toast-container';
      toastContainer.className = 'admin-toast-container';
      document.body.appendChild(toastContainer);
    }

    // Attach Toggle Handlers
    const drawerBtn = document.getElementById('admin-drawer-toggle-btn');
    const closeDrawerBtn = document.getElementById('close-admin-drawer-btn');
    const backdrop = document.getElementById('admin-drawer-backdrop');

    function toggleAdminDrawer(open) {
      if (open) drawer.classList.add('open');
      else drawer.classList.remove('open');
    }

    if (drawerBtn) drawerBtn.addEventListener('click', () => toggleAdminDrawer(true));
    if (closeDrawerBtn) closeDrawerBtn.addEventListener('click', () => toggleAdminDrawer(false));
    if (backdrop) backdrop.addEventListener('click', () => toggleAdminDrawer(false));

    // REFRESH BUTTON
    const refreshBtn = document.getElementById('admin-refresh-btn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', async () => {
        refreshBtn.classList.add('spinning');
        try {
          if (window.refreshAdminData) {
            await window.refreshAdminData();
          } else {
            await new Promise(r => setTimeout(r, 600));
            window.location.reload();
          }
        } finally {
          setTimeout(() => refreshBtn.classList.remove('spinning'), 500);
        }
      });
    }

    // Listen for incoming live activities from representatives
    if (window.sinaAdminDB) {
      window.sinaAdminDB.onNewActivity((notif) => {
        showLiveToast(notif);
        if (window.refreshAdminData) {
          window.refreshAdminData();
        }
      });
    }
  }

  window.showLiveToast = function(notif) {
    const container = document.getElementById('admin-toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'admin-toast-card';

    let title = 'New Field Activity';
    let body = 'A representative submitted new data.';

    if (notif.type === 'NEW_PROCUREMENT_ENTRY') {
      title = `Procurement Logged: ₹${notif.payload.total_amount?.toLocaleString('en-IN')}`;
      body = `${notif.payload.rep_name || 'Rep'} at ${notif.payload.firm_name} (${notif.payload.payment_mode.toUpperCase()})`;
    } else if (notif.type === 'NEW_EXPENSE') {
      title = `Expense Logged: ₹${notif.payload.amount}`;
      body = `${notif.payload.rep_name || 'Rep'}: ${notif.payload.category.toUpperCase()} - ${notif.payload.notes || ''}`;
    } else if (notif.type === 'PRODUCT_ADDED') {
      title = `New Product Added: ${notif.payload.name}`;
      body = `${notif.payload.type || 'Standard'} (₹${parseFloat(notif.payload.default_rate || 0).toLocaleString('en-IN')} / ${notif.payload.default_unit || 'unit'}) added by field rep`;
    } else if (notif.type === 'CATEGORY_ADDED') {
      title = `New Category Added: ${notif.payload.name}`;
      body = `Category created by field rep`;
    }

    toast.innerHTML = `
      <div class="toast-indicator"></div>
      <div class="toast-content">
        <div class="toast-title">${title}</div>
        <div class="toast-body">${body}</div>
      </div>
    `;

    container.prepend(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-10px)';
      setTimeout(() => toast.remove(), 300);
    }, 4500);
  };

  window.initAdminNavigation = renderAdminNav;
  document.addEventListener('DOMContentLoaded', renderAdminNav);
})();

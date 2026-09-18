// SINA Admin - Navigation Shell & Real-time Alert Toast System
(function() {
  function renderAdminNav() {
    const admin = window.sinaAdminAuth ? window.sinaAdminAuth.getCurrentAdmin() : null;
    const isLoginPage = window.location.pathname.endsWith('login.html');
    if (isLoginPage) return;

    const currentPath = window.location.pathname;
    const isHome = currentPath.endsWith('index.html') || currentPath.endsWith('/') || currentPath.endsWith('SINA%20Admin/') || currentPath.endsWith('SINA Admin/');
    const isReps = currentPath.endsWith('representatives.html') || currentPath.endsWith('rep-detail.html');
    const isCatalog = currentPath.endsWith('catalog.html');
    const isApprovals = currentPath.endsWith('approvals.html');

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
          <a href="catalog.html" class="drawer-link ${isCatalog ? 'active' : ''}">
            <span class="nav-icon">${icons.get('catalog', { size: 20 })}</span>
            <span class="nav-label">Product & Rate Master</span>
          </a>
          <a href="approvals.html" class="drawer-link ${isApprovals ? 'active' : ''}">
            <span class="nav-icon">${icons.get('checkCircle', { size: 20 })}</span>
            <span class="nav-label">Payment Approvals</span>
          </a>
        </nav>

        <div class="drawer-footer">
          <button class="btn btn-outline-purple btn-block" style="color: var(--danger-color); border-color: rgba(220,38,38,0.4); margin-bottom: 8px;" onclick="window.triggerSystemReset()">
            ${icons.get('refresh', { size: 18 })} Reset All Data
          </button>
          <button class="btn btn-logout btn-block" onclick="window.sinaAdminAuth.logout()">
            ${icons.get('logout', { size: 18 })} Sign Out
          </button>
        </div>
      </div>
    `;

    window.triggerSystemReset = async function() {
      if (confirm('Are you sure you want to reset all field data?\n\nThis will wipe all orders, reset field expenses to ₹0, restore fresh morning cash floats, and reset representative passwords back to default (rep123).')) {
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

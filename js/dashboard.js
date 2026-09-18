// SINA Admin - Dashboard Controller (Dual-View: All Reps vs Particular Rep)
(function() {
  let allReps = [];
  let selectedRepId = null; // null = All Representatives

  document.addEventListener('DOMContentLoaded', async () => {
    const admin = window.sinaAdminAuth.requireAdmin();
    if (!admin) return;

    await initRepsDropdown();
    await loadDashboard();

    // Wire up filter selector
    const repSelect = document.getElementById('dashboard-rep-filter');
    if (repSelect) {
      repSelect.addEventListener('change', async (e) => {
        selectedRepId = e.target.value || null;
        await loadDashboard();
      });
    }
  });

  window.refreshAdminData = async function() {
    await loadDashboard();
  };

  async function initRepsDropdown() {
    allReps = await window.sinaAdminDB.getRepresentatives();
    const repSelect = document.getElementById('dashboard-rep-filter');
    if (!repSelect) return;

    let html = '<option value="">All Field Representatives (Consolidated)</option>';
    allReps.forEach(rep => {
      html += `<option value="${rep.id}">Representative: ${escapeHtml(rep.name)} (${escapeHtml(rep.assigned_route || 'Route')})</option>`;
    });
    repSelect.innerHTML = html;
  }

  async function loadDashboard() {
    const metrics = await window.sinaAdminDB.getAdminDashboardMetrics(selectedRepId);

    // Update KPIs
    document.getElementById('kpi-procurement-val').textContent = '₹' + metrics.totalProcurement.toLocaleString('en-IN');
    document.getElementById('kpi-float-val').textContent = '₹' + metrics.totalFloatDisbursed.toLocaleString('en-IN');
    document.getElementById('kpi-cash-collected').textContent = '+ ₹' + metrics.cashCollected.toLocaleString('en-IN');
    document.getElementById('kpi-expenses-val').textContent = '- ₹' + metrics.totalExpenses.toLocaleString('en-IN');
    document.getElementById('kpi-net-cash-val').textContent = '₹' + metrics.netCashInHand.toLocaleString('en-IN');

    // Subtitle indicator
    const filterSubtitle = document.getElementById('dashboard-view-scope');
    if (filterSubtitle) {
      if (selectedRepId) {
        const rep = allReps.find(r => r.id === selectedRepId);
        filterSubtitle.textContent = `Showing operations specifically for: ${rep ? rep.name : 'Selected Representative'}`;
      } else {
        filterSubtitle.textContent = 'Showing consolidated operations for all active field representatives';
      }
    }

    renderRecentActivityTable(metrics.recentEntries);
    renderFloatReconCard(metrics);
  }

  function renderFloatReconCard(m) {
    const card = document.getElementById('recon-summary-card');
    if (!card) return;

    card.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <h3 style="font-size: 1.05rem; font-weight: 700; color: var(--purple-primary);">Field Cash Float Reconciliation</h3>
        <span class="status-badge active">Audited Live</span>
      </div>
      <div class="recon-grid">
        <div class="recon-item">
          <div class="recon-item-lbl">Disbursed Float (Morning)</div>
          <div class="recon-item-val">₹${m.totalFloatDisbursed.toLocaleString('en-IN')}</div>
        </div>
        <div class="recon-item">
          <div class="recon-item-lbl">Procurement Cash Collected</div>
          <div class="recon-item-val" style="color: var(--success-color);">+ ₹${m.cashCollected.toLocaleString('en-IN')}</div>
        </div>
        <div class="recon-item">
          <div class="recon-item-lbl">Field Travel & Food Expenses</div>
          <div class="recon-item-val" style="color: var(--danger-color);">- ₹${m.totalExpenses.toLocaleString('en-IN')}</div>
        </div>
        <div class="recon-item" style="background: var(--purple-tint); border-color: var(--purple-border);">
          <div class="recon-item-lbl" style="color: var(--purple-primary);">Net Cash In Field Hand</div>
          <div class="recon-item-val" style="color: var(--purple-dark);">₹${m.netCashInHand.toLocaleString('en-IN')}</div>
        </div>
      </div>
    `;
  }

  function renderRecentActivityTable(entries) {
    const tbody = document.getElementById('recent-activity-tbody');
    if (!tbody) return;

    if (!entries || entries.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted" style="padding: 24px;">No field entries recorded yet today.</td></tr>`;
      return;
    }

    let html = '';
    entries.forEach(e => {
      const timeStr = new Date(e.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const modeBadge = e.payment_mode === 'cash' ? 'status-badge completed' : (e.payment_mode === 'upi' ? 'status-badge pending' : 'status-badge active');

      html += `
        <tr>
          <td><strong>${timeStr}</strong></td>
          <td><a href="rep-detail.html?id=${e.representative_id}" class="text-purple font-bold">${escapeHtml(e.rep_name || 'Rahul Sharma')}</a></td>
          <td>${escapeHtml(e.firm_name)}</td>
          <td>${escapeHtml(e.type || e.category_name || 'Goods')} (${e.quantity} ${e.unit?.replace('per_', '')})</td>
          <td><strong>₹${parseFloat(e.total_amount || 0).toLocaleString('en-IN')}</strong></td>
          <td><span class="${modeBadge}">${e.payment_mode.toUpperCase()}</span></td>
          <td>
            <a href="rep-detail.html?id=${e.representative_id}" class="btn btn-secondary btn-sm">Inspect Rep</a>
          </td>
        </tr>
      `;
    });

    tbody.innerHTML = html;
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
})();

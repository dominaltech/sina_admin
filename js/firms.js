// SINA Admin - Firms Directory & Representative Visits Spending Controller
(function() {
  let allFirms = [];
  let selectedFirmName = null;
  let searchQuery = '';

  document.addEventListener('DOMContentLoaded', async () => {
    const admin = window.sinaAdminAuth.requireAdmin();
    if (!admin) return;

    await loadFirmsData();
    setupSearch();

    // Listen for live updates
    if (window.sinaAdminDB) {
      window.sinaAdminDB.onActivity(() => {
        loadFirmsData(false);
      });
    }
  });

  window.refreshAdminData = async function() {
    await loadFirmsData();
  };

  async function loadFirmsData(resetSelection = true) {
    allFirms = await window.sinaAdminDB.getFirmsSummary();

    updateKPIs();
    renderFirmsList();

    if (resetSelection && allFirms.length > 0 && !selectedFirmName) {
      // Auto-select first firm if available
      selectFirm(allFirms[0].firm_name);
    } else if (selectedFirmName) {
      const current = allFirms.find(f => f.firm_name.toLowerCase() === selectedFirmName.toLowerCase());
      if (current) renderFirmDetail(current);
    }
  }

  function updateKPIs() {
    const totalFirms = allFirms.length;
    const totalSpent = allFirms.reduce((sum, f) => sum + (f.total_spent || 0), 0);
    const totalVisits = allFirms.reduce((sum, f) => sum + (f.total_visits || 0), 0);

    const countEl = document.getElementById('kpi-firms-count');
    const spentEl = document.getElementById('kpi-total-spent');
    const visitsEl = document.getElementById('kpi-total-visits');

    if (countEl) countEl.textContent = totalFirms;
    if (spentEl) spentEl.textContent = '₹' + totalSpent.toLocaleString('en-IN');
    if (visitsEl) visitsEl.textContent = totalVisits;
  }

  function renderFirmsList() {
    const container = document.getElementById('firms-list-container');
    if (!container) return;

    let filtered = allFirms;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = allFirms.filter(f => 
        f.firm_name.toLowerCase().includes(q) ||
        (f.contact_person && f.contact_person.toLowerCase().includes(q)) ||
        (f.mobile && f.mobile.includes(q)) ||
        (f.address && f.address.toLowerCase().includes(q))
      );
    }

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="card text-center text-muted" style="padding: 24px; background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: var(--radius-md);">
          No firms found matching "${escapeHtml(searchQuery)}".
        </div>
      `;
      return;
    }

    let html = '';
    filtered.forEach(f => {
      const isSelected = selectedFirmName && selectedFirmName.toLowerCase() === f.firm_name.toLowerCase();
      const lastDate = f.last_visited ? new Date(f.last_visited).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Never';

      html += `
        <div class="firm-card ${isSelected ? 'selected' : ''}" onclick="selectFirm('${escapeJsString(f.firm_name)}')">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; margin-bottom: 8px;">
            <div>
              <h3 style="font-size: 1.05rem; font-weight: 800; color: var(--purple-primary); margin-bottom: 2px;">
                ${escapeHtml(f.firm_name)}
              </h3>
              <div style="font-size: 0.82rem; color: var(--text-secondary);">
                ${escapeHtml(f.address || 'APMC Mandi Yard')}
              </div>
            </div>
            <div style="text-align: right; flex-shrink: 0;">
              <span style="font-size: 1.1rem; font-weight: 800; color: var(--text-primary); display: block;">
                ₹${f.total_spent.toLocaleString('en-IN')}
              </span>
              <span class="status-badge ${f.total_visits > 0 ? 'active' : 'pending'}" style="font-size: 0.72rem;">
                ${f.total_visits} ${f.total_visits === 1 ? 'Visit' : 'Visits'}
              </span>
            </div>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; background: var(--bg-secondary); padding: 8px 12px; border-radius: var(--radius-sm); font-size: 0.8rem; margin: 8px 0;">
            <div>
              <span class="text-muted">Contact:</span>
              <strong>${escapeHtml(f.contact_person || 'Owner')}</strong>
              ${f.mobile ? `&bull; <a href="tel:${f.mobile}" class="text-purple font-bold" onclick="event.stopPropagation()">${f.mobile}</a>` : ''}
            </div>
            <div class="text-muted" style="font-size: 0.75rem;">
              Last visit: <strong>${lastDate}</strong>
            </div>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 6px; font-size: 0.75rem;">
            <span class="text-muted">Click to inspect visits & representative spending</span>
            <span style="color: var(--purple-primary); font-weight: 700;">View Breakdown &rarr;</span>
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
  }

  window.selectFirm = function(firmName) {
    selectedFirmName = firmName;
    renderFirmsList();

    const firm = allFirms.find(f => f.firm_name.toLowerCase() === firmName.toLowerCase());
    if (firm) {
      renderFirmDetail(firm);
      const detailSec = document.getElementById('firm-detail-section');
      if (detailSec) {
        detailSec.style.display = 'block';
        detailSec.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  function renderFirmDetail(firm) {
    const banner = document.getElementById('selected-firm-banner');
    const tbody = document.getElementById('firm-visits-tbody');
    const mobileList = document.getElementById('firm-visits-mobile-list');
    const titleEl = document.getElementById('selected-firm-title');

    if (titleEl) {
      titleEl.textContent = `Representatives Who Visited: ${firm.firm_name}`;
    }

    // Populate Highlight Banner
    if (banner) {
      banner.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
          <div>
            <div style="font-size: 1.15rem; font-weight: 800; color: var(--purple-primary);">${escapeHtml(firm.firm_name)}</div>
            <div style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 2px;">
              Owner: <strong>${escapeHtml(firm.contact_person || 'Manager')}</strong> &bull; Phone: <a href="tel:${firm.mobile}" class="text-purple font-bold">${firm.mobile || 'N/A'}</a>
            </div>
            <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 2px;">
              Address: ${escapeHtml(firm.address || 'Mandi Yard')}
            </div>
          </div>
          <div style="text-align: right; background: var(--purple-tint); padding: 10px 16px; border-radius: var(--radius-md); border: 1px solid var(--purple-border);">
            <div style="font-size: 0.75rem; color: var(--purple-primary); font-weight: 700; text-transform: uppercase;">Total Spent at this Firm</div>
            <div style="font-size: 1.35rem; font-weight: 900; color: var(--purple-dark);">₹${firm.total_spent.toLocaleString('en-IN')}</div>
            <div style="font-size: 0.72rem; color: var(--text-muted);">${firm.total_visits} total visits logged</div>
          </div>
        </div>
      `;
    }

    if (!firm.visits || firm.visits.length === 0) {
      if (tbody) tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted" style="padding: 24px;">No visits recorded yet for this firm.</td></tr>`;
      if (mobileList) mobileList.innerHTML = `<div class="card text-center text-muted" style="padding: 20px;">No visits recorded yet for this firm.</div>`;
      return;
    }

    let tableHtml = '';
    let mobileCardsHtml = '';

    firm.visits.forEach(v => {
      const dateStr = new Date(v.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
      const timeStr = new Date(v.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const modeBadge = v.payment_mode === 'cash' ? 'status-badge completed' : (v.payment_mode === 'upi' ? 'status-badge pending' : 'status-badge active');
      const itemDesc = `${escapeHtml(v.item_name)}${v.quantity ? ` (${v.quantity} ${v.unit ? v.unit.replace('per_', '') : ''})` : ''}`;

      // Table Row
      tableHtml += `
        <tr>
          <td>
            <div style="display: flex; align-items: center; gap: 8px;">
              <div style="width: 28px; height: 28px; border-radius: 50%; background: var(--purple-tint); color: var(--purple-primary); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.75rem;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              </div>
              <div>
                <a href="rep-detail.html?id=${v.rep_id}" class="text-purple font-bold">${escapeHtml(v.rep_name)}</a>
              </div>
            </div>
          </td>
          <td>
            <strong>${dateStr}</strong> <span class="text-muted" style="font-size: 0.78rem;">(${timeStr})</span>
          </td>
          <td>
            <span style="font-size: 1rem; font-weight: 800; color: var(--purple-primary);">₹${v.amount.toLocaleString('en-IN')}</span>
          </td>
          <td>${itemDesc}</td>
          <td>
            <span class="${modeBadge}">${(v.payment_mode || 'cash').toUpperCase()}</span>
          </td>
        </tr>
      `;

      // Mobile Card
      mobileCardsHtml += `
        <div class="rep-visit-mobile-card">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <div style="width: 28px; height: 28px; border-radius: 50%; background: var(--purple-tint); color: var(--purple-primary); display: flex; align-items: center; justify-content: center;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              </div>
              <a href="rep-detail.html?id=${v.rep_id}" class="text-purple font-bold" style="font-size: 0.95rem;">${escapeHtml(v.rep_name)}</a>
            </div>
            <span class="${modeBadge}">${(v.payment_mode || 'cash').toUpperCase()}</span>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: baseline; background: var(--bg-secondary); padding: 8px 10px; border-radius: var(--radius-sm); margin: 6px 0;">
            <span class="text-muted" style="font-size: 0.78rem;">Amount Spent:</span>
            <span style="font-size: 1.15rem; font-weight: 800; color: var(--purple-primary);">₹${v.amount.toLocaleString('en-IN')}</span>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.78rem; color: var(--text-secondary);">
            <span>Item: <strong>${itemDesc}</strong></span>
            <span class="text-muted">${dateStr} ${timeStr}</span>
          </div>
        </div>
      `;
    });

    if (tbody) tbody.innerHTML = tableHtml;
    if (mobileList) mobileList.innerHTML = mobileCardsHtml;
  }

  function setupSearch() {
    const searchInput = document.getElementById('firm-search-input');
    if (!searchInput) return;

    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.trim();
      renderFirmsList();
    });
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function escapeJsString(str) {
    if (!str) return '';
    return String(str)
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'")
      .replace(/"/g, '\\"');
  }
})();

// SINA Admin - Purchase History Controller
(function() {
  let allReps = [];

  document.addEventListener('DOMContentLoaded', async () => {
    const admin = window.sinaAdminAuth.requireAdmin();
    if (!admin) return;

    await initRepsFilter();
    setupEventListeners();
    await loadHistory();
  });

  window.refreshAdminData = async function() {
    await loadHistory();
  };

  async function initRepsFilter() {
    allReps = await window.sinaAdminDB.getRepresentatives();
    const select = document.getElementById('history-rep-filter');
    if (!select) return;

    let html = '<option value="">All Representatives (Consolidated)</option>';
    allReps.forEach(rep => {
      html += `<option value="${rep.id}">${escapeHtml(rep.name)} (${escapeHtml(rep.assigned_route || 'Field')})</option>`;
    });
    select.innerHTML = html;
  }

  function setupEventListeners() {
    const dateInput = document.getElementById('history-date-filter');
    const todayBtn = document.getElementById('btn-filter-today');
    const allDatesBtn = document.getElementById('btn-filter-all-dates');
    const repSelect = document.getElementById('history-rep-filter');
    const searchInput = document.getElementById('history-search-input');
    const paymentSelect = document.getElementById('history-payment-filter');

    if (dateInput) {
      dateInput.addEventListener('change', () => loadHistory());
    }

    if (todayBtn) {
      todayBtn.addEventListener('click', () => {
        if (dateInput) {
          dateInput.value = new Date().toISOString().split('T')[0];
          loadHistory();
        }
      });
    }

    if (allDatesBtn) {
      allDatesBtn.addEventListener('click', () => {
        if (dateInput) {
          dateInput.value = '';
          loadHistory();
        }
      });
    }

    if (repSelect) {
      repSelect.addEventListener('change', () => loadHistory());
    }

    if (paymentSelect) {
      paymentSelect.addEventListener('change', () => loadHistory());
    }

    if (searchInput) {
      let debounceTimer = null;
      searchInput.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => loadHistory(), 250);
      });
    }
  }

  async function loadHistory() {
    const dateVal = document.getElementById('history-date-filter')?.value || '';
    const repIdVal = document.getElementById('history-rep-filter')?.value || '';
    const searchVal = document.getElementById('history-search-input')?.value || '';
    const paymentVal = document.getElementById('history-payment-filter')?.value || 'all';

    // 1. Fetch filtered purchases
    const purchases = await window.sinaAdminDB.getAllPurchases({
      date: dateVal,
      repId: repIdVal,
      search: searchVal,
      paymentMode: paymentVal
    });

    // 2. Compute Summary Stats
    const totalSpent = purchases.reduce((acc, curr) => acc + (parseFloat(curr.total_amount) || 0), 0);
    const countEl = document.getElementById('history-count');
    const spentEl = document.getElementById('history-total-spent');
    const scopeEl = document.getElementById('history-scope-label');

    if (countEl) countEl.textContent = purchases.length.toString();
    if (spentEl) spentEl.textContent = '₹' + totalSpent.toLocaleString('en-IN');

    // Human description of active filter scope
    let scopeParts = [];
    if (dateVal) {
      const d = new Date(dateVal + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
      scopeParts.push(`Date: ${d}`);
    } else {
      scopeParts.push('All Dates');
    }

    if (repIdVal) {
      const r = allReps.find(rep => rep.id === repIdVal);
      scopeParts.push(`Rep: ${r ? r.name : 'Selected Rep'}`);
    } else {
      scopeParts.push('All Representatives');
    }

    if (paymentVal && paymentVal !== 'all') {
      scopeParts.push(`Payment: ${paymentVal.toUpperCase()}`);
    }

    if (searchVal.trim()) {
      scopeParts.push(`Keyword: "${searchVal.trim()}"`);
    }

    if (scopeEl) scopeEl.textContent = scopeParts.join(' • ');

    // 3. Render Results
    renderPurchasesList(purchases);
  }

  function renderPurchasesList(purchases) {
    const container = document.getElementById('history-results-container');
    if (!container) return;

    if (!purchases || purchases.length === 0) {
      container.innerHTML = `
        <div class="card text-center text-muted" style="padding: 40px 16px; background: var(--bg-primary); border: 1px dashed var(--border-color); border-radius: var(--radius-md);">
          <div style="display: flex; justify-content: center; margin-bottom: 10px; color: var(--text-muted);">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          </div>
          <div style="font-size: 1.05rem; font-weight: 700; color: var(--text-primary); margin-bottom: 4px;">No purchase records found</div>
          <div style="font-size: 0.82rem;">Try adjusting the date, representative, or search query.</div>
        </div>
      `;
      return;
    }

    // 1. Desktop Table
    let tableHtml = `
      <div class="history-table-desktop table-responsive">
        <table class="admin-table" style="margin: 0;">
          <thead>
            <tr>
              <th>Date & Time</th>
              <th>Representative</th>
              <th>Firm / Shop</th>
              <th>Commodity / Goods</th>
              <th>Qty & Rate</th>
              <th>Total Amount</th>
              <th>Payment Mode</th>
              <th>Proofs</th>
            </tr>
          </thead>
          <tbody>
    `;

    // 2. Mobile Responsive Card List
    let mobileHtml = `<div class="history-mobile-list">`;

    purchases.forEach(p => {
      const dateObj = new Date(p.created_at);
      const dateStr = dateObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
      const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const amtStr = '₹' + parseFloat(p.total_amount || 0).toLocaleString('en-IN');
      const repName = p.rep_name || 'Rahul Sharma';
      const itemName = p.type || p.category_name || 'Goods';
      const unitStr = p.unit ? p.unit.replace('per_', '') : 'unit';
      const modeBadge = p.payment_mode === 'cash' ? 'status-badge completed' : (p.payment_mode === 'upi' ? 'status-badge pending' : 'status-badge active');
      const hasImages = p.images && p.images.length > 0;

      // Table Row
      tableHtml += `
        <tr>
          <td>
            <div style="font-weight: 700; color: var(--text-primary);">${dateStr}</div>
            <div class="text-muted" style="font-size: 0.75rem;">${timeStr}</div>
          </td>
          <td>
            <div style="font-weight: 700; color: var(--purple-primary);">${escapeHtml(repName)}</div>
          </td>
          <td>
            <div style="font-weight: 700; color: var(--text-primary);">${escapeHtml(p.firm_name)}</div>
            <div class="text-muted" style="font-size: 0.78rem;">${escapeHtml(p.contact_person)} (${escapeHtml(p.mobile || 'N/A')})</div>
          </td>
          <td>
            <div style="font-weight: 600;">${escapeHtml(itemName)}</div>
          </td>
          <td>
            <div>${p.quantity} ${escapeHtml(unitStr)} @ ₹${p.rate}</div>
          </td>
          <td>
            <span style="font-weight: 800; font-size: 1rem; color: var(--purple-dark);">${amtStr}</span>
          </td>
          <td>
            <span class="${modeBadge}">${(p.payment_mode || 'cash').toUpperCase()}</span>
            ${p.upi_id ? `<div class="text-muted" style="font-size: 0.72rem; margin-top: 2px;">UPI: ${escapeHtml(p.upi_id)}</div>` : ''}
            ${p.upi_utr ? `<div class="text-muted" style="font-size: 0.72rem;">UTR: ${escapeHtml(p.upi_utr)}</div>` : ''}
          </td>
          <td>
            ${hasImages ? `
              <div style="display: flex; gap: 6px;">
                ${p.images.map(img => `<img src="${img}" class="proof-thumb" onclick="openProofModal('${img}')">`).join('')}
              </div>
            ` : '<span class="text-muted" style="font-size: 0.75rem;">None</span>'}
          </td>
        </tr>
      `;

      // Mobile Card
      mobileHtml += `
        <div class="history-mobile-card">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
            <div>
              <div style="font-weight: 800; font-size: 1rem; color: var(--text-primary);">${escapeHtml(p.firm_name)}</div>
              <div style="font-size: 0.78rem; color: var(--purple-primary); font-weight: 700; margin-top: 2px;">
                Rep: ${escapeHtml(repName)} &bull; <span class="text-muted">${dateStr} ${timeStr}</span>
              </div>
            </div>
            <span class="${modeBadge}" style="font-size: 0.7rem;">${(p.payment_mode || 'cash').toUpperCase()}</span>
          </div>

          <div style="font-size: 0.82rem; color: var(--text-secondary); margin-bottom: 8px;">
            Contact: <strong>${escapeHtml(p.contact_person)}</strong> (${escapeHtml(p.mobile || 'N/A')}) &bull; ${escapeHtml(p.address || 'Field')}
          </div>

          <div style="background: var(--bg-secondary); padding: 8px 12px; border-radius: var(--radius-sm); display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <div>
              <span style="font-weight: 700; font-size: 0.88rem;">${escapeHtml(itemName)}</span>
              <span class="text-muted" style="font-size: 0.8rem; margin-left: 6px;">(${p.quantity} ${escapeHtml(unitStr)} @ ₹${p.rate})</span>
            </div>
            <span style="font-weight: 800; font-size: 1.1rem; color: var(--purple-dark);">${amtStr}</span>
          </div>

          ${p.upi_id || p.upi_utr ? `
            <div style="font-size: 0.78rem; color: var(--text-muted); margin-bottom: 6px;">
              ${p.upi_id ? `UPI ID: <strong style="color: var(--text-primary);">${escapeHtml(p.upi_id)}</strong> ` : ''}
              ${p.upi_utr ? `&bull; UTR: <strong style="color: var(--text-primary);">${escapeHtml(p.upi_utr)}</strong>` : ''}
            </div>
          ` : ''}

          ${hasImages ? `
            <div style="margin-top: 8px; border-top: 1px solid var(--border-color); padding-top: 8px;">
              <span style="font-size: 0.72rem; color: var(--text-muted); font-weight: 600;">Uploaded Proofs:</span>
              <div style="display: flex; gap: 8px; margin-top: 4px;">
                ${p.images.map(img => `<img src="${img}" class="proof-thumb" onclick="openProofModal('${img}')">`).join('')}
              </div>
            </div>
          ` : ''}
        </div>
      `;
    });

    tableHtml += `</tbody></table></div>`;
    mobileHtml += `</div>`;

    container.innerHTML = tableHtml + mobileHtml;
  }

  window.openProofModal = function(imgSrc) {
    const modal = document.getElementById('proof-view-modal');
    const imgEl = document.getElementById('proof-view-img');
    if (modal && imgEl) {
      imgEl.src = imgSrc;
      modal.classList.add('active');
    }
  };

  window.closeProofModal = function() {
    const modal = document.getElementById('proof-view-modal');
    if (modal) modal.classList.remove('active');
  };

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
})();

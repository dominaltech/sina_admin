// SINA Admin - Representative Live Tracking Controller
(function() {
  let currentRep = null;
  let repId = null;

  document.addEventListener('DOMContentLoaded', async () => {
    const admin = window.sinaAdminAuth.requireAdmin();
    if (!admin) return;

    const params = new URLSearchParams(window.location.search);
    repId = params.get('id');

    if (!repId) {
      alert('No representative ID specified.');
      window.location.href = 'representatives.html';
      return;
    }

    await loadRepDetails();
    setupFloatModal();
  });

  window.refreshAdminData = async function() {
    await loadRepDetails();
  };

  async function loadRepDetails() {
    currentRep = await window.sinaAdminDB.getRepresentativeById(repId);
    if (!currentRep) {
      alert('Representative not found.');
      window.location.href = 'representatives.html';
      return;
    }

    // Populate header info
    document.getElementById('rep-detail-name').textContent = currentRep.name;
    document.getElementById('rep-detail-phone').textContent = currentRep.phone;
    document.getElementById('rep-detail-route').textContent = currentRep.assigned_route || 'Unassigned Territory';
    
    const statusPill = document.getElementById('rep-detail-status');
    if (statusPill) {
      statusPill.className = `status-badge ${currentRep.status === 'active' ? 'active' : 'inactive'}`;
      statusPill.textContent = currentRep.status === 'active' ? 'Active in Field' : 'Inactive';
    }

    // Get live data
    const summary = await window.sinaAdminDB.getAdminDashboardMetrics(repId);
    
    document.getElementById('rep-metric-visits').textContent = summary.todayVisitsCount;
    document.getElementById('rep-metric-procured').textContent = '₹' + summary.totalProcurement.toLocaleString('en-IN');
    document.getElementById('rep-metric-float').textContent = '₹' + summary.totalFloatDisbursed.toLocaleString('en-IN');
    document.getElementById('rep-metric-cash-col').textContent = '+ ₹' + summary.cashCollected.toLocaleString('en-IN');
    document.getElementById('rep-metric-expenses').textContent = '- ₹' + summary.totalExpenses.toLocaleString('en-IN');
    document.getElementById('rep-metric-net-cash').textContent = '₹' + summary.netCashInHand.toLocaleString('en-IN');

    // Render daily cash given history
    const cashHistory = await window.sinaAdminDB.getDailyFloatsByRep(repId);
    renderCashHistory(cashHistory);

    renderActivityTimeline(summary.recentEntries, summary.recentExpenses);
  }

  function renderCashHistory(records) {
    const container = document.getElementById('rep-cash-history-list');
    if (!container) return;

    if (!records || records.length === 0) {
      container.innerHTML = `
        <div class="card text-muted text-center" style="padding: 20px; background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: var(--radius-md);">
          No cash given recorded yet for this representative.
        </div>
      `;
      return;
    }

    // 1. Desktop Table
    let tableHtml = `
      <div class="cash-log-table-desktop table-responsive">
        <table class="admin-table" style="margin: 0;">
          <thead>
            <tr>
              <th>Date</th>
              <th>Cash Given Amount</th>
              <th>Notes / Route Purpose</th>
              <th style="text-align: right;">Action</th>
            </tr>
          </thead>
          <tbody>
    `;

    // 2. Mobile Responsive Card List (Fits 100% on small screens without scroll)
    let mobileCardsHtml = `<div class="cash-log-cards-mobile">`;

    records.forEach(r => {
      const d = new Date(r.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
      const amtStr = '₹' + parseFloat(r.float_amount || 0).toLocaleString('en-IN');
      const safeNotes = escapeHtml(r.notes || 'Morning cash for purchases');

      tableHtml += `
        <tr>
          <td><strong>${d}</strong></td>
          <td><span style="font-weight: 800; color: var(--purple-primary); font-size: 0.95rem;">${amtStr}</span></td>
          <td class="text-muted" style="font-size: 0.85rem;">${safeNotes}</td>
          <td style="text-align: right;">
            <button class="btn btn-outline-purple btn-sm" onclick="openEditFloatForDate('${r.date}', ${r.float_amount}, '${safeNotes}')">
              Edit
            </button>
          </td>
        </tr>
      `;

      mobileCardsHtml += `
        <div class="cash-log-mobile-item">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <div style="display: flex; align-items: center; gap: 6px; font-weight: 700; color: var(--text-primary); font-size: 0.88rem;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              <span>${d}</span>
            </div>
            <button class="btn btn-outline-purple btn-sm" onclick="openEditFloatForDate('${r.date}', ${r.float_amount}, '${safeNotes}')" style="padding: 4px 10px; font-size: 0.78rem;">
              Edit
            </button>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: baseline; background: var(--bg-secondary); padding: 8px 10px; border-radius: var(--radius-sm); margin-bottom: 6px;">
            <span class="text-muted" style="font-size: 0.78rem;">Cash Given:</span>
            <span style="font-size: 1.1rem; font-weight: 800; color: var(--purple-primary);">${amtStr}</span>
          </div>
          <div style="font-size: 0.8rem; color: var(--text-secondary);">
            <span class="text-muted">Notes:</span> ${safeNotes}
          </div>
        </div>
      `;
    });

    tableHtml += `</tbody></table></div>`;
    mobileCardsHtml += `</div>`;

    container.innerHTML = tableHtml + mobileCardsHtml;
  }

  window.openEditFloatForDate = function(dateStr, amount, notes) {
    const modal = document.getElementById('issue-float-modal');
    if (!modal) return;
    document.getElementById('float_date_input').value = dateStr;
    document.getElementById('float_amount_input').value = amount;
    document.getElementById('float_notes_input').value = notes || '';
    modal.classList.add('active');
  };

  function renderActivityTimeline(entries, expenses) {
    const timelineEl = document.getElementById('rep-activity-timeline');
    if (!timelineEl) return;

    // Merge entries and expenses into unified chronological events
    const events = [];

    (entries || []).forEach(e => {
      events.push({
        type: 'entry',
        timestamp: new Date(e.created_at).getTime(),
        timeStr: new Date(e.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        data: e
      });
    });

    (expenses || []).forEach(x => {
      events.push({
        type: 'expense',
        timestamp: new Date(x.created_at).getTime(),
        timeStr: new Date(x.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        data: x
      });
    });

    events.sort((a, b) => b.timestamp - a.timestamp);

    if (events.length === 0) {
      timelineEl.innerHTML = `
        <div class="card text-center text-muted" style="padding: 24px;">
          No visits or activities logged yet for this representative.
        </div>
      `;
      return;
    }

    let html = '';
    events.forEach(evt => {
      if (evt.type === 'entry') {
        const e = evt.data;
        const modeBadge = e.payment_mode === 'cash' ? 'status-badge completed' : (e.payment_mode === 'upi' ? 'status-badge pending' : 'status-badge active');
        const hasImages = e.images && e.images.length > 0;

        html += `
          <div class="timeline-item">
            <div class="timeline-dot"></div>
            <div class="timeline-content-card">
              <div class="timeline-header">
                <div>
                  <span class="timeline-title">${escapeHtml(e.firm_name)}</span>
                  <span class="status-badge active" style="margin-left: 8px; font-size: 0.65rem;">Shop Visit & Purchase</span>
                </div>
                <span class="timeline-time">${evt.timeStr}</span>
              </div>
              <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 6px;">
                Contact: <strong>${escapeHtml(e.contact_person)}</strong> (${e.mobile}) &bull; Address: ${escapeHtml(e.address)}
              </div>
              <div style="background: var(--bg-secondary); padding: 8px 12px; border-radius: var(--radius-sm); font-size: 0.85rem; display: flex; justify-content: space-between; align-items: center;">
                <span>Item: <strong>${escapeHtml(e.type || e.category_name || 'Goods')}</strong> (${e.quantity} ${e.unit?.replace('per_', '')} @ ₹${e.rate})</span>
                <span style="font-weight: 800; font-size: 1rem; color: var(--purple-dark);">₹${parseFloat(e.total_amount || 0).toLocaleString('en-IN')}</span>
              </div>
              <div style="margin-top: 8px; display: flex; justify-content: space-between; align-items: center;">
                <div>
                  Payment: <span class="${modeBadge}">${e.payment_mode.toUpperCase()}</span>
                  ${e.upi_id ? `<span class="text-muted" style="font-size: 0.75rem; margin-left: 6px;">(${escapeHtml(e.upi_id)})</span>` : ''}
                </div>
              </div>
              ${hasImages ? `
                <div style="margin-top: 8px;">
                  <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600;">Uploaded Passbook / Cheque Proofs:</span>
                  <div style="display: flex; gap: 8px; margin-top: 4px;">
                    ${e.images.map(img => `
                      <img src="${img}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 6px; border: 1px solid var(--purple-border); cursor: pointer;" onclick="openProofModal('${img}')">
                    `).join('')}
                  </div>
                </div>
              ` : ''}
            </div>
          </div>
        `;
      } else {
        const x = evt.data;
        html += `
          <div class="timeline-item">
            <div class="timeline-dot" style="background: var(--danger-color); border-color: rgba(220, 38, 38, 0.3);"></div>
            <div class="timeline-content-card" style="border-left: 3px solid var(--danger-color);">
              <div class="timeline-header">
                <div>
                  <span class="timeline-title">Expense: ${escapeHtml(x.category?.toUpperCase() || 'GENERAL')}</span>
                </div>
                <span class="timeline-time">${evt.timeStr}</span>
              </div>
              <div style="font-size: 0.85rem; color: var(--text-secondary);">
                Amount: <strong style="color: var(--danger-color);">₹${parseFloat(x.amount || 0).toLocaleString('en-IN')}</strong> &bull; Notes: ${escapeHtml(x.notes || 'None')}
              </div>
            </div>
          </div>
        `;
      }
    });

    timelineEl.innerHTML = html;
  }

  function setupFloatModal() {
    const openBtn = document.getElementById('btn-issue-float');
    const modal = document.getElementById('issue-float-modal');
    const closeBtn = document.getElementById('btn-close-float-modal');
    const form = document.getElementById('issue-float-form');

    if (!openBtn || !modal) return;

    openBtn.addEventListener('click', () => {
      document.getElementById('float_date_input').value = new Date().toISOString().split('T')[0];
      modal.classList.add('active');
    });
    if (closeBtn) closeBtn.addEventListener('click', () => modal.classList.remove('active'));

    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const date = document.getElementById('float_date_input')?.value || new Date().toISOString().split('T')[0];
        const amount = parseFloat(document.getElementById('float_amount_input')?.value) || 0;
        const notes = document.getElementById('float_notes_input')?.value.trim();

        if (amount < 0) {
          alert('Please enter a valid amount.');
          return;
        }

        await window.sinaAdminDB.issueDailyFloat(repId, amount, notes, date);
        alert(`Cash given of ₹${amount.toLocaleString('en-IN')} recorded for ${currentRep.name}.`);
        modal.classList.remove('active');
        await loadRepDetails();
      });
    }
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

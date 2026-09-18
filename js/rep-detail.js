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

    renderActivityTimeline(summary.recentEntries, summary.recentExpenses);
  }

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
          No visits or activities logged yet today for this representative.
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
                  <span class="status-badge active" style="margin-left: 8px; font-size: 0.65rem;">Shop Visit & Procurement</span>
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
                      <img src="${img}" style="width: 54px; height: 54px; object-fit: cover; border-radius: 6px; border: 1px solid var(--purple-border); cursor: pointer;" onclick="openProofModal('${img}')">
                    `).join('')}
                  </div>
                </div>
              ` : ''}
            </div>
          </div>
        `;
      } else if (evt.type === 'expense') {
        const x = evt.data;
        html += `
          <div class="timeline-item">
            <div class="timeline-dot" style="background: var(--danger-color);"></div>
            <div class="timeline-content-card" style="border-left: 3px solid var(--danger-color);">
              <div class="timeline-header">
                <div>
                  <span class="timeline-title">${escapeHtml(x.category.toUpperCase())} Expense</span>
                  <span class="status-badge inactive" style="margin-left: 8px; font-size: 0.65rem;">Field Expense</span>
                </div>
                <span class="timeline-time">${evt.timeStr}</span>
              </div>
              <div style="font-size: 0.85rem; color: var(--text-secondary);">
                ${escapeHtml(x.notes || 'Routine field travel / food expense')}
              </div>
              <div style="margin-top: 6px; font-weight: 800; color: var(--danger-color); font-size: 0.95rem;">
                - ₹${parseFloat(x.amount || 0).toLocaleString('en-IN')}
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

    openBtn.addEventListener('click', () => modal.classList.add('active'));
    if (closeBtn) closeBtn.addEventListener('click', () => modal.classList.remove('active'));

    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const amount = parseFloat(document.getElementById('float_amount_input')?.value) || 0;
        const notes = document.getElementById('float_notes_input')?.value.trim();

        if (amount <= 0) {
          alert('Please enter a valid float amount.');
          return;
        }

        await window.sinaAdminDB.issueDailyFloat(repId, amount, notes);
        alert(`Cash float of ₹${amount.toLocaleString('en-IN')} issued to ${currentRep.name}.`);
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

// SINA Admin - Payment Verification & Approvals Controller
(function() {
  let pendingEntries = [];

  document.addEventListener('DOMContentLoaded', async () => {
    const admin = window.sinaAdminAuth.requireAdmin();
    if (!admin) return;

    await loadApprovals();
  });

  window.refreshAdminData = async function() {
    await loadApprovals();
  };

  async function loadApprovals() {
    const all = await window.sinaAdminDB.getProcurementEntries();
    pendingEntries = all.filter(e => e.payment_mode !== 'cash' || e.status === 'pending_approval');

    renderApprovalsTable();
  }

  function renderApprovalsTable() {
    const container = document.getElementById('approvals-container');
    if (!container) return;

    if (pendingEntries.length === 0) {
      container.innerHTML = `
        <div class="card text-center" style="padding: 36px 16px;">
          <h4 style="color: var(--success-color);">All Clear!</h4>
          <p class="text-muted" style="margin-top: 4px;">No pending UPI or Bank Transfer payments awaiting approval.</p>
        </div>
      `;
      return;
    }

    let html = '';
    pendingEntries.forEach(e => {
      const isVerified = e.status === 'verified' || e.status === 'completed';
      const hasImages = e.images && e.images.length > 0;

      html += `
        <div class="card" style="margin-bottom: 14px; border-left: 4px solid ${isVerified ? 'var(--success-color)' : 'var(--warning-color)'};">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
            <div>
              <h3 style="font-size: 1.05rem; font-weight: 700;">${escapeHtml(e.firm_name)}</h3>
              <div class="text-muted" style="font-size: 0.8rem;">
                Rep: <strong>${escapeHtml(e.rep_name || 'Rahul Sharma')}</strong> &bull; Contact: ${escapeHtml(e.contact_person)} (${e.mobile})
              </div>
            </div>
            <div style="text-align: right;">
              <span style="font-size: 1.15rem; font-weight: 800; color: var(--purple-dark);">₹${parseFloat(e.total_amount || 0).toLocaleString('en-IN')}</span>
              <div><span class="status-badge ${isVerified ? 'completed' : 'pending'}">${e.status.toUpperCase()}</span></div>
            </div>
          </div>

          <div style="background: var(--bg-secondary); padding: 10px; border-radius: var(--radius-sm); font-size: 0.85rem; margin-bottom: 10px;">
            <div><strong>Payment Mode:</strong> ${e.payment_mode.toUpperCase()}</div>
            ${e.payment_mode === 'upi' ? `
              <div><strong>UPI ID / Number:</strong> ${escapeHtml(e.upi_id || 'N/A')}</div>
              <div><strong>UTR Reference:</strong> ${escapeHtml(e.upi_utr || 'Pending submission')}</div>
            ` : ''}
            <div><strong>Order Item:</strong> ${escapeHtml(e.type || e.category_name || 'Goods')} (${e.quantity} ${e.unit?.replace('per_', '')} @ ₹${e.rate})</div>
          </div>

          ${hasImages ? `
            <div style="margin-bottom: 12px;">
              <span style="font-size: 0.75rem; font-weight: 700; color: var(--text-secondary);">Uploaded Passbook / Cheque Proofs (${e.images.length}):</span>
              <div style="display: flex; gap: 8px; margin-top: 6px;">
                ${e.images.map(img => `
                  <img src="${img}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 6px; border: 1px solid var(--purple-border); cursor: pointer;" onclick="openApprovalImg('${img}')">
                `).join('')}
              </div>
            </div>
          ` : ''}

          <div style="display: flex; gap: 8px; justify-content: flex-end;">
            ${!isVerified ? `
              <button class="btn btn-primary btn-sm" onclick="approvePayment('${e.id}')">
                Approve Payment
              </button>
              <button class="btn btn-secondary btn-sm" onclick="rejectPayment('${e.id}')">
                Reject / Flag
              </button>
            ` : `
              <span class="status-badge completed">Verified & Settled</span>
            `}
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
  }

  window.approvePayment = async function(id) {
    if (confirm('Verify and mark this payment as completed?')) {
      await window.sinaAdminDB.updateEntryStatus(id, 'verified');
      await loadApprovals();
    }
  };

  window.rejectPayment = async function(id) {
    if (confirm('Flag this entry as rejected?')) {
      await window.sinaAdminDB.updateEntryStatus(id, 'rejected');
      await loadApprovals();
    }
  };

  window.openApprovalImg = function(src) {
    const modal = document.getElementById('approval-img-modal');
    const imgEl = document.getElementById('approval-full-img');
    if (modal && imgEl) {
      imgEl.src = src;
      modal.classList.add('active');
    }
  };

  window.closeApprovalImg = function() {
    const modal = document.getElementById('approval-img-modal');
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

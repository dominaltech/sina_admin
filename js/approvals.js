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
    // Filter for all UPI and Bank Transfer entries, or those pending verification
    pendingEntries = all.filter(e => 
      e.payment_mode === 'upi' || 
      e.payment_mode === 'bank_transfer' || 
      e.status === 'pending' || 
      e.status === 'pending_approval'
    );

    renderApprovalsTable();
  }

  function renderApprovalsTable() {
    const container = document.getElementById('approvals-container');
    if (!container) return;

    if (pendingEntries.length === 0) {
      container.innerHTML = `
        <div class="card text-center" style="padding: 36px 16px;">
          <h4 style="color: var(--success-color); font-size: 1.15rem; font-weight: 700;">All Clear!</h4>
          <p class="text-muted" style="margin-top: 4px;">No pending UPI or Bank Transfer payments awaiting approval.</p>
        </div>
      `;
      return;
    }

    let html = '';
    pendingEntries.forEach(e => {
      const isVerified = e.status === 'verified' || e.status === 'completed';
      const hasImages = e.images && e.images.length > 0;
      const amountFloat = parseFloat(e.total_amount || 0);
      const items = e.items && e.items.length > 0 ? e.items : null;

      // NPCI Standard UPI deep link: prefilled amount, editable in PhonePe
      const upiUrl = e.upi_id ? `upi://pay?pa=${encodeURIComponent(e.upi_id)}&pn=${encodeURIComponent(e.firm_name)}&am=${amountFloat.toFixed(2)}&cu=INR&tn=${encodeURIComponent('SINA Procurement ' + (e.firm_name || 'Bill'))}` : '#';

      html += `
        <div class="card" style="margin-bottom: 16px; border-left: 4px solid ${isVerified ? 'var(--success-color)' : 'var(--warning-color)'};">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
            <div>
              <h3 style="font-size: 1.1rem; font-weight: 800; margin: 0;">${escapeHtml(e.firm_name)}</h3>
              <div class="text-muted" style="font-size: 0.82rem; margin-top: 2px;">
                Rep: <strong>${escapeHtml(e.rep_name || 'Rahul Sharma')}</strong> &bull; Contact: ${escapeHtml(e.contact_person)} (<a href="tel:${e.mobile}" class="text-purple">${e.mobile}</a>)
              </div>
            </div>
            <div style="text-align: right;">
              <span style="font-size: 1.25rem; font-weight: 800; color: var(--purple-dark);">₹${amountFloat.toLocaleString('en-IN')}</span>
              <div>
                <span class="status-badge ${isVerified ? 'completed' : 'pending'}">${isVerified ? 'VERIFIED & PAID' : 'PENDING APPROVAL'}</span>
              </div>
            </div>
          </div>

          <!-- Order Items Details -->
          <div style="background: var(--bg-secondary); padding: 10px 12px; border-radius: var(--radius-sm); font-size: 0.85rem; margin-bottom: 12px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
              <span><strong>Payment Mode:</strong> ${e.payment_mode.toUpperCase()}</span>
              <span class="text-muted">${new Date(e.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            
            ${items ? `
              <div style="margin-top: 6px; border-top: 1px dashed var(--border-color); padding-top: 6px;">
                <div style="font-weight: 700; color: var(--purple-primary); margin-bottom: 4px;">Items (${items.length}):</div>
                ${items.map(it => `
                  <div style="display: flex; justify-content: space-between; font-size: 0.82rem; padding: 2px 0;">
                    <span>${escapeHtml(it.product_name || it.type)} (${it.quantity} ${it.unit?.replace('per_', '')} @ ₹${it.rate})</span>
                    <strong>₹${parseFloat(it.line_total || 0).toLocaleString('en-IN')}</strong>
                  </div>
                `).join('')}
              </div>
            ` : `
              <div><strong>Item:</strong> ${escapeHtml(e.type || e.category_name || 'Goods')} (${e.quantity} ${e.unit?.replace('per_', '')} @ ₹${e.rate})</div>
            `}
          </div>

          <!-- UPI ACTION SECTION -->
          ${e.payment_mode === 'upi' ? `
            <div style="background: var(--purple-tint); border: 1.5px solid var(--purple-border); border-radius: var(--radius-md); padding: 12px 14px; margin-bottom: 12px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <span style="font-size: 0.82rem; font-weight: 700; color: var(--purple-primary);">Firm UPI Payment Request</span>
                <span style="font-size: 0.75rem; color: var(--text-secondary);">Prefilled but editable in PhonePe</span>
              </div>

              <div style="display: flex; align-items: center; justify-content: space-between; background: var(--bg-primary); padding: 8px 12px; border-radius: var(--radius-sm); margin-bottom: 10px; border: 1px solid var(--border-color);">
                <div>
                  <div style="font-size: 0.72rem; color: var(--text-muted);">Payee UPI ID:</div>
                  <strong style="font-size: 0.95rem; color: var(--purple-dark);">${escapeHtml(e.upi_id || 'N/A')}</strong>
                </div>
                <div style="display: flex; gap: 6px;">
                  <button type="button" class="btn btn-secondary btn-sm" onclick="copyText('${escapeHtml(e.upi_id || '')}', 'UPI ID copied to clipboard')" style="padding: 4px 8px; font-size: 0.75rem;">
                    Copy UPI ID
                  </button>
                  <button type="button" class="btn btn-secondary btn-sm" onclick="copyText('${amountFloat.toFixed(2)}', 'Amount ₹${amountFloat} copied')" style="padding: 4px 8px; font-size: 0.75rem;">
                    Copy ₹${amountFloat}
                  </button>
                </div>
              </div>

              <!-- PhonePe Direct Deep Link Button -->
              <div style="display: flex; gap: 8px; margin-bottom: 12px;">
                <a href="${upiUrl}" class="btn btn-primary btn-sm" style="flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 9px; font-weight: 700; text-decoration: none;">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                  Pay via PhonePe / UPI (₹${amountFloat.toLocaleString('en-IN')})
                </a>
              </div>

              <!-- UTR Input & Confirmation -->
              <div style="border-top: 1px dashed var(--purple-border); padding-top: 10px;">
                <label class="form-label" style="font-size: 0.8rem; margin-bottom: 4px;">
                  ${isVerified ? 'Verified UTR / Transaction Reference No.' : 'Enter UTR / Transaction No. (After PhonePe Payment):'}
                </label>
                <div style="display: flex; gap: 8px;">
                  <input type="text" id="utr-input-${e.id}" class="form-input" placeholder="e.g. 428198765432" value="${escapeHtml(e.upi_utr || '')}" ${isVerified ? 'readonly' : ''} style="flex: 1; font-size: 0.9rem;">
                  ${!isVerified ? `
                    <button type="button" class="btn btn-primary btn-sm" onclick="confirmUpiPayment('${e.id}')" style="white-space: nowrap; padding: 8px 14px; font-weight: 700;">
                      Confirm & Send to Rep
                    </button>
                  ` : `
                    <span class="status-badge completed" style="display: flex; align-items: center;">Sent to Rep</span>
                  `}
                </div>
              </div>
            </div>
          ` : ''}

          <!-- BANK TRANSFER PROOFS -->
          ${hasImages ? `
            <div style="margin-bottom: 12px;">
              <span style="font-size: 0.75rem; font-weight: 700; color: var(--text-secondary);">Uploaded Passbook / Cheque Proofs (${e.images.length}):</span>
              <div style="display: flex; gap: 8px; margin-top: 6px;">
                ${e.images.map(img => `
                  <img src="${img}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 6px; border: 1px solid var(--purple-border); cursor: pointer;" onclick="openApprovalImg('${img}')" alt="Payment Proof">
                `).join('')}
              </div>
            </div>
          ` : ''}

          <!-- Bank Transfer Action Buttons -->
          ${e.payment_mode === 'bank_transfer' ? `
            <div style="display: flex; gap: 8px; justify-content: flex-end; margin-top: 8px;">
              ${!isVerified ? `
                <button class="btn btn-primary btn-sm" onclick="approveBankPayment('${e.id}')">
                  Approve Bank Transfer
                </button>
                <button class="btn btn-secondary btn-sm" onclick="rejectPayment('${e.id}')">
                  Reject / Flag
                </button>
              ` : `
                <span class="status-badge completed">Verified & Settled</span>
              `}
            </div>
          ` : ''}
        </div>
      `;
    });

    container.innerHTML = html;
  }

  window.confirmUpiPayment = async function(id) {
    const utrInput = document.getElementById(`utr-input-${id}`);
    const utrVal = utrInput ? utrInput.value.trim() : '';

    if (!utrVal) {
      alert('Please enter or paste the 12-digit UPI UTR / Transaction Reference number after completing the payment in PhonePe.');
      if (utrInput) utrInput.focus();
      return;
    }

    try {
      await window.sinaAdminDB.updateEntryPayment(id, {
        status: 'verified',
        upi_utr: utrVal
      });

      alert(`Payment of UTR ${utrVal} confirmed and synchronized to representative's app!`);
      await loadApprovals();
    } catch (err) {
      console.error(err);
      alert('Error updating payment: ' + err.message);
    }
  };

  window.approveBankPayment = async function(id) {
    if (confirm('Verify and mark this bank transfer payment as completed?')) {
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

  window.copyText = function(text, successMsg) {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      alert(successMsg || 'Copied to clipboard');
    }).catch(() => {
      prompt('Copy this text:', text);
    });
  };

  window.openApprovalImg = function(src) {
    const modal = document.getElementById('approval-img-modal');
    const img = document.getElementById('approval-full-img');
    if (modal && img) {
      img.src = src;
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

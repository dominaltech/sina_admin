// SINA Admin - Representative Management & Password Control
(function() {
  let reps = [];

  document.addEventListener('DOMContentLoaded', async () => {
    const admin = window.sinaAdminAuth.requireAdmin();
    if (!admin) return;

    await loadRepresentatives();
    setupAddRepModal();
    setupPasswordModal();
    setupRepFloatModal();
  });

  window.refreshAdminData = async function() {
    await loadRepresentatives();
  };

  let allFloats = [];

  async function loadRepresentatives() {
    reps = await window.sinaAdminDB.getRepresentatives();
    allFloats = await window.sinaAdminDB.getDailyFloats();
    renderRepsTable();
  }

  function renderRepsTable() {
    const tbody = document.getElementById('reps-table-tbody');
    if (!tbody) return;

    if (reps.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted" style="padding: 24px;">No representatives registered.</td></tr>`;
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    let html = '';
    reps.forEach(rep => {
      const repFloat = allFloats.find(f => String(f.representative_id) === String(rep.id) && f.date === today) ||
                       allFloats.find(f => String(f.representative_id) === String(rep.id));
      const floatAmt = repFloat ? parseFloat(repFloat.float_amount) || 0 : (rep.id === '22222222-2222-2222-2222-222222222222' ? 15000 : 0);

      html += `
        <tr>
          <td>
            <div style="font-weight: 700;">${escapeHtml(rep.name)}</div>
            <div class="text-muted" style="font-size: 0.8rem;">ID: ${rep.id.substring(0, 8)}...</div>
          </td>
          <td>
            <a href="tel:${rep.phone}" class="text-purple font-bold">${escapeHtml(rep.phone)}</a>
          </td>
          <td>${escapeHtml(rep.assigned_route || 'Unassigned')}</td>
          <td>
            <button class="btn btn-outline-purple btn-sm" onclick="openRepFloatModal('${rep.id}', '${escapeHtml(rep.name)}', ${floatAmt})">
              ₹${floatAmt.toLocaleString('en-IN')} (Edit)
            </button>
          </td>
          <td>
            <span class="status-badge ${rep.status === 'active' ? 'active' : 'inactive'}">
              ${rep.status.toUpperCase()}
            </span>
          </td>
          <td>
            <button class="btn btn-outline-purple btn-sm" onclick="openPasswordModal('${rep.id}', '${escapeHtml(rep.name)}', '${escapeHtml(rep.password_hash)}')">
              Key &bull;&bull;&bull;&bull;
            </button>
          </td>
          <td>
            <div style="display: flex; gap: 6px;">
              <a href="rep-detail.html?id=${rep.id}" class="btn btn-primary btn-sm">
                Live Activity
              </a>
              <button class="btn btn-secondary btn-sm" onclick="toggleStatus('${rep.id}', '${rep.status}')">
                ${rep.status === 'active' ? 'Deactivate' : 'Activate'}
              </button>
            </div>
          </td>
        </tr>
      `;
    });

    tbody.innerHTML = html;
  }

  function setupAddRepModal() {
    const openBtn = document.getElementById('btn-open-add-rep');
    const modal = document.getElementById('add-rep-modal');
    const closeBtn = document.getElementById('btn-close-add-rep');
    const form = document.getElementById('add-rep-form');

    if (!openBtn || !modal) return;

    openBtn.addEventListener('click', () => modal.classList.add('active'));
    if (closeBtn) closeBtn.addEventListener('click', () => modal.classList.remove('active'));

    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('rep_name')?.value.trim();
        const phone = document.getElementById('rep_phone')?.value.trim();
        const route = document.getElementById('rep_route')?.value.trim();
        const password = document.getElementById('rep_password')?.value.trim();

        if (!name || !phone || !password) {
          alert('Name, Phone and Password are required.');
          return;
        }

        try {
          await window.sinaAdminDB.addRepresentative({
            name,
            phone,
            assigned_route: route,
            password
          });
          alert(`Representative "${name}" created successfully!`);
          modal.classList.remove('active');
          form.reset();
          await loadRepresentatives();
        } catch (err) {
          alert('Error: ' + err.message);
        }
      });
    }
  }

  function setupPasswordModal() {
    const modal = document.getElementById('edit-password-modal');
    const closeBtn = document.getElementById('btn-close-password-modal');
    const form = document.getElementById('edit-password-form');

    if (closeBtn && modal) {
      closeBtn.addEventListener('click', () => modal.classList.remove('active'));
    }

    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const repId = document.getElementById('pwd_rep_id')?.value;
        const newPassword = document.getElementById('pwd_new_password')?.value.trim();

        if (!newPassword) {
          alert('Please enter a new password/PIN.');
          return;
        }

        try {
          await window.sinaAdminDB.updateRepresentativePassword(repId, newPassword);
          alert('Password updated successfully! Representative can now login with the new password.');
          modal.classList.remove('active');
          await loadRepresentatives();
        } catch (err) {
          alert('Error updating password: ' + err.message);
        }
      });
    }
  }

  function setupRepFloatModal() {
    const modal = document.getElementById('rep-float-modal');
    const closeBtn = document.getElementById('btn-close-rep-float-modal');
    const form = document.getElementById('rep-float-form');

    if (closeBtn && modal) {
      closeBtn.addEventListener('click', () => modal.classList.remove('active'));
    }

    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const repId = document.getElementById('float_rep_id')?.value;
        const date = document.getElementById('rep_float_date_input')?.value || new Date().toISOString().split('T')[0];
        const amount = parseFloat(document.getElementById('rep_float_amount_input')?.value) || 0;
        const notes = document.getElementById('rep_float_notes_input')?.value.trim();

        try {
          await window.sinaAdminDB.issueDailyFloat(repId, amount, notes, date);
          alert('Cash given updated successfully and synced to representative!');
          modal.classList.remove('active');
          await loadRepresentatives();
        } catch (err) {
          alert('Error updating cash: ' + err.message);
        }
      });
    }
  }

  window.openRepFloatModal = function(repId, repName, currentFloat, floatDate = null) {
    const modal = document.getElementById('rep-float-modal');
    if (!modal) return;

    document.getElementById('float_rep_id').value = repId;
    document.getElementById('rep_float_name_display').textContent = repName;
    document.getElementById('rep_float_date_input').value = floatDate || new Date().toISOString().split('T')[0];
    document.getElementById('rep_float_amount_input').value = currentFloat || 0;
    document.getElementById('rep_float_notes_input').value = 'Daily field procurement cash';
    modal.classList.add('active');
  };

  window.openPasswordModal = function(repId, repName, currentPass) {
    const modal = document.getElementById('edit-password-modal');
    if (!modal) return;

    document.getElementById('pwd_rep_id').value = repId;
    document.getElementById('pwd_rep_name_display').textContent = repName;
    document.getElementById('pwd_new_password').value = currentPass || '';
    modal.classList.add('active');
  };

  window.toggleStatus = async function(repId, currentStatus) {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    if (confirm(`Are you sure you want to set this representative to ${newStatus.toUpperCase()}?`)) {
      await window.sinaAdminDB.updateRepresentative(repId, { status: newStatus });
      await loadRepresentatives();
    }
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

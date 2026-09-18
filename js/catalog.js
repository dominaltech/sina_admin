// SINA Admin - Product & Category Master Controller
(function() {
  let categories = [];
  let products = [];

  document.addEventListener('DOMContentLoaded', async () => {
    const admin = window.sinaAdminAuth.requireAdmin();
    if (!admin) return;

    await loadCatalog();
    setupAddCategoryModal();
    setupAddProductModal();
  });

  window.refreshAdminData = async function() {
    await loadCatalog();
  };

  async function loadCatalog() {
    categories = await window.sinaAdminDB.getCategories();
    products = await window.sinaAdminDB.getProducts();

    renderCategoriesList();
    renderProductsTable();
    populateCategoryDropdown();
  }

  function renderCategoriesList() {
    const listEl = document.getElementById('categories-chip-list');
    if (!listEl) return;

    listEl.innerHTML = categories.map(c => `
      <div class="status-badge active" style="font-size: 0.85rem; padding: 6px 12px; margin: 4px;">
        ${escapeHtml(c.name)}
      </div>
    `).join('');
  }

  function renderProductsTable() {
    const tbody = document.getElementById('products-table-tbody');
    if (!tbody) return;

    if (products.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted" style="padding: 20px;">No products defined.</td></tr>`;
      return;
    }

    let html = '';
    products.forEach(p => {
      const cat = categories.find(c => c.id === p.category_id);
      const unitLabel = p.default_unit === 'per_kg' ? 'Per Kg' : (p.default_unit === 'per_piece' ? 'Per Piece' : 'Per Bag');

      html += `
        <tr>
          <td><strong>${escapeHtml(p.name)}</strong></td>
          <td>${escapeHtml(p.type || 'Standard')}</td>
          <td><span class="status-badge active">${escapeHtml(cat ? cat.name : 'General')}</span></td>
          <td>${unitLabel}</td>
          <td><strong>₹${parseFloat(p.default_rate || 0).toLocaleString('en-IN')}</strong></td>
          <td>
            <button class="btn btn-secondary btn-sm" onclick="deleteProductItem('${p.id}')">
              Delete
            </button>
          </td>
        </tr>
      `;
    });

    tbody.innerHTML = html;
  }

  function populateCategoryDropdown() {
    const select = document.getElementById('prod_category_select');
    if (!select) return;

    select.innerHTML = '<option value="">-- Choose Category --</option>';
    categories.forEach(c => {
      select.innerHTML += `<option value="${c.id}">${escapeHtml(c.name)}</option>`;
    });
  }

  function setupAddCategoryModal() {
    const openBtn = document.getElementById('btn-open-add-cat');
    const modal = document.getElementById('add-cat-modal');
    const closeBtn = document.getElementById('btn-close-cat-modal');
    const form = document.getElementById('add-cat-form');

    if (!openBtn || !modal) return;
    openBtn.addEventListener('click', () => modal.classList.add('active'));
    if (closeBtn) closeBtn.addEventListener('click', () => modal.classList.remove('active'));

    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('new_cat_name')?.value.trim();
        if (!name) return;
        await window.sinaAdminDB.addCategory(name);
        alert(`Category "${name}" added.`);
        modal.classList.remove('active');
        form.reset();
        await loadCatalog();
      });
    }
  }

  function setupAddProductModal() {
    const openBtn = document.getElementById('btn-open-add-prod');
    const modal = document.getElementById('add-prod-modal');
    const closeBtn = document.getElementById('btn-close-prod-modal');
    const form = document.getElementById('add-prod-form');

    if (!openBtn || !modal) return;
    openBtn.addEventListener('click', () => modal.classList.add('active'));
    if (closeBtn) closeBtn.addEventListener('click', () => modal.classList.remove('active'));

    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('new_prod_name')?.value.trim();
        const type = document.getElementById('new_prod_type')?.value.trim();
        const categoryId = document.getElementById('prod_category_select')?.value;
        const unit = document.getElementById('new_prod_unit')?.value;
        const rate = parseFloat(document.getElementById('new_prod_rate')?.value) || 0;

        if (!name || !categoryId) {
          alert('Product name and category are required.');
          return;
        }

        await window.sinaAdminDB.addProduct({
          name,
          type,
          category_id: categoryId,
          default_unit: unit,
          default_rate: rate
        });

        alert(`Product "${name}" added to catalog.`);
        modal.classList.remove('active');
        form.reset();
        await loadCatalog();
      });
    }
  }

  window.deleteProductItem = async function(id) {
    if (confirm('Delete this product from catalog?')) {
      await window.sinaAdminDB.deleteProduct(id);
      await loadCatalog();
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

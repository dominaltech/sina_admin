// SINA Admin - Data Layer & Real-Time Sync Engine
(function() {
  class SINA_AdminDB {
    constructor() {
      this.channel = null;
      this.activityListeners = [];
      this.initBroadcast();
      this.initStorage();
    }

    initBroadcast() {
      if ('BroadcastChannel' in window) {
        this.channel = new BroadcastChannel(window.SINA_CONFIG.BROADCAST_CHANNEL);
        this.channel.onmessage = (event) => {
          this.handleIncomingBroadcast(event.data);
        };
      }

      window.addEventListener('storage', (e) => {
        if (e.key === 'sina_last_event' && e.newValue) {
          try {
            const data = JSON.parse(e.newValue);
            this.handleIncomingBroadcast(data);
          } catch (err) {}
        }
      });
    }

    handleIncomingBroadcast(data) {
      if (!data) return;
      // Add to notifications log
      const notifications = JSON.parse(localStorage.getItem('sina_admin_notifications') || '[]');
      const notif = {
        id: 'notif_' + Date.now(),
        type: data.type,
        payload: data.payload,
        timestamp: data.timestamp || Date.now(),
        read: false
      };
      notifications.unshift(notif);
      localStorage.setItem('sina_admin_notifications', JSON.stringify(notifications));

      // Trigger all registered listeners
      this.activityListeners.forEach(listener => {
        try { listener(notif); } catch (e) { console.error(e); }
      });
    }

    onNewActivity(callback) {
      this.activityListeners.push(callback);
    }

    initStorage() {
      // Ensure seed profiles exist
      if (!localStorage.getItem('sina_profiles')) {
        const initialProfiles = [
          {
            id: '22222222-2222-2222-2222-222222222222',
            name: 'Rahul Sharma',
            phone: '9811223344',
            password_hash: 'rep123',
            role: 'representative',
            assigned_route: 'North Wholesale Market',
            status: 'active',
            created_at: new Date().toISOString()
          },
          {
            id: '33333333-3333-3333-3333-333333333333',
            name: 'Suresh Kumar',
            phone: '9822334455',
            password_hash: 'rep123',
            role: 'representative',
            assigned_route: 'South Industrial Zone',
            status: 'active',
            created_at: new Date().toISOString()
          },
          {
            id: '44444444-4444-4444-4444-444444444444',
            name: 'Amit Patel',
            phone: '9833445566',
            password_hash: 'rep123',
            role: 'representative',
            assigned_route: 'East Rural Mandi',
            status: 'active',
            created_at: new Date().toISOString()
          }
        ];
        localStorage.setItem('sina_profiles', JSON.stringify(initialProfiles));
      }
    }

    // Supabase HTTP helper
    async supabaseRequest(endpoint, options = {}) {
      try {
        const url = `${window.SINA_CONFIG.SUPABASE_URL}/rest/v1/${endpoint}`;
        const headers = {
          'apikey': window.SINA_CONFIG.SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${window.SINA_CONFIG.SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': options.prefer || 'return=representation',
          ...options.headers
        };
        const response = await fetch(url, { ...options, headers });
        if (!response.ok) throw new Error(`Supabase error ${response.status}`);
        return await response.json();
      } catch (err) {
        return null;
      }
    }

    // 1. REPRESENTATIVES & PASSWORD MANAGEMENT
    async getRepresentatives() {
      const profiles = JSON.parse(localStorage.getItem('sina_profiles') || '[]');
      return profiles.filter(p => p.role === 'representative');
    }

    async getRepresentativeById(id) {
      const reps = await this.getRepresentatives();
      return reps.find(r => r.id === id);
    }

    async addRepresentative(data) {
      const profiles = JSON.parse(localStorage.getItem('sina_profiles') || '[]');
      const newRep = {
        id: 'rep_' + Date.now(),
        name: data.name.trim(),
        phone: data.phone.trim(),
        password_hash: data.password.trim(),
        role: 'representative',
        assigned_route: data.assigned_route ? data.assigned_route.trim() : 'General Territory',
        status: 'active',
        created_at: new Date().toISOString()
      };
      profiles.push(newRep);
      localStorage.setItem('sina_profiles', JSON.stringify(profiles));

      // Attempt Supabase insert
      this.supabaseRequest('profiles', {
        method: 'POST',
        body: JSON.stringify({
          name: newRep.name,
          phone: newRep.phone,
          password_hash: newRep.password_hash,
          role: 'representative',
          assigned_route: newRep.assigned_route,
          status: newRep.status
        })
      });

      return newRep;
    }

    async updateRepresentative(id, updateData) {
      const profiles = JSON.parse(localStorage.getItem('sina_profiles') || '[]');
      const index = profiles.findIndex(p => p.id === id);
      if (index !== -1) {
        profiles[index] = { ...profiles[index], ...updateData, updated_at: new Date().toISOString() };
        localStorage.setItem('sina_profiles', JSON.stringify(profiles));
        return profiles[index];
      }
      throw new Error('Representative not found.');
    }

    async updateRepresentativePassword(id, newPassword) {
      return this.updateRepresentative(id, { password_hash: newPassword.trim() });
    }

    // 2. CATEGORIES & PRODUCTS MASTER
    async getCategories() {
      return JSON.parse(localStorage.getItem('sina_categories') || '[]');
    }

    async addCategory(name) {
      const categories = await this.getCategories();
      const newCat = { id: 'c_' + Date.now(), name: name.trim() };
      categories.push(newCat);
      localStorage.setItem('sina_categories', JSON.stringify(categories));
      return newCat;
    }

    async getProducts() {
      return JSON.parse(localStorage.getItem('sina_products') || '[]');
    }

    async addProduct(product) {
      const products = await this.getProducts();
      const newProd = {
        id: 'p_' + Date.now(),
        category_id: product.category_id,
        name: product.name.trim(),
        type: product.type ? product.type.trim() : 'Standard',
        default_unit: product.default_unit || 'per_kg',
        default_rate: parseFloat(product.default_rate) || 0
      };
      products.push(newProd);
      localStorage.setItem('sina_products', JSON.stringify(products));
      return newProd;
    }

    async deleteProduct(id) {
      let products = await this.getProducts();
      products = products.filter(p => p.id !== id);
      localStorage.setItem('sina_products', JSON.stringify(products));
    }

    // 3. PROCUREMENT ENTRIES & APPROVALS
    async getProcurementEntries(repId = null) {
      const entries = JSON.parse(localStorage.getItem('sina_entries') || '[]');
      if (repId) {
        return entries.filter(e => e.representative_id === repId);
      }
      return entries;
    }

    async updateEntryStatus(entryId, newStatus) {
      const entries = JSON.parse(localStorage.getItem('sina_entries') || '[]');
      const target = entries.find(e => e.id === entryId);
      if (target) {
        target.status = newStatus;
        localStorage.setItem('sina_entries', JSON.stringify(entries));
      }
      return target;
    }

    // 4. CASH FLOATS & EXPENSES
    async getDailyFloats() {
      return JSON.parse(localStorage.getItem('sina_floats') || '[]');
    }

    async issueDailyFloat(repId, amount, notes) {
      const floats = await this.getDailyFloats();
      const today = new Date().toISOString().split('T')[0];
      const existing = floats.find(f => f.representative_id === repId && f.date === today);

      if (existing) {
        existing.float_amount = parseFloat(amount);
        existing.notes = notes;
      } else {
        floats.push({
          id: 'df_' + Date.now(),
          representative_id: repId,
          date: today,
          float_amount: parseFloat(amount),
          notes
        });
      }
      localStorage.setItem('sina_floats', JSON.stringify(floats));
    }

    async getExpenses(repId = null) {
      const expenses = JSON.parse(localStorage.getItem('sina_expenses') || '[]');
      if (repId) return expenses.filter(e => e.representative_id === repId);
      return expenses;
    }

    // 5. CONSOLIDATED ADMIN METRICS (Dual-View: All vs Particular Rep)
    async getAdminDashboardMetrics(repId = null) {
      const today = new Date().toISOString().split('T')[0];
      const allEntries = await this.getProcurementEntries(repId);
      const allExpenses = await this.getExpenses(repId);
      const allFloats = await this.getDailyFloats();

      const todayEntries = allEntries.filter(e => e.created_at.startsWith(today));
      const todayExpenses = allExpenses.filter(e => e.created_at.startsWith(today));

      let totalFloatDisbursed = 0;
      if (repId) {
        const repFloat = allFloats.find(f => f.representative_id === repId && f.date === today);
        totalFloatDisbursed = repFloat ? repFloat.float_amount : 15000.00;
      } else {
        totalFloatDisbursed = allFloats
          .filter(f => f.date === today)
          .reduce((acc, curr) => acc + (parseFloat(curr.float_amount) || 0), 0);
        if (totalFloatDisbursed === 0) totalFloatDisbursed = 25000.00; // default seed for multiple reps
      }

      const totalProcurement = todayEntries.reduce((acc, curr) => acc + (parseFloat(curr.total_amount) || 0), 0);
      const cashCollected = todayEntries.reduce((acc, curr) => acc + (parseFloat(curr.cash_amount) || 0), 0);
      const upiCollected = todayEntries.filter(e => e.payment_mode === 'upi').reduce((acc, curr) => acc + (parseFloat(curr.total_amount) || 0), 0);
      const bankTransferCollected = todayEntries.filter(e => e.payment_mode === 'bank_transfer').reduce((acc, curr) => acc + (parseFloat(curr.total_amount) || 0), 0);
      const totalExpenses = todayExpenses.reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);

      // Live net cash in field = Disbursed Float + Cash Collected - Expenses
      const netCashInHand = totalFloatDisbursed + cashCollected - totalExpenses;

      const pendingApprovalsCount = todayEntries.filter(e => e.status === 'pending_approval' || (e.payment_mode !== 'cash' && e.status !== 'verified')).length;

      return {
        todayVisitsCount: todayEntries.length,
        totalProcurement,
        totalFloatDisbursed,
        cashCollected,
        upiCollected,
        bankTransferCollected,
        totalExpenses,
        netCashInHand,
        pendingApprovalsCount,
        recentEntries: todayEntries,
        recentExpenses: todayExpenses
      };
    }

    // 6. RESET ALL DATA (Make it like starting new)
    async resetAllData() {
      // Clear entries, expenses, notifications
      localStorage.setItem('sina_entries', JSON.stringify([]));
      localStorage.setItem('sina_expenses', JSON.stringify([]));
      localStorage.setItem('sina_admin_notifications', JSON.stringify([]));

      // Reset daily floats to starting default
      const defaultFloats = [
        { id: 'df1', representative_id: '22222222-2222-2222-2222-222222222222', date: new Date().toISOString().split('T')[0], float_amount: 15000.00, notes: 'Morning procurement cash float' },
        { id: 'df2', representative_id: '33333333-3333-3333-3333-333333333333', date: new Date().toISOString().split('T')[0], float_amount: 10000.00, notes: 'South zone daily allowance' }
      ];
      localStorage.setItem('sina_floats', JSON.stringify(defaultFloats));

      // Reset representative profiles & passwords to defaults
      const defaultProfiles = [
        {
          id: '22222222-2222-2222-2222-222222222222',
          name: 'Rahul Sharma',
          phone: '9811223344',
          password_hash: 'rep123',
          role: 'representative',
          assigned_route: 'North Wholesale Market',
          status: 'active',
          created_at: new Date().toISOString()
        },
        {
          id: '33333333-3333-3333-3333-333333333333',
          name: 'Suresh Kumar',
          phone: '9822334455',
          password_hash: 'rep123',
          role: 'representative',
          assigned_route: 'South Industrial Zone',
          status: 'active',
          created_at: new Date().toISOString()
        },
        {
          id: '44444444-4444-4444-4444-444444444444',
          name: 'Amit Patel',
          phone: '9833445566',
          password_hash: 'rep123',
          role: 'representative',
          assigned_route: 'East Rural Mandi',
          status: 'active',
          created_at: new Date().toISOString()
        }
      ];
      localStorage.setItem('sina_profiles', JSON.stringify(defaultProfiles));

      // Reset firms to defaults
      const defaultFirms = [
        { id: 'f1', firm_name: 'Kishan Trading Co.', contact_person: 'Ramesh Kishan', mobile: '9876501234', address: 'Plot 42, APMC Mandi, Sector 19' },
        { id: 'f2', firm_name: 'Mahadev Agro Agency', contact_person: 'Mahesh Bhai', mobile: '9876502345', address: '12/A Grain Merchant Lane, Old City' },
        { id: 'f3', firm_name: 'Shree Balaji Enterprises', contact_person: 'Gopal Sharma', mobile: '9876503456', address: 'Shop 7, Main Wholesale Market' },
        { id: 'f4', firm_name: 'Om Sai Agro Foods', contact_person: 'Sunil Patil', mobile: '9876504567', address: 'Highway Bypass Mandi, Gate 2' },
        { id: 'f5', firm_name: 'Annapurna Grain Stores', contact_person: 'Dinesh Agarwal', mobile: '9876505678', address: 'Station Road, Near Central Warehouse' }
      ];
      localStorage.setItem('sina_firms', JSON.stringify(defaultFirms));

      // Broadcast reset event across channels to instantly sync SINA App
      if (this.channel) {
        try {
          this.channel.postMessage({ type: 'SYSTEM_RESET', timestamp: Date.now() });
        } catch (e) {}
      }
      localStorage.setItem('sina_last_event', JSON.stringify({ type: 'SYSTEM_RESET', timestamp: Date.now() }));
    }
  }

  window.sinaAdminDB = new SINA_AdminDB();
})();

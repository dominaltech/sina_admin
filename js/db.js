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

      if (data.type === 'PRODUCT_ADDED' && data.payload) {
        const products = JSON.parse(localStorage.getItem('sina_products') || '[]');
        if (!products.some(p => p.id === data.payload.id || (p.name.toLowerCase() === data.payload.name.toLowerCase() && p.type === data.payload.type))) {
          products.push(data.payload);
          localStorage.setItem('sina_products', JSON.stringify(products));
        }
      } else if (data.type === 'CATEGORY_ADDED' && data.payload) {
        const categories = JSON.parse(localStorage.getItem('sina_categories') || '[]');
        if (!categories.some(c => c.id === data.payload.id || c.name.toLowerCase() === data.payload.name.toLowerCase())) {
          categories.push(data.payload);
          localStorage.setItem('sina_categories', JSON.stringify(categories));
        }
      }

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

    broadcast(type, payload) {
      if (this.channel) {
        try {
          this.channel.postMessage({ type, payload, timestamp: Date.now() });
        } catch (e) {}
      }
      localStorage.setItem('sina_last_event', JSON.stringify({ type, payload, timestamp: Date.now() }));
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

    normalizeEntry(row) {
      const firstItem = (row.procurement_items && row.procurement_items.length > 0) ? row.procurement_items[0] : null;
      const images = (row.payment_attachments && Array.isArray(row.payment_attachments))
        ? row.payment_attachments.map(att => att.file_url)
        : (Array.isArray(row.images) ? row.images : []);

      const repName = row.profiles?.name || row.rep_name || 'Rahul Sharma';

      return {
        id: row.id,
        representative_id: row.representative_id,
        rep_name: repName,
        firm_id: row.firm_id,
        firm_name: row.firm_name,
        contact_person: row.contact_person,
        mobile: row.mobile,
        address: row.address,
        category_name: firstItem ? firstItem.category_name : (row.category_name || ''),
        type: firstItem ? (firstItem.product_name || firstItem.type) : (row.type || ''),
        quantity: firstItem ? parseFloat(firstItem.quantity) : (parseFloat(row.quantity) || 0),
        unit: firstItem ? firstItem.unit : (row.unit || 'per_kg'),
        rate: firstItem ? parseFloat(firstItem.rate) : (parseFloat(row.rate) || 0),
        total_amount: parseFloat(row.total_amount) || 0,
        payment_mode: row.payment_mode,
        cash_amount: parseFloat(row.cash_amount) || 0,
        upi_id: row.upi_id || '',
        upi_utr: row.upi_utr || '',
        images: images,
        status: row.status,
        created_at: row.created_at,
        items: row.procurement_items || []
      };
    }

    // 1. REPRESENTATIVES & PASSWORD MANAGEMENT
    async getRepresentatives() {
      const remote = await this.supabaseRequest('profiles?role=eq.representative&order=created_at.asc');
      if (remote && Array.isArray(remote) && remote.length > 0) {
        localStorage.setItem('sina_profiles', JSON.stringify(remote));
        return remote;
      }
      const profiles = JSON.parse(localStorage.getItem('sina_profiles') || '[]');
      return profiles.filter(p => p.role === 'representative');
    }

    async getRepresentativeById(id) {
      const remote = await this.supabaseRequest(`profiles?id=eq.${id}&select=*`);
      if (remote && Array.isArray(remote) && remote.length > 0) {
        return remote[0];
      }
      const reps = await this.getRepresentatives();
      return reps.find(r => r.id === id);
    }

    async addRepresentative(data) {
      const payload = {
        name: data.name.trim(),
        phone: data.phone.trim(),
        password_hash: data.password.trim(),
        role: 'representative',
        assigned_route: data.assigned_route ? data.assigned_route.trim() : 'General Territory',
        status: 'active'
      };

      const remote = await this.supabaseRequest('profiles', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      const newRep = (remote && Array.isArray(remote) && remote[0]) ? remote[0] : {
        id: 'rep_' + Date.now(),
        ...payload,
        created_at: new Date().toISOString()
      };

      const profiles = JSON.parse(localStorage.getItem('sina_profiles') || '[]');
      profiles.push(newRep);
      localStorage.setItem('sina_profiles', JSON.stringify(profiles));

      return newRep;
    }

    async updateRepresentative(id, updateData) {
      // Supabase update
      await this.supabaseRequest(`profiles?id=eq.${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ ...updateData, updated_at: new Date().toISOString() })
      });

      const profiles = JSON.parse(localStorage.getItem('sina_profiles') || '[]');
      const index = profiles.findIndex(p => p.id === id);
      if (index !== -1) {
        profiles[index] = { ...profiles[index], ...updateData, updated_at: new Date().toISOString() };
        localStorage.setItem('sina_profiles', JSON.stringify(profiles));
        return profiles[index];
      }
      return updateData;
    }

    async updateRepresentativePassword(id, newPassword) {
      const trimmed = newPassword.trim();
      return this.updateRepresentative(id, { password_hash: trimmed });
    }

    // 2. CATEGORIES & PRODUCTS MASTER
    async getCategories() {
      const remote = await this.supabaseRequest('categories?select=*&order=name.asc');
      if (remote && Array.isArray(remote) && remote.length > 0) {
        localStorage.setItem('sina_categories', JSON.stringify(remote));
        return remote;
      }
      return JSON.parse(localStorage.getItem('sina_categories') || '[]');
    }

    async addCategory(name) {
      const categories = await this.getCategories();
      const existing = categories.find(c => c.name.toLowerCase() === name.trim().toLowerCase());
      if (existing) return existing;

      const newCat = { id: 'c_' + Date.now(), name: name.trim() };
      categories.push(newCat);
      localStorage.setItem('sina_categories', JSON.stringify(categories));

      this.supabaseRequest('categories', {
        method: 'POST',
        body: JSON.stringify({ name: newCat.name })
      });

      this.broadcast('CATEGORY_ADDED', newCat);
      return newCat;
    }

    async getProducts() {
      const remote = await this.supabaseRequest('products?select=*&is_active=eq.true&order=name.asc');
      if (remote && Array.isArray(remote) && remote.length > 0) {
        localStorage.setItem('sina_products', JSON.stringify(remote));
        return remote;
      }
      return JSON.parse(localStorage.getItem('sina_products') || '[]');
    }

    async addProduct(product) {
      const products = await this.getProducts();
      const newProd = {
        id: 'p_' + Date.now(),
        category_id: product.category_id || 'c1',
        name: product.name.trim(),
        type: product.type ? product.type.trim() : 'Standard',
        default_unit: product.default_unit || 'per_kg',
        default_rate: parseFloat(product.default_rate) || 0
      };
      products.push(newProd);
      localStorage.setItem('sina_products', JSON.stringify(products));

      this.supabaseRequest('products', {
        method: 'POST',
        body: JSON.stringify({
          category_id: newProd.category_id,
          name: newProd.name,
          type: newProd.type,
          default_unit: newProd.default_unit,
          default_rate: newProd.default_rate
        })
      });

      this.broadcast('PRODUCT_ADDED', newProd);
      return newProd;
    }

    async deleteProduct(id) {
      let products = await this.getProducts();
      products = products.filter(p => p.id !== id);
      localStorage.setItem('sina_products', JSON.stringify(products));

      this.supabaseRequest(`products?id=eq.${id}`, {
        method: 'DELETE'
      });

      this.broadcast('PRODUCT_DELETED', { id });
    }

    // 3. PROCUREMENT ENTRIES & APPROVALS
    async getProcurementEntries(repId = null) {
      let query = 'procurement_entries?select=*,procurement_items(*),payment_attachments(*),profiles(name,phone)&order=created_at.desc';
      if (repId) {
        query += `&representative_id=eq.${repId}`;
      }
      const remote = await this.supabaseRequest(query);
      if (remote && Array.isArray(remote)) {
        const normalized = remote.map(row => this.normalizeEntry(row));
        localStorage.setItem('sina_entries', JSON.stringify(normalized));
        return normalized;
      }
      const entries = JSON.parse(localStorage.getItem('sina_entries') || '[]');
      if (repId) {
        return entries.filter(e => e.representative_id === repId);
      }
      return entries;
    }

    async updateEntryStatus(entryId, newStatus) {
      // Update local cache
      const entries = JSON.parse(localStorage.getItem('sina_entries') || '[]');
      const target = entries.find(e => e.id === entryId);
      if (target) {
        target.status = newStatus;
        localStorage.setItem('sina_entries', JSON.stringify(entries));
      }

      // Update Supabase
      await this.supabaseRequest(`procurement_entries?id=eq.${entryId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus, updated_at: new Date().toISOString() })
      });

      this.broadcast('ENTRY_STATUS_UPDATED', { entryId, status: newStatus });
      return target;
    }

    // 3b. FIRMS DIRECTORY & REPRESENTATIVE SPENDING SUMMARY
    async getFirmsSummary() {
      const entries = await this.getProcurementEntries();
      const savedFirms = JSON.parse(localStorage.getItem('sina_firms') || '[]');
      const firmsMap = new Map();

      // Initialize with known registered firms
      savedFirms.forEach(f => {
        const key = f.firm_name.trim().toLowerCase();
        firmsMap.set(key, {
          id: f.id || 'f_' + Math.random().toString(36).substr(2, 9),
          firm_name: f.firm_name.trim(),
          contact_person: f.contact_person || '',
          mobile: f.mobile || '',
          address: f.address || '',
          total_visits: 0,
          total_spent: 0,
          last_visited: null,
          visits: []
        });
      });

      // Aggregate procurement entries per firm
      entries.forEach(entry => {
        const firmName = (entry.firm_name || 'Unnamed Firm').trim();
        const key = firmName.toLowerCase();

        let firm = firmsMap.get(key);
        if (!firm) {
          firm = {
            id: entry.firm_id || 'f_' + Math.random().toString(36).substr(2, 9),
            firm_name: firmName,
            contact_person: entry.contact_person || '',
            mobile: entry.mobile || '',
            address: entry.address || '',
            total_visits: 0,
            total_spent: 0,
            last_visited: null,
            visits: []
          };
          firmsMap.set(key, firm);
        }

        if (entry.contact_person && !firm.contact_person) firm.contact_person = entry.contact_person;
        if (entry.mobile && !firm.mobile) firm.mobile = entry.mobile;
        if (entry.address && !firm.address) firm.address = entry.address;

        const amount = parseFloat(entry.total_amount || 0);
        firm.total_visits += 1;
        firm.total_spent += amount;

        const visitTime = new Date(entry.created_at).getTime();
        if (!firm.last_visited || visitTime > new Date(firm.last_visited).getTime()) {
          firm.last_visited = entry.created_at;
        }

        firm.visits.push({
          id: entry.id,
          rep_id: entry.representative_id,
          rep_name: entry.rep_name || 'Rahul Sharma',
          created_at: entry.created_at,
          amount: amount,
          item_name: entry.type || entry.category_name || 'Goods',
          quantity: entry.quantity,
          unit: entry.unit,
          rate: entry.rate,
          payment_mode: entry.payment_mode || 'cash',
          status: entry.status || 'completed'
        });
      });

      const result = Array.from(firmsMap.values());
      result.forEach(f => {
        f.visits.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      });

      result.sort((a, b) => b.total_spent - a.total_spent);
      return result;
    }

    // 4. CASH FLOATS & EXPENSES
    async getDailyFloats() {
      const remote = await this.supabaseRequest('daily_floats?select=*&order=date.desc');
      if (remote && Array.isArray(remote)) {
        localStorage.setItem('sina_floats', JSON.stringify(remote));
        return remote;
      }
      return JSON.parse(localStorage.getItem('sina_floats') || '[]');
    }

    async issueDailyFloat(repId, amount, notes, date = null) {
      const targetDate = date ? String(date).trim() : new Date().toISOString().split('T')[0];
      const parsedAmount = parseFloat(amount) || 0;

      // Attempt Supabase upsert with explicit on_conflict param
      const remote = await this.supabaseRequest('daily_floats?on_conflict=representative_id,date', {
        method: 'POST',
        headers: {
          'Prefer': 'resolution=merge-duplicates,return=representation'
        },
        body: JSON.stringify({
          representative_id: repId,
          float_amount: parsedAmount,
          notes: notes || 'Daily cash given for field operations',
          date: targetDate
        })
      });

      const floatRecord = (remote && Array.isArray(remote) && remote[0]) ? remote[0] : {
        id: 'df_' + Date.now(),
        representative_id: repId,
        date: targetDate,
        float_amount: parsedAmount,
        notes: notes || 'Daily cash given for field operations'
      };

      const floats = await this.getDailyFloats();
      const existingIndex = floats.findIndex(f => f.representative_id === repId && f.date === targetDate);
      if (existingIndex !== -1) {
        floats[existingIndex] = floatRecord;
      } else {
        floats.unshift(floatRecord);
      }
      localStorage.setItem('sina_floats', JSON.stringify(floats));

      // Broadcast FLOAT_UPDATED in real time to SINA App
      const payload = { representative_id: repId, float_amount: parsedAmount, date: targetDate, notes };
      if (this.channel) {
        try {
          this.channel.postMessage({ type: 'FLOAT_UPDATED', payload, timestamp: Date.now() });
        } catch (e) {}
      }
      localStorage.setItem('sina_last_event', JSON.stringify({ type: 'FLOAT_UPDATED', payload, timestamp: Date.now() }));

      return floatRecord;
    }

    async getDailyFloatsByRep(repId) {
      const remote = await this.supabaseRequest(`daily_floats?representative_id=eq.${repId}&order=date.desc`);
      if (remote && Array.isArray(remote)) {
        return remote;
      }
      const floats = JSON.parse(localStorage.getItem('sina_floats') || '[]');
      return floats.filter(f => f.representative_id === repId).sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    async getExpenses(repId = null) {
      let query = 'expenses?select=*&order=created_at.desc';
      if (repId) query += `&representative_id=eq.${repId}`;
      const remote = await this.supabaseRequest(query);
      if (remote && Array.isArray(remote)) {
        localStorage.setItem('sina_expenses', JSON.stringify(remote));
        return remote;
      }
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

      const todayEntries = allEntries.filter(e => e.created_at && e.created_at.startsWith(today));
      const todayExpenses = allExpenses.filter(e => e.created_at && e.created_at.startsWith(today));

      // 1. Total Cash Given Overall (All-time)
      let totalCashGivenOverall = 0;
      if (repId) {
        totalCashGivenOverall = allFloats
          .filter(f => f.representative_id === repId)
          .reduce((acc, curr) => acc + (parseFloat(curr.float_amount) || 0), 0);
      } else {
        totalCashGivenOverall = allFloats
          .reduce((acc, curr) => acc + (parseFloat(curr.float_amount) || 0), 0);
      }

      // 2. Total Cash Given Today
      let totalCashGivenToday = 0;
      if (repId) {
        const repFloat = allFloats.find(f => f.representative_id === repId && f.date === today);
        totalCashGivenToday = repFloat ? (parseFloat(repFloat.float_amount) || 0) : 15000.00;
      } else {
        totalCashGivenToday = allFloats
          .filter(f => f.date === today)
          .reduce((acc, curr) => acc + (parseFloat(curr.float_amount) || 0), 0);
        if (totalCashGivenToday === 0) totalCashGivenToday = 25000.00; // default initial float seed
      }

      const totalProcurement = todayEntries.reduce((acc, curr) => acc + (parseFloat(curr.total_amount) || 0), 0);
      const todayCashSpent = todayEntries.filter(e => e.payment_mode === 'cash').reduce((acc, curr) => acc + (parseFloat(curr.total_amount) || 0), 0);
      const upiCollected = todayEntries.filter(e => e.payment_mode === 'upi').reduce((acc, curr) => acc + (parseFloat(curr.total_amount) || 0), 0);
      const bankTransferCollected = todayEntries.filter(e => e.payment_mode === 'bank_transfer').reduce((acc, curr) => acc + (parseFloat(curr.total_amount) || 0), 0);
      const totalExpenses = todayExpenses.reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);

      // Remaining cash in hand = Cash Given Today - Cash Purchases Spent - Expenses Spent
      const netCashInHand = Math.max(0, totalCashGivenToday - todayCashSpent - totalExpenses);

      const pendingApprovalsCount = todayEntries.filter(e => e.status === 'pending_approval' || e.status === 'pending' || (e.payment_mode !== 'cash' && e.status !== 'verified')).length;

      return {
        todayVisitsCount: todayEntries.length,
        totalProcurement,
        totalCashGivenOverall,
        totalCashGivenToday,
        totalFloatDisbursed: totalCashGivenToday, // backwards compatibility
        todayCashSpent,
        upiCollected,
        bankTransferCollected,
        totalExpenses,
        netCashInHand,
        pendingApprovalsCount,
        recentEntries: (allEntries && allEntries.length > 0) ? allEntries.slice(0, 50) : todayEntries,
        recentExpenses: (allExpenses && allExpenses.length > 0) ? allExpenses.slice(0, 50) : todayExpenses
      };
    }

    // 5b. REPRESENTATIVE PURCHASES & CASH FOR SPECIFIC DATE (Calendar-driven)
    async getRepPurchasesAndCashForDate(repId, targetDate) {
      if (!targetDate) targetDate = new Date().toISOString().split('T')[0];
      const allEntries = await this.getProcurementEntries(repId);
      const allExpenses = await this.getExpenses(repId);
      const allFloats = await this.getDailyFloats();

      const dayEntries = allEntries.filter(e => e.created_at && e.created_at.startsWith(targetDate));
      const dayExpenses = allExpenses.filter(e => e.created_at && e.created_at.startsWith(targetDate));

      const floatRecord = allFloats.find(f => f.representative_id === repId && f.date === targetDate);
      const cashGiven = floatRecord ? (parseFloat(floatRecord.float_amount) || 0) : 0;
      const notes = floatRecord ? (floatRecord.notes || '') : '';

      const totalProcurement = dayEntries.reduce((acc, curr) => acc + (parseFloat(curr.total_amount) || 0), 0);
      const cashSpent = dayEntries.filter(e => e.payment_mode === 'cash').reduce((acc, curr) => acc + (parseFloat(curr.total_amount) || 0), 0);
      const upiSpent = dayEntries.filter(e => e.payment_mode === 'upi').reduce((acc, curr) => acc + (parseFloat(curr.total_amount) || 0), 0);
      const bankSpent = dayEntries.filter(e => e.payment_mode === 'bank_transfer').reduce((acc, curr) => acc + (parseFloat(curr.total_amount) || 0), 0);
      const totalExpenses = dayExpenses.reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);

      const netCashBalance = Math.max(0, cashGiven - cashSpent - totalExpenses);

      return {
        date: targetDate,
        cashGiven,
        notes,
        hasFloatRecord: !!floatRecord,
        entries: dayEntries,
        expenses: dayExpenses,
        totalVisits: dayEntries.length,
        totalProcurement,
        cashSpent,
        upiSpent,
        bankSpent,
        totalExpenses,
        netCashBalance
      };
    }

    // 5c. GET ALL PURCHASES WITH MULTI-CRITERIA FILTERS
    async getAllPurchases(filters = {}) {
      const allEntries = await this.getProcurementEntries();
      let results = allEntries;

      // Filter by Date (YYYY-MM-DD)
      if (filters.date) {
        results = results.filter(e => e.created_at && e.created_at.startsWith(filters.date));
      }

      // Filter by Representative
      if (filters.repId) {
        results = results.filter(e => e.representative_id === filters.repId);
      }

      // Filter by Payment Mode
      if (filters.paymentMode && filters.paymentMode !== 'all') {
        results = results.filter(e => (e.payment_mode || 'cash').toLowerCase() === filters.paymentMode.toLowerCase());
      }

      // Filter by Search Query
      if (filters.search && filters.search.trim() !== '') {
        const q = filters.search.trim().toLowerCase();
        results = results.filter(e => {
          const firm = (e.firm_name || '').toLowerCase();
          const rep = (e.rep_name || '').toLowerCase();
          const contact = (e.contact_person || '').toLowerCase();
          const item = (e.type || e.category_name || '').toLowerCase();
          const mobile = (e.mobile || '').toLowerCase();
          const addr = (e.address || '').toLowerCase();
          return firm.includes(q) || rep.includes(q) || contact.includes(q) || item.includes(q) || mobile.includes(q) || addr.includes(q);
        });
      }

      return results.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
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

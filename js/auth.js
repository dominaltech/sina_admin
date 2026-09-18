// SINA Admin - Admin Authentication & Session Management
(function() {
  const DEFAULT_ADMIN = {
    id: '11111111-1111-1111-1111-111111111111',
    name: 'SINA Operations Admin',
    email: 'admin@sina.com',
    role: 'admin'
  };

  class SINA_AdminAuth {
    getCurrentAdmin() {
      const stored = localStorage.getItem('sina_current_admin');
      if (stored) {
        try { return JSON.parse(stored); } catch (e) { return DEFAULT_ADMIN; }
      }
      return null;
    }

    requireAdmin() {
      const admin = this.getCurrentAdmin();
      const isLoginPage = window.location.pathname.endsWith('login.html');
      if (!admin && !isLoginPage) {
        window.location.href = 'login.html';
      }
      return admin;
    }

    async login(email, password) {
      const cleanEmail = email.trim().toLowerCase();
      const cleanPass = password.trim();

      if ((cleanEmail === 'admin@sina.com' || cleanEmail === 'admin') && cleanPass === 'admin123') {
        localStorage.setItem('sina_current_admin', JSON.stringify(DEFAULT_ADMIN));
        return DEFAULT_ADMIN;
      }

      throw new Error('Invalid Admin credentials. Use admin@sina.com / admin123');
    }

    logout() {
      localStorage.removeItem('sina_current_admin');
      window.location.href = 'login.html';
    }
  }

  window.sinaAdminAuth = new SINA_AdminAuth();
})();

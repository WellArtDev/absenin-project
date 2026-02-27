const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

class ApiClient {
  constructor() { this.baseUrl = API_URL; }
  getToken() { if (typeof window !== 'undefined') return localStorage.getItem('absenin_token'); return null; }
  setToken(t) { if (typeof window !== 'undefined') localStorage.setItem('absenin_token', t); }
  removeToken() { if (typeof window !== 'undefined') { localStorage.removeItem('absenin_token'); localStorage.removeItem('absenin_user'); } }
  getUser() { if (typeof window !== 'undefined') { const u = localStorage.getItem('absenin_user'); return u ? JSON.parse(u) : null; } return null; }
  setUser(u) { if (typeof window !== 'undefined') localStorage.setItem('absenin_user', JSON.stringify(u)); }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const token = this.getToken();
    const config = { headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }), ...options.headers }, ...options };
    try {
      const response = await fetch(url, config);
      const data = await response.json();
      if (response.status === 401) { this.removeToken(); if (typeof window !== 'undefined') window.location.href = '/login'; throw new Error('Sesi berakhir.'); }
      if (!response.ok) throw new Error(data.message || 'Error');
      return data;
    } catch (error) {
      if (error.name === 'TypeError' && error.message === 'Failed to fetch') throw new Error('Server tidak terhubung.');
      throw error;
    }
  }

  // Auth
  async register(data) { const r = await this.request('/api/auth/register', { method: 'POST', body: JSON.stringify(data) }); if (r.success) { this.setToken(r.data.token); this.setUser(r.data.user); } return r; }
  async login(email, pw) { const r = await this.request('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password: pw }) }); if (r.success) { this.setToken(r.data.token); this.setUser(r.data.user); } return r; }
  async getMe() { return this.request('/api/auth/me'); }
  logout() { this.removeToken(); if (typeof window !== 'undefined') window.location.href = '/login'; }

  // Employees
  async getEmployees(p = {}) { return this.request(`/api/employees?${new URLSearchParams(p)}`); }
  async getEmployee(id) { return this.request(`/api/employees/${id}`); }
  async createEmployee(d) { return this.request('/api/employees', { method: 'POST', body: JSON.stringify(d) }); }
  async updateEmployee(id, d) { return this.request(`/api/employees/${id}`, { method: 'PUT', body: JSON.stringify(d) }); }
  async deleteEmployee(id) { return this.request(`/api/employees/${id}`, { method: 'DELETE' }); }

  // Divisions & Positions
  async getDivisions() { return this.request('/api/divisions'); }
  async createDivision(d) { return this.request('/api/divisions', { method: 'POST', body: JSON.stringify(d) }); }
  async updateDivision(id, d) { return this.request(`/api/divisions/${id}`, { method: 'PUT', body: JSON.stringify(d) }); }
  async deleteDivision(id) { return this.request(`/api/divisions/${id}`, { method: 'DELETE' }); }
  async getPositions(p = {}) { return this.request(`/api/positions?${new URLSearchParams(p)}`); }
  async createPosition(d) { return this.request('/api/positions', { method: 'POST', body: JSON.stringify(d) }); }
  async updatePosition(id, d) { return this.request(`/api/positions/${id}`, { method: 'PUT', body: JSON.stringify(d) }); }
  async deletePosition(id) { return this.request(`/api/positions/${id}`, { method: 'DELETE' }); }

  // Analytics & Reports
  async getAnalytics() { return this.request('/api/analytics'); }
  async getAttendance(p = {}) { return this.request(`/api/analytics/attendance?${new URLSearchParams(p)}`); }
  async getMonthlyReport(m, y) { return this.request(`/api/reports/monthly?month=${m}&year=${y}`); }
  async getDailyReport(date) { return this.request(`/api/reports/daily?date=${date}`); }

  // Overtime
  async getOvertime(p = {}) { return this.request(`/api/overtime?${new URLSearchParams(p)}`); }
  async getOvertimeSummary(m, y) { return this.request(`/api/overtime/summary?month=${m}&year=${y}`); }
  async approveOvertime(id) { return this.request(`/api/overtime/${id}/approve`, { method: 'PUT' }); }
  async rejectOvertime(id, note) { return this.request(`/api/overtime/${id}/reject`, { method: 'PUT', body: JSON.stringify({ note }) }); }

  // Leaves
  async getLeaves(p = {}) { return this.request(`/api/leaves?${new URLSearchParams(p)}`); }
  async createLeave(d) { return this.request('/api/leaves', { method: 'POST', body: JSON.stringify(d) }); }
  async approveLeave(id) { return this.request(`/api/leaves/${id}/approve`, { method: 'PUT' }); }
  async rejectLeave(id, note) { return this.request(`/api/leaves/${id}/reject`, { method: 'PUT', body: JSON.stringify({ note }) }); }

  // Settings
  async getSettings() { return this.request('/api/settings'); }
  async updateSettings(d) { return this.request('/api/settings', { method: 'PUT', body: JSON.stringify(d) }); }
  async testWA() { return this.request('/api/settings/test-wa', { method: 'POST' }); }

  // Payment
  async getPlans() { return this.request('/api/payment/plans'); }
  async getBanks() { return this.request('/api/payment/banks'); }
  async createPayment(d) { return this.request('/api/payment', { method: 'POST', body: JSON.stringify(d) }); }
  async confirmTransfer(id, d) { return this.request(`/api/payment/${id}/confirm-transfer`, { method: 'PUT', body: JSON.stringify(d) }); }
  async getMyPayments() { return this.request('/api/payment/my'); }

  // Superadmin
  async getSADashboard() { return this.request('/api/superadmin/dashboard'); }
  async getSACompanies(p = {}) { return this.request(`/api/superadmin/companies?${new URLSearchParams(p)}`); }
  async updateSACompany(id, d) { return this.request(`/api/superadmin/companies/${id}`, { method: 'PUT', body: JSON.stringify(d) }); }
  async getSAPlans() { return this.request('/api/superadmin/plans'); }
  async createSAPlan(d) { return this.request('/api/superadmin/plans', { method: 'POST', body: JSON.stringify(d) }); }
  async updateSAPlan(id, d) { return this.request(`/api/superadmin/plans/${id}`, { method: 'PUT', body: JSON.stringify(d) }); }
  async deleteSAPlan(id) { return this.request(`/api/superadmin/plans/${id}`, { method: 'DELETE' }); }
  async getSABanks() { return this.request('/api/superadmin/banks'); }
  async createSABank(d) { return this.request('/api/superadmin/banks', { method: 'POST', body: JSON.stringify(d) }); }
  async updateSABank(id, d) { return this.request(`/api/superadmin/banks/${id}`, { method: 'PUT', body: JSON.stringify(d) }); }
  async deleteSABank(id) { return this.request(`/api/superadmin/banks/${id}`, { method: 'DELETE' }); }
  async getSAPayments(p = {}) { return this.request(`/api/superadmin/payments?${new URLSearchParams(p)}`); }
  async confirmSAPayment(id) { return this.request(`/api/superadmin/payments/${id}/confirm`, { method: 'PUT' }); }
  async rejectSAPayment(id, reason) { return this.request(`/api/superadmin/payments/${id}/reject`, { method: 'PUT', body: JSON.stringify({ reason }) }); }

  async exportCSV(sd, ed) {
    const token = this.getToken();
    const r = await fetch(`${this.baseUrl}/api/reports/export?start_date=${sd}&end_date=${ed}&format=csv`, { headers: { Authorization: `Bearer ${token}` } });
    const blob = await r.blob(); const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `absensi_${sd}_${ed}.csv`; a.click(); window.URL.revokeObjectURL(url);
  }
}

const api = new ApiClient();
export default api;

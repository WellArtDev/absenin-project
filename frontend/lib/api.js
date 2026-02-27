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
      if (!response.ok) throw new Error(data.message || 'Request failed');
      return data;
    } catch (error) {
      if (error.name === 'TypeError' && error.message === 'Failed to fetch') throw new Error('Server tidak terhubung.');
      throw error;
    }
  }
  async register(d) { const r = await this.request('/api/auth/register', { method: 'POST', body: JSON.stringify(d) }); if (r.success) { this.setToken(r.data.token); this.setUser(r.data.user); } return r; }
  async login(e, p) { const r = await this.request('/api/auth/login', { method: 'POST', body: JSON.stringify({ email: e, password: p }) }); if (r.success) { this.setToken(r.data.token); this.setUser(r.data.user); } return r; }
  async getMe() { return this.request('/api/auth/me'); }
  logout() { this.removeToken(); if (typeof window !== 'undefined') window.location.href = '/login'; }
  async getEmployees(p={}) { return this.request(`/api/employees?${new URLSearchParams(p)}`); }
  async getEmployee(id) { return this.request(`/api/employees/${id}`); }
  async createEmployee(d) { return this.request('/api/employees', { method: 'POST', body: JSON.stringify(d) }); }
  async updateEmployee(id, d) { return this.request(`/api/employees/${id}`, { method: 'PUT', body: JSON.stringify(d) }); }
  async deleteEmployee(id) { return this.request(`/api/employees/${id}`, { method: 'DELETE' }); }
  async getDivisions() { return this.request('/api/divisions'); }
  async createDivision(d) { return this.request('/api/divisions', { method: 'POST', body: JSON.stringify(d) }); }
  async updateDivision(id, d) { return this.request(`/api/divisions/${id}`, { method: 'PUT', body: JSON.stringify(d) }); }
  async deleteDivision(id) { return this.request(`/api/divisions/${id}`, { method: 'DELETE' }); }
  async getPositions(p={}) { return this.request(`/api/positions?${new URLSearchParams(p)}`); }
  async createPosition(d) { return this.request('/api/positions', { method: 'POST', body: JSON.stringify(d) }); }
  async updatePosition(id, d) { return this.request(`/api/positions/${id}`, { method: 'PUT', body: JSON.stringify(d) }); }
  async deletePosition(id) { return this.request(`/api/positions/${id}`, { method: 'DELETE' }); }
  async getAnalytics() { return this.request('/api/analytics'); }
  async getAttendance(p={}) { return this.request(`/api/analytics/attendance?${new URLSearchParams(p)}`); }
  async getMonthlyReport(m, y) { return this.request(`/api/reports/monthly?month=${m}&year=${y}`); }
  async getDailyReport(d) { return this.request(`/api/reports/daily?date=${d}`); }
  async getOvertime(p={}) { return this.request(`/api/overtime?${new URLSearchParams(p)}`); }
  async getOvertimeSummary(m, y) { return this.request(`/api/overtime/summary?month=${m}&year=${y}`); }
  async approveOvertime(id) { return this.request(`/api/overtime/${id}/approve`, { method: 'PUT' }); }
  async rejectOvertime(id, n) { return this.request(`/api/overtime/${id}/reject`, { method: 'PUT', body: JSON.stringify({ note: n }) }); }
  async getLeaves(p={}) { return this.request(`/api/leaves?${new URLSearchParams(p)}`); }
  async createLeave(d) { return this.request('/api/leaves', { method: 'POST', body: JSON.stringify(d) }); }
  async approveLeave(id) { return this.request(`/api/leaves/${id}/approve`, { method: 'PUT' }); }
  async rejectLeave(id, n) { return this.request(`/api/leaves/${id}/reject`, { method: 'PUT', body: JSON.stringify({ note: n }) }); }
  async getSettings() { return this.request('/api/settings'); }
  async updateSettings(d) { return this.request('/api/settings', { method: 'PUT', body: JSON.stringify(d) }); }
  async testWA() { return this.request('/api/settings/test-wa', { method: 'POST' }); }
  async getPlans() { return this.request('/api/payment/plans'); }
  async getBanks() { return this.request('/api/payment/banks'); }
  async createPayment(d) { return this.request('/api/payment', { method: 'POST', body: JSON.stringify(d) }); }
  async confirmTransfer(id, d) { return this.request(`/api/payment/${id}/confirm-transfer`, { method: 'PUT', body: JSON.stringify(d) }); }
  async getMyPayments() { return this.request('/api/payment/my'); }
  async getSADashboard() { return this.request('/api/superadmin/dashboard'); }
  async getSACompanies(p={}) { return this.request(`/api/superadmin/companies?${new URLSearchParams(p)}`); }
  async getSACompany(id) { return this.request(`/api/superadmin/companies/${id}`); }
  async createSACompany(d) { return this.request('/api/superadmin/companies', { method: 'POST', body: JSON.stringify(d) }); }
  async updateSACompany(id, d) { return this.request(`/api/superadmin/companies/${id}`, { method: 'PUT', body: JSON.stringify(d) }); }
  async deleteSACompany(id) { return this.request(`/api/superadmin/companies/${id}`, { method: 'DELETE' }); }
  async testSACompanyWA(id, d) { return this.request(`/api/superadmin/companies/${id}/test-wa`, { method: 'POST', body: JSON.stringify(d) }); }
  async getSAUsers(p={}) { return this.request(`/api/superadmin/users?${new URLSearchParams(p)}`); }
  async changeSAUserPassword(id, pw) { return this.request(`/api/superadmin/users/${id}/password`, { method: 'PUT', body: JSON.stringify({ new_password: pw }) }); }
  async toggleSAUser(id) { return this.request(`/api/superadmin/users/${id}/toggle`, { method: 'PUT' }); }
  async getSAPlans() { return this.request('/api/superadmin/plans'); }
  async createSAPlan(d) { return this.request('/api/superadmin/plans', { method: 'POST', body: JSON.stringify(d) }); }
  async deleteSAPlan(id) { return this.request(`/api/superadmin/plans/${id}`, { method: 'DELETE' }); }
  async getSABanks() { return this.request('/api/superadmin/banks'); }
  async createSABank(d) { return this.request('/api/superadmin/banks', { method: 'POST', body: JSON.stringify(d) }); }
  async deleteSABank(id) { return this.request(`/api/superadmin/banks/${id}`, { method: 'DELETE' }); }
  async getSAPayments(p={}) { return this.request(`/api/superadmin/payments?${new URLSearchParams(p)}`); }
  async confirmSAPayment(id) { return this.request(`/api/superadmin/payments/${id}/confirm`, { method: 'PUT' }); }
  async rejectSAPayment(id, r) { return this.request(`/api/superadmin/payments/${id}/reject`, { method: 'PUT', body: JSON.stringify({ reason: r }) }); }
  async exportCSV(sd, ed) { const t = this.getToken(); const r = await fetch(`${this.baseUrl}/api/reports/export?start_date=${sd}&end_date=${ed}&format=csv`, { headers: { Authorization: `Bearer ${t}` } }); const b = await r.blob(); const u = window.URL.createObjectURL(b); const a = document.createElement('a'); a.href = u; a.download = `absensi_${sd}_${ed}.csv`; a.click(); }
}
const api = new ApiClient();
export default api;

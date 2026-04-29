window.authApi = {
  async _post(path, body) {
    const res = await fetch('/api/auth' + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: body ? JSON.stringify(body) : undefined
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'فشل الطلب');
    return data;
  },
  async _get(path) {
    const res = await fetch('/api/auth' + path, { credentials: 'same-origin' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'فشل الطلب');
    return data;
  },
  register(payload) { return this._post('/register', payload); },
  login(email, password) { return this._post('/login', { email, password }); },
  logout() { return this._post('/logout'); },
  me() { return this._get('/me'); },
  ensureTestAccount(payload) { return this._post('/ensure-test-account', payload); }
};

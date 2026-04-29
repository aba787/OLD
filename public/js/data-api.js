window.dataApi = {
  async _request(method, path, body) {
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin'
    };
    if (body !== undefined) opts.body = JSON.stringify(body);
    const res = await fetch('/api/data' + path, opts);
    if (!res.ok) {
      const txt = await res.text().catch(() => 'request failed');
      throw new Error(txt || ('HTTP ' + res.status));
    }
    return res.json();
  },

  list(collection) {
    return this._request('GET', '/' + collection);
  },

  get(collection, id) {
    return this._request('GET', '/' + collection + '/' + encodeURIComponent(id));
  },

  save(collection, data) {
    return this._request('POST', '/' + collection, data);
  },

  update(collection, id, data) {
    return this._request('PATCH', '/' + collection + '/' + encodeURIComponent(id), data);
  },

  remove(collection, id) {
    return this._request('DELETE', '/' + collection + '/' + encodeURIComponent(id));
  },

  arrayAdd(collection, id, field, value) {
    return this._request('POST', '/' + collection + '/' + encodeURIComponent(id) + '/array-add', { field, value });
  },

  arrayRemove(collection, id, field, value) {
    return this._request('POST', '/' + collection + '/' + encodeURIComponent(id) + '/array-remove', { field, value });
  }
};

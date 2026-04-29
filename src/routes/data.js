const express = require('express');
const store = require('../store');

const router = express.Router();

const VALID_COLLECTIONS = ['users', 'volunteer_profiles', 'elder_profiles', 'organizations', 'requests', 'complaints'];

function checkCol(req, res) {
  const col = req.params.col;
  if (!VALID_COLLECTIONS.includes(col)) {
    res.status(400).json({ error: 'Invalid collection' });
    return null;
  }
  return col;
}

router.get('/all', (req, res) => {
  res.json(store.getAll());
});

router.get('/:col', (req, res) => {
  const col = checkCol(req, res);
  if (!col) return;
  const items = store.getCollection(col);
  res.json(Object.values(items));
});

router.get('/:col/:id', (req, res) => {
  const col = checkCol(req, res);
  if (!col) return;
  const item = store.get(col, req.params.id);
  if (!item) return res.status(404).json({ error: 'Not found' });
  res.json(item);
});

router.post('/:col', (req, res) => {
  const col = checkCol(req, res);
  if (!col) return;
  const data = req.body || {};
  let id = data.id || data.uid;
  if (!id) {
    id = store.genId();
    data.id = id;
  }
  if (!data.createdAt) data.createdAt = new Date().toISOString();
  data.updatedAt = new Date().toISOString();
  const saved = store.set(col, id, data);
  res.json(saved);
});

router.put('/:col/:id', (req, res) => {
  const col = checkCol(req, res);
  if (!col) return;
  const data = req.body || {};
  data.updatedAt = new Date().toISOString();
  const saved = store.set(col, req.params.id, data);
  res.json(saved);
});

router.patch('/:col/:id', (req, res) => {
  const col = checkCol(req, res);
  if (!col) return;
  const data = req.body || {};
  data.updatedAt = new Date().toISOString();
  const saved = store.set(col, req.params.id, data);
  res.json(saved);
});

router.delete('/:col/:id', (req, res) => {
  const col = checkCol(req, res);
  if (!col) return;
  const ok = store.remove(col, req.params.id);
  res.json({ success: ok });
});

router.post('/:col/:id/array-add', (req, res) => {
  const col = checkCol(req, res);
  if (!col) return;
  const { field, value } = req.body || {};
  if (!field) return res.status(400).json({ error: 'field required' });
  const item = store.get(col, req.params.id) || {};
  const arr = Array.isArray(item[field]) ? item[field] : [];
  if (!arr.includes(value)) arr.push(value);
  const saved = store.set(col, req.params.id, { [field]: arr });
  res.json(saved);
});

router.post('/:col/:id/array-remove', (req, res) => {
  const col = checkCol(req, res);
  if (!col) return;
  const { field, value } = req.body || {};
  if (!field) return res.status(400).json({ error: 'field required' });
  const item = store.get(col, req.params.id) || {};
  const arr = Array.isArray(item[field]) ? item[field].filter(v => v !== value) : [];
  const saved = store.set(col, req.params.id, { [field]: arr });
  res.json(saved);
});

module.exports = router;

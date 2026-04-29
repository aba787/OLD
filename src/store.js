const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', 'data.json');

const defaultState = {
  users: {},
  volunteer_profiles: {},
  elder_profiles: {},
  organizations: {},
  requests: {},
  complaints: {}
};

let state = null;
let saveTimer = null;

function load() {
  if (state) return state;
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf8');
      state = { ...defaultState, ...JSON.parse(raw) };
    } else {
      state = JSON.parse(JSON.stringify(defaultState));
    }
  } catch (e) {
    console.error('Failed to load data file:', e.message);
    state = JSON.parse(JSON.stringify(defaultState));
  }
  for (const key of Object.keys(defaultState)) {
    if (!state[key]) state[key] = {};
  }
  return state;
}

function save() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      fs.writeFileSync(DATA_FILE, JSON.stringify(state, null, 2));
    } catch (e) {
      console.error('Failed to save data file:', e.message);
    }
  }, 100);
}

function getAll() {
  return load();
}

function getCollection(col) {
  const s = load();
  return s[col] || {};
}

function get(col, id) {
  const s = load();
  return s[col] ? s[col][id] : null;
}

function set(col, id, data) {
  const s = load();
  if (!s[col]) s[col] = {};
  s[col][id] = { ...(s[col][id] || {}), ...data };
  save();
  return s[col][id];
}

function replace(col, id, data) {
  const s = load();
  if (!s[col]) s[col] = {};
  s[col][id] = data;
  save();
  return s[col][id];
}

function remove(col, id) {
  const s = load();
  if (s[col] && s[col][id]) {
    delete s[col][id];
    save();
    return true;
  }
  return false;
}

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

module.exports = { getAll, getCollection, get, set, replace, remove, genId };

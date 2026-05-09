const STORAGE_KEY = 'orders';
const SETTINGS_KEY = 'settings';
const DEFAULT_LOGO = 'assets/img/logo addev flow fundo branco sem slogam.jpg';
const DEFAULT_PROFILE_PHOTO = 'assets/img/perfil-sem-foto.jpg';
const APP_CACHE_PREFIX = 'addevos-cache';
const FIREBASE_CONFIG = window.addevFirebaseConfig || {};
const PLAN_CONFIG = window.addevPlanConfig || {
  monthlyPrice: 39.9,
  monthlyPriceLabel: '39,90',
  planName: 'Mensal',
};
const ORDER_ACCENT_COLORS = {
  blue: { label: 'Azul', value: '#2563eb', light: '#bfdbfe' },
  red: { label: 'Vermelho', value: '#dc2626', light: '#fecaca' },
  green: { label: 'Verde', value: '#16a34a', light: '#bbf7d0' },
  yellow: { label: 'Amarelo', value: '#ca8a04', light: '#fde68a' },
  purple: { label: 'Roxo', value: '#7c3aed', light: '#ddd6fe' },
  pink: { label: 'Rosa', value: '#db2777', light: '#fbcfe8' },
  gray: { label: 'Cinza', value: '#4b5563', light: '#d1d5db' },
};
const DEFAULT_SETTINGS = {
  shopName: '',
  shopAddress: '',
  shopPhone: '',
  shopInstagram: '',
  shopFacebook: '',
  shopLogo: '',
  orderTerms: '',
  orderAccentColor: 'blue',
  subscriptionStatus: 'active',
  planName: PLAN_CONFIG.planName,
  monthlyPrice: PLAN_CONFIG.monthlyPrice,
};
const FIREBASE_PLACEHOLDER_PREFIX = 'COLE_AQUI_';

const appState = {
  authUser: null,
  assistanceId: '',
  initialized: false,
  orders: [],
  settings: { ...DEFAULT_SETTINGS },
};

let firebaseReady = false;
let auth = null;
let db = null;

const DEVICE_CHECKLIST_ITEMS = [
  { key: 'doesNotPowerOn', label: 'Aparelho não liga' },
  { key: 'screenCracked', label: 'Tela trincada' },
  { key: 'backCoverDamaged', label: 'Tampa traseira riscada/quebrada' },
  { key: 'touchWorking', label: 'Touch funcionando', requiresPower: true },
  { key: 'displayWorking', label: 'Imagem no display', requiresPower: true },
  { key: 'camerasWorking', label: 'Câmeras funcionando', requiresPower: true },
  { key: 'buttonsWorking', label: 'Botões funcionando', requiresPower: true },
  { key: 'chargingWorking', label: 'Carregamento funcionando', requiresPower: true },
];
const ACCESSORY_CHECKLIST_ITEMS = [
  { key: 'chip', label: 'Chip' },
  { key: 'capa', label: 'Capa' },
  { key: 'pelicula', label: 'Película' },
  { key: 'carregador', label: 'Carregador' },
  { key: 'caboUsb', label: 'Cabo USB' },
  { key: 'cartaoMemoria', label: 'Cartão de memória' },
];
const ORDER_TERMS_TEXT =
  'Garantia de ___ dias para defeitos relacionados exclusivamente ao servico executado. ' +
  'A loja nao se responsabiliza por perda de dados, chips, cartoes SD ou acessorios nao descritos nesta OS. ' +
  'O equipamento devera ser retirado no prazo maximo de ___ dias apos aviso de conclusao ou orcamento. ' +
  'Apos esse prazo, podera haver cobranca de armazenamento. ' +
  'A nao retirada podera caracterizar abandono do equipamento, sujeito as medidas cabiveis conforme a legislacao aplicavel.';

const els = {
  screens: {
    listView: document.getElementById('listView'),
    formView: document.getElementById('formView'),
    detailView: document.getElementById('detailView'),
    financeView: document.getElementById('financeView'),
    settingsView: document.getElementById('settingsView'),
  },
  search: document.getElementById('searchInput'),
  filterButtons: document.querySelectorAll('.filter-btn'),
  ordersList: document.getElementById('ordersList'),
  navButtons: document.querySelectorAll('.nav-btn'),
  openProfileHeader: document.getElementById('openProfileHeader'),
  loadingScreen: document.getElementById('loadingScreen'),
  loginScreen: document.getElementById('loginScreen'),
  app: document.getElementById('app'),
  loginForm: document.getElementById('loginForm'),
  loginEmail: document.getElementById('loginEmail'),
  loginPassword: document.getElementById('loginPassword'),
  loginFeedback: document.getElementById('loginFeedback'),
  logoutBtn: document.getElementById('logoutBtn'),
  form: document.getElementById('orderForm'),
  formTitle: document.getElementById('formTitle'),
  closeForm: document.getElementById('closeForm'),
  cancelForm: document.getElementById('cancelForm'),
  settingsForm: document.getElementById('settingsForm'),
  profileElements: {
    avatar: document.getElementById('profileAvatar'),
    headerAvatar: document.getElementById('headerProfileAvatar'),
    name: document.getElementById('profileName'),
    address: document.getElementById('profileAddress'),
    phone: document.getElementById('profilePhone'),
    instagram: document.getElementById('profileInstagram'),
    facebook: document.getElementById('profileFacebook'),
    orderTerms: document.getElementById('profileOrderTerms'),
    accentLabel: document.getElementById('profileAccentLabel'),
    accentSwatch: document.getElementById('profileAccentSwatch'),
  },
  settingsFields: {
    shopName: document.getElementById('shopName'),
    shopAddress: document.getElementById('shopAddress'),
    shopPhone: document.getElementById('shopPhone'),
    shopInstagram: document.getElementById('shopInstagram'),
    shopFacebook: document.getElementById('shopFacebook'),
    shopLogoFile: document.getElementById('shopLogoFile'),
    orderTerms: document.getElementById('orderTerms'),
    orderAccentColor: document.getElementById('orderAccentColor'),
  },
  modal: {
    overlay: document.getElementById('modalOverlay'),
    message: document.getElementById('modalMessage'),
    ok: document.getElementById('modalOk'),
    cancel: document.getElementById('modalCancel'),
  },
  detailContent: document.getElementById('detailContent'),
  closeDetail: document.getElementById('closeDetail'),
  financeTotals: {
    day: document.getElementById('totalDay'),
    week: document.getElementById('totalWeek'),
    month: document.getElementById('totalMonth'),
  },
  financeList: document.getElementById('financeList'),
};

const formFields = {
  customerName: document.getElementById('customerName'),
  phone: document.getElementById('phone'),
  customerDocument: document.getElementById('customerDocument'),
  device: document.getElementById('device'),
  issue: document.getElementById('issue'),
  price: document.getElementById('price'),
  cost: document.getElementById('cost'),
  notes: document.getElementById('notes'),
};

function hasFirebaseConfig() {
  return Object.values(FIREBASE_CONFIG).every(
    (value) =>
      typeof value === 'string' &&
      value.trim() &&
      !value.startsWith(FIREBASE_PLACEHOLDER_PREFIX)
  );
}

function initializeFirebaseServices() {
  if (!hasFirebaseConfig()) return false;
  if (firebase.apps.length) {
    firebaseReady = true;
    auth = firebase.auth();
    db = firebase.firestore();
    db.enablePersistence({ synchronizeTabs: false }).catch(() => {});
    return true;
  }

  firebase.initializeApp(FIREBASE_CONFIG);
  auth = firebase.auth();
  db = firebase.firestore();
  db.enablePersistence({ synchronizeTabs: false }).catch(() => {});
  firebaseReady = true;
  return true;
}

function getCacheKey(type, assistanceId = appState.assistanceId || 'guest') {
  return `${APP_CACHE_PREFIX}:${type}:${assistanceId}`;
}

function normalizeSettings(settings = {}) {
  const accentKey = ORDER_ACCENT_COLORS[settings.orderAccentColor] ? settings.orderAccentColor : DEFAULT_SETTINGS.orderAccentColor;
  return {
    ...DEFAULT_SETTINGS,
    ...(settings || {}),
    shopName: settings.shopName || '',
    shopAddress: settings.shopAddress || '',
    shopPhone: settings.shopPhone || '',
    shopInstagram: settings.shopInstagram || '',
    shopFacebook: settings.shopFacebook || '',
    shopLogo: settings.shopLogo || '',
    orderTerms: settings.orderTerms || '',
    orderAccentColor: accentKey,
    subscriptionStatus: settings.subscriptionStatus || 'active',
    planName: settings.planName || PLAN_CONFIG.planName,
    monthlyPrice:
      typeof settings.monthlyPrice === 'number' ? settings.monthlyPrice : PLAN_CONFIG.monthlyPrice,
  };
}

function normalizeOrder(order = {}) {
  return {
    ...order,
    price: Number(order.price) || 0,
    cost: Number(order.cost) || 0,
    deviceChecklistEnabled: Boolean(order.deviceChecklistEnabled),
    accessoryChecklistEnabled: Boolean(order.accessoryChecklistEnabled),
    deviceChecklist: buildChecklistState(DEVICE_CHECKLIST_ITEMS, order.deviceChecklist),
    accessoryChecklist: buildChecklistState(ACCESSORY_CHECKLIST_ITEMS, order.accessoryChecklist),
    finalizedAt:
      order.finalizedAt || (order.status === 'Finalizado' ? order.updatedAt || order.createdAt || '' : ''),
  };
}

function setOrdersState(orders = []) {
  appState.orders = orders.map((order) => normalizeOrder(order));
}

function setSettingsState(settings = {}) {
  appState.settings = normalizeSettings(settings);
}

function writeCache(type, value) {
  if (!appState.assistanceId) return;
  localStorage.setItem(getCacheKey(type), JSON.stringify(value));
}

function readCache(type, fallback) {
  if (!appState.assistanceId) return fallback;
  const saved = localStorage.getItem(getCacheKey(type));
  if (!saved) return fallback;

  try {
    return JSON.parse(saved);
  } catch {
    return fallback;
  }
}

function persistLocalState() {
  if (!appState.assistanceId) return;
  writeCache('orders', appState.orders);
  writeCache('settings', appState.settings);
}

function setAppMode(mode) {
  els.loadingScreen.hidden = mode !== 'loading';
  els.loginScreen.hidden = mode !== 'login';
  els.app.hidden = mode !== 'app';
}

function setLoginFeedback(message = '', isError = true) {
  if (!els.loginFeedback) return;
  if (!message) {
    els.loginFeedback.hidden = true;
    els.loginFeedback.textContent = '';
    els.loginFeedback.style.background = '';
    els.loginFeedback.style.color = '';
    return;
  }

  els.loginFeedback.hidden = false;
  els.loginFeedback.textContent = message;
  els.loginFeedback.style.background = isError
    ? 'rgba(197, 48, 48, 0.08)'
    : 'rgba(31, 155, 86, 0.12)';
  els.loginFeedback.style.color = isError ? '#b83232' : '#086e36';
}

function getAssistanceDocRef(uid = appState.assistanceId) {
  return db.collection('assistances').doc(uid);
}

function getOrdersCollectionRef(uid = appState.assistanceId) {
  return getAssistanceDocRef(uid).collection('orders');
}

async function saveOrderRemote(order) {
  if (!firebaseReady || !appState.assistanceId) return;
  await getOrdersCollectionRef().doc(order.id).set(normalizeOrder(order), { merge: true });
}

async function deleteOrderRemote(orderId) {
  if (!firebaseReady || !appState.assistanceId) return;
  await getOrdersCollectionRef().doc(orderId).delete();
}

async function saveSettingsRemote(settings) {
  if (!firebaseReady || !appState.assistanceId) return;
  const mergedSettings = normalizeSettings({
    ...appState.settings,
    ...settings,
  });
  const payload = {
    ...mergedSettings,
    ownerEmail: appState.authUser?.email || '',
    updatedAt: new Date().toISOString(),
  };
  await getAssistanceDocRef().set(payload, { merge: true });
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Falha ao ler imagem.'));
    reader.readAsDataURL(file);
  });
}

function getLegacyLocalSettings() {
  const saved = localStorage.getItem(SETTINGS_KEY);
  if (!saved) return { ...DEFAULT_SETTINGS };
  try {
    return normalizeSettings(JSON.parse(saved));
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

async function maybeMigrateLegacyLocalData(remoteOrders, remoteSettings) {
  const legacySettings = getLegacyLocalSettings();
  const shouldMigrateSettings =
    !remoteSettings.shopName &&
    !remoteSettings.shopAddress &&
    !remoteSettings.shopPhone &&
    !remoteSettings.shopInstagram &&
    !remoteSettings.shopFacebook &&
    !remoteSettings.shopLogo &&
    !remoteSettings.orderTerms &&
    !remoteSettings.orderAccentColor &&
    (legacySettings.shopName ||
      legacySettings.shopAddress ||
      legacySettings.shopPhone ||
      legacySettings.shopInstagram ||
      legacySettings.shopFacebook ||
      legacySettings.shopLogo ||
      legacySettings.orderTerms ||
      legacySettings.orderAccentColor);

  if (!shouldMigrateSettings) return;

  if (shouldMigrateSettings) {
    await saveSettingsRemote(legacySettings);
    setSettingsState({ ...remoteSettings, ...legacySettings });
  }

  persistLocalState();
}

async function ensureAssistanceDocument(settingsDoc) {
  if (settingsDoc.exists) {
    return normalizeSettings(settingsDoc.data());
  }

  const bootstrapSettings = normalizeSettings({
    ownerEmail: appState.authUser?.email || '',
    updatedAt: new Date().toISOString(),
  });

  await getAssistanceDocRef().set(
    {
      ...bootstrapSettings,
      ownerEmail: appState.authUser?.email || '',
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );

  return bootstrapSettings;
}

async function loadRemoteAppData() {
  const settingsDoc = await getAssistanceDocRef().get();
  const remoteSettings = await ensureAssistanceDocument(settingsDoc);
  const ordersSnapshot = await getOrdersCollectionRef().get();
  const remoteOrders = ordersSnapshot.docs.map((snapshot) => normalizeOrder(snapshot.data()));

  setSettingsState(remoteSettings);
  setOrdersState(remoteOrders);
  await maybeMigrateLegacyLocalData(remoteOrders, remoteSettings);
  persistLocalState();
}

function renderAppShell() {
  renderSettings();
  renderOrders();
  updateFinance();
  openScreen('listView');
}

function withTimeout(promise, timeoutMs = 12000) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error('A sincronização com o Firebase demorou mais que o esperado.')), timeoutMs);
    }),
  ]);
}

function hydrateStateFromCache(uid) {
  appState.assistanceId = uid;
  setSettingsState(readCache('settings', DEFAULT_SETTINGS));
  setOrdersState(readCache('orders', []));
}

function shouldBlockSubscription(settings) {
  return settings.subscriptionStatus && settings.subscriptionStatus !== 'active';
}

async function handleAuthenticatedUser(user) {
  appState.authUser = user;
  appState.assistanceId = user.uid;
  hydrateStateFromCache(user.uid);
  setAppMode('app');
  renderAppShell();

  await withTimeout(loadRemoteAppData());

  if (shouldBlockSubscription(appState.settings)) {
    await auth.signOut();
    throw new Error(
      `Assinatura ${appState.settings.subscriptionStatus}. Libere a assistência no Firebase para acessar o sistema.`
    );
  }

  renderAppShell();
  setAppMode('app');
}

async function handleLoginSubmit(event) {
  event.preventDefault();
  if (!firebaseReady || !auth) {
    setLoginFeedback('Configure o arquivo firebase-config.js antes de usar o login.');
    return;
  }

  const email = els.loginEmail.value.trim();
  const password = els.loginPassword.value;
  if (!email || !password) {
    setLoginFeedback('Informe e-mail e senha para entrar.');
    return;
  }

  setLoginFeedback('');
  setAppMode('loading');

  try {
    await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
    await auth.signInWithEmailAndPassword(email, password);
  } catch (error) {
    setAppMode('login');
    setLoginFeedback(getFriendlyAuthError(error));
  }
}

function getFriendlyAuthError(error) {
  const code = error?.code || '';
  if (code === 'auth/invalid-credential' || code === 'auth/wrong-password') {
    return 'E-mail ou senha inválidos.';
  }
  if (code === 'auth/user-disabled') {
    return 'Esta conta está desativada.';
  }
  if (code === 'auth/too-many-requests') {
    return 'Muitas tentativas. Aguarde um pouco e tente novamente.';
  }
  if (code === 'auth/network-request-failed') {
    return 'Falha de rede ao tentar entrar.';
  }

  return error?.message || 'Não foi possível entrar agora.';
}

async function bootstrapAuth() {
  if (!initializeFirebaseServices()) {
    setAppMode('login');
    setLoginFeedback(
      'Preencha o arquivo firebase-config.js com os dados do seu projeto Firebase para ativar o login.'
    );
    return;
  }

  setAppMode('loading');

  auth.onAuthStateChanged(async (user) => {
    if (!user) {
      appState.authUser = null;
      appState.assistanceId = '';
      setOrdersState([]);
      setSettingsState(DEFAULT_SETTINGS);
      setAppMode('login');
      return;
    }

    try {
      await handleAuthenticatedUser(user);
      setLoginFeedback('');
    } catch (error) {
      const hasLocalData =
        appState.orders.length > 0 ||
        Boolean(
          appState.settings.shopName ||
            appState.settings.shopAddress ||
            appState.settings.shopPhone ||
            appState.settings.shopInstagram ||
            appState.settings.shopFacebook ||
            appState.settings.shopLogo
        );

      if (hasLocalData && user) {
        setAppMode('app');
        renderAppShell();
        await alertModal(error?.message || 'Não foi possível sincronizar com o Firebase agora.');
        return;
      }

      setAppMode('login');
      setLoginFeedback(error?.message || 'Não foi possível carregar os dados da assistência.');
    }
  });
}

async function handleLogout() {
  if (!auth) return;
  setAppMode('loading');
  await auth.signOut();
}

function isChecklistEnabled(group) {
  return document.querySelector(`input[name="${group}ChecklistEnabled"]:checked`)?.value === 'true';
}

function setChecklistEnabled(group, enabled) {
  const target = document.querySelector(`input[name="${group}ChecklistEnabled"][value="${enabled ? 'true' : 'false'}"]`);
  if (target) target.checked = true;
}

function buildChecklistState(items, source = {}) {
  return items.reduce((state, item) => {
    state[item.key] = Boolean(source[item.key]);
    return state;
  }, {});
}

function getChecklistInput(group, key) {
  return document.querySelector(`[data-checklist="${group}"][value="${key}"]`);
}

function getChecklistCard(group) {
  return document.querySelector(`[data-checklist-card="${group}"]`);
}

function readChecklistState(group, items) {
  return items.reduce((state, item) => {
    state[item.key] = Boolean(getChecklistInput(group, item.key)?.checked);
    return state;
  }, {});
}

function writeChecklistState(group, items, source = {}) {
  items.forEach((item) => {
    const input = getChecklistInput(group, item.key);
    if (input) input.checked = Boolean(source[item.key]);
  });
}

function getDeviceChecklistStateFromForm() {
  if (!isChecklistEnabled('device')) {
    return buildChecklistState(DEVICE_CHECKLIST_ITEMS);
  }

  const state = readChecklistState('device', DEVICE_CHECKLIST_ITEMS);
  if (state.doesNotPowerOn) {
    DEVICE_CHECKLIST_ITEMS.filter((item) => item.requiresPower).forEach((item) => {
      state[item.key] = false;
    });
  }
  return state;
}

function updateDeviceChecklistVisibility({ clearHidden = false } = {}) {
  const checklistEnabled = isChecklistEnabled('device');
  const doesNotPowerOn = Boolean(getChecklistInput('device', 'doesNotPowerOn')?.checked);
  const card = getChecklistCard('device');
  const options = card?.querySelector('.checklist-options');

  if (card) {
    card.classList.toggle('is-collapsed', !checklistEnabled);
  }
  if (options) {
    options.classList.toggle('is-hidden-block', !checklistEnabled);
  }

  document.querySelectorAll('[data-power-required="true"]').forEach((option) => {
    option.classList.toggle('is-hidden', !checklistEnabled || doesNotPowerOn);
    const input = option.querySelector('input');
    if (!input) return;
    input.disabled = !checklistEnabled || doesNotPowerOn;
    if ((!checklistEnabled || doesNotPowerOn) && clearHidden) input.checked = false;
  });

  if (!checklistEnabled && clearHidden) {
    writeChecklistState('device', DEVICE_CHECKLIST_ITEMS, buildChecklistState(DEVICE_CHECKLIST_ITEMS));
  }
}

function updateAccessoryChecklistVisibility({ clearHidden = false } = {}) {
  const checklistEnabled = isChecklistEnabled('accessory');
  const card = getChecklistCard('accessory');
  const options = card?.querySelector('.checklist-options');

  if (card) {
    card.classList.toggle('is-collapsed', !checklistEnabled);
  }
  if (options) {
    options.classList.toggle('is-hidden-block', !checklistEnabled);
  }

  ACCESSORY_CHECKLIST_ITEMS.forEach((item) => {
    const input = getChecklistInput('accessory', item.key);
    if (!input) return;
    input.disabled = !checklistEnabled;
    if (!checklistEnabled && clearHidden) input.checked = false;
  });
}

function getCheckedChecklistLabels(items, state = {}) {
  const labels = [];

  items.forEach((item) => {
    if (item.requiresPower && state.doesNotPowerOn) return;
    if (state[item.key]) labels.push(item.label);
  });

  return labels;
}

function renderChecklistSummary(title, labels) {
  return `
    <div class="checklist-summary">
      <strong>${title}:</strong>
      <span>${labels.length ? labels.join(', ') : '-'}</span>
    </div>
  `;
}

function renderPrintChecklist(title, items, state = {}) {
  const listItems = items
    .filter((item) => !(item.requiresPower && state.doesNotPowerOn))
    .map((item) => {
      return `<li><span class="checkmark">${state[item.key] ? '☑' : '☐'}</span><span>${item.label}</span></li>`;
    })
    .join('');

  return `
    <div class="print-checklist">
      <strong>${title}</strong>
      <ul>${listItems || '<li><span>-</span></li>'}</ul>
    </div>
  `;
}

let editingId = null;
let detailPendingStatus = null;
let detailCurrentId = null;
let detailHistoryExpanded = false;

function loadOrders() {
  return appState.orders.map((order) => normalizeOrder(order));
}

function saveOrders(orders) {
  setOrdersState(orders);
  persistLocalState();
}

function loadSettings() {
  return normalizeSettings(appState.settings);
}

function saveSettings(settings) {
  setSettingsState({
    ...appState.settings,
    ...settings,
  });
  persistLocalState();
}

function createOrderObject({
  customerName,
  phone = '',
  customerDocument = '',
  deviceChecklistEnabled = false,
  accessoryChecklistEnabled = false,
  deviceChecklist = buildChecklistState(DEVICE_CHECKLIST_ITEMS),
  accessoryChecklist = buildChecklistState(ACCESSORY_CHECKLIST_ITEMS),
  device,
  issue,
  price = 0,
  cost = 0,
  notes = '',
  status = 'Aguardando',
}) {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    customerName,
    phone,
    customerDocument,
    deviceChecklistEnabled: Boolean(deviceChecklistEnabled),
    accessoryChecklistEnabled: Boolean(accessoryChecklistEnabled),
    deviceChecklist: buildChecklistState(DEVICE_CHECKLIST_ITEMS, deviceChecklist),
    accessoryChecklist: buildChecklistState(ACCESSORY_CHECKLIST_ITEMS, accessoryChecklist),
    device,
    issue,
    price: Number(price) || 0,
    cost: Number(cost) || 0,
    notes,
    status,
    createdAt: now,
    updatedAt: now,
    finalizedAt: status === 'Finalizado' ? now : '',
    history: [
      { date: now, action: 'OS criada' },
      { date: now, action: `Status definido: ${status}` },
    ],
  };
}

function getFinalizedAtForStatusChange(currentOrder, nextStatus, now) {
  if (nextStatus === 'Finalizado') {
    if (currentOrder.status === 'Finalizado') {
      return currentOrder.finalizedAt || currentOrder.updatedAt || currentOrder.createdAt || now;
    }
    return now;
  }

  return '';
}

function getFinanceReferenceDate(order) {
  return order.finalizedAt || order.updatedAt || order.createdAt;
}

function formatCurrency(value) {
  const num = Number(value);
  return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function parseCurrency(str) {
  if (!str) return 0;
  // Remove "R$", espaços e símbolos de moeda
  const cleaned = str.replace(/[^\d,.-]/g, '').trim();
  if (!cleaned) return 0;
  // Substituir ponto de milhar e vírgula decimal
  const normalized = cleaned.replace(/\./g, '').replace(',', '.');
  const parsed = parseFloat(normalized);
  return isNaN(parsed) ? 0 : parsed;
}

function formatCurrencyInputLive(input) {
  // Remove tudo que não é número
  let value = input.value.replace(/\D/g, '');
  
  if (!value) {
    input.value = '';
    input.dataset.raw = 0;
    return;
  }
  
  // Converte para número (centavos)
  const num = parseInt(value, 10);
  const realValue = num / 100;
  
  // Formata para exibição
  input.value = realValue.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  
  input.dataset.raw = realValue;
}

function formatCurrencyInput(input) {
  const num = parseCurrency(input.value);
  input.value = num > 0 ? formatCurrency(num) : '';
  input.dataset.raw = num;
}

function parsePhone(str) {
  let digits = (str || '').toString().replace(/\D/g, '');

  if (digits.startsWith('00')) digits = digits.slice(2);
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith('55')) {
    digits = digits.slice(2);
  }
  if (digits.length > 11) digits = digits.slice(-11);

  return digits;
}

function isValidBrazilPhone(phone) {
  const digits = parsePhone(phone);
  return digits.length === 10 || digits.length === 11;
}

function formatPhoneDigits(digits) {
  const only = parsePhone(digits);
  const len = only.length;
  if (!len) return '';

  if (len <= 2) return `(${only}`;

  if (len <= 6) {
    return `(${only.slice(0, 2)}) ${only.slice(2)}`;
  }

  if (len <= 10) {
    return `(${only.slice(0, 2)}) ${only.slice(2, 6)}-${only.slice(6, 10)}`;
  }

  return `(${only.slice(0, 2)}) ${only.slice(2, 7)}-${only.slice(7, 11)}`;
}

function formatPhoneInput(input) {
  const digits = parsePhone(input.value);
  input.value = formatPhoneDigits(digits);
  input.dataset.raw = digits;
}

// Modal helpers
function showModal(message, { confirm = false } = {}) {
  return new Promise((resolve) => {
    const { overlay, message: msgEl, ok, cancel } = els.modal;
    msgEl.textContent = message;
    overlay.classList.remove('hidden');
    overlay.setAttribute('aria-hidden', 'false');

    function cleanup(result) {
      overlay.classList.add('hidden');
      overlay.setAttribute('aria-hidden', 'true');
      ok.onclick = null;
      cancel.onclick = null;
      overlay.onclick = null;
      document.onkeydown = null;
      resolve(result);
    }

    ok.textContent = confirm ? 'Confirmar' : 'OK';
    cancel.style.display = confirm ? 'inline-flex' : 'none';

    ok.onclick = () => cleanup(true);
    cancel.onclick = () => cleanup(false);
    overlay.onclick = (e) => {
      if (e.target === overlay && !confirm) cleanup(true);
      if (e.target === overlay && confirm) cleanup(false);
    };
    document.onkeydown = (e) => {
      if (e.key === 'Escape') cleanup(false);
      if (e.key === 'Enter') cleanup(true);
    };
  });
}

const alertModal = (msg) => showModal(msg, { confirm: false });
const confirmModal = (msg) => showModal(msg, { confirm: true });

function getSettingsSnapshot() {
  const saved = loadSettings();
  
  // Verify if all fields exist and are properly populated from the form inputs
  const formValues = {};
  const isEditingSettings = els.settingsForm && !els.settingsForm.classList.contains('hidden');
  if (isEditingSettings && els.settingsFields && els.settingsFields.shopName) {
    formValues.shopName = els.settingsFields.shopName.value?.trim() || saved.shopName || '';
    formValues.shopAddress = els.settingsFields.shopAddress.value?.trim() || saved.shopAddress || '';
    formValues.shopPhone = els.settingsFields.shopPhone.value?.trim() || saved.shopPhone || '';
    formValues.shopInstagram = els.settingsFields.shopInstagram.value?.trim() || saved.shopInstagram || '';
    formValues.shopFacebook = els.settingsFields.shopFacebook.value?.trim() || saved.shopFacebook || '';
    formValues.orderTerms = els.settingsFields.orderTerms.value?.trim() || saved.orderTerms || '';
    formValues.orderAccentColor = els.settingsFields.orderAccentColor.value || saved.orderAccentColor || '';
  }
  
  // Merge: prioritize form values if they exist, otherwise use saved
  const merged = {
    shopName: formValues.shopName || saved.shopName || '',
    shopAddress: formValues.shopAddress || saved.shopAddress || '',
    shopPhone: formValues.shopPhone || saved.shopPhone || '',
    shopInstagram: formValues.shopInstagram || saved.shopInstagram || '',
    shopFacebook: formValues.shopFacebook || saved.shopFacebook || '',
    shopLogo: saved.shopLogo || '',
    orderTerms: formValues.orderTerms || saved.orderTerms || '',
    orderAccentColor: ORDER_ACCENT_COLORS[formValues.orderAccentColor] ? formValues.orderAccentColor : saved.orderAccentColor,
  };
  
  return merged;
}

function getOrderAccentColor(settings = loadSettings()) {
  return ORDER_ACCENT_COLORS[settings.orderAccentColor] || ORDER_ACCENT_COLORS[DEFAULT_SETTINGS.orderAccentColor];
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

function sanitizePdfText(value) {
  return (value || '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, ' ')
    .trim();
}

function escapePdfString(value) {
  return sanitizePdfText(value)
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

function escapeHtml(value) {
  return (value || '')
    .toString()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function wrapPdfLine(text, maxLength = 86) {
  const clean = sanitizePdfText(text);
  if (!clean) return [''];

  const words = clean.split(/\s+/);
  const lines = [];
  let current = '';

  words.forEach((word) => {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxLength) {
      current = candidate;
      return;
    }

    if (current) lines.push(current);

    if (word.length <= maxLength) {
      current = word;
      return;
    }

    for (let index = 0; index < word.length; index += maxLength) {
      const chunk = word.slice(index, index + maxLength);
      if (chunk.length === maxLength || index + maxLength < word.length) {
        lines.push(chunk);
      } else {
        current = chunk;
      }
    }
  });

  if (current) lines.push(current);
  return lines;
}

function buildOrderPdfSections(order, title = 'Ordem de Servico') {
  const settings = getSettingsSnapshot();
  const deviceChecklistLabels = getCheckedChecklistLabels(
    DEVICE_CHECKLIST_ITEMS,
    buildChecklistState(DEVICE_CHECKLIST_ITEMS, order.deviceChecklist)
  );
  const accessoryChecklistLabels = getCheckedChecklistLabels(
    ACCESSORY_CHECKLIST_ITEMS,
    buildChecklistState(ACCESSORY_CHECKLIST_ITEMS, order.accessoryChecklist)
  );

  const sections = [
    {
      title: 'Dados do cliente',
      rows: [
        ['Cliente', order.customerName || '-'],
        ['Telefone', order.phone ? formatPhoneDigits(order.phone) : '-'],
        ['Documento', order.customerDocument || '-'],
      ],
    },
    {
      title: 'Dados da ordem',
      rows: [
        ['Aparelho', order.device || '-'],
        ['Defeito informado', order.issue || '-'],
        ['Valor', formatCurrency(order.price || 0)],
        ['Status', order.status || '-'],
        ['Criada em', order.createdAt ? formatDate(order.createdAt) : '-'],
        ['Atualizada em', order.updatedAt ? formatDate(order.updatedAt) : '-'],
      ],
    },
    {
      title: 'Observacoes',
      rows: [['Observacoes', order.notes || '-']],
    },
  ];

  if (order.deviceChecklistEnabled) {
    sections.push({
      title: 'Checklist do aparelho',
      rows: (deviceChecklistLabels.length ? deviceChecklistLabels : ['Nenhum item marcado']).map((item) => ['Item', item]),
    });
  }

  if (order.accessoryChecklistEnabled) {
    sections.push({
      title: 'Perifericos recebidos',
      rows: (accessoryChecklistLabels.length ? accessoryChecklistLabels : ['Nenhum item marcado']).map((item) => ['Item', item]),
    });
  }

  sections.push({
    title: 'Assinaturas',
    rows: [
      ['Assinatura do cliente', order.customerName || 'Cliente'],
      ['Assinatura da loja', settings.shopName || 'Assistencia Tecnica'],
    ],
  });
  sections.push({
    title: 'Termos e Condicoes',
    rows: [['', settings.orderTerms || ORDER_TERMS_TEXT]],
  });

  return {
    title,
    settings,
    sections,
  };
}

function binaryStringToBytes(value) {
  const bytes = new Uint8Array(value.length);
  for (let index = 0; index < value.length; index += 1) {
    bytes[index] = value.charCodeAt(index) & 0xff;
  }
  return bytes;
}

function dataUrlToBinary(dataUrl) {
  const parts = dataUrl.split(',');
  if (parts.length < 2) return '';
  return atob(parts[1]);
}

function loadImageForPdf(src) {
  return new Promise((resolve) => {
    if (!src) {
      resolve(null);
      return;
    }

    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = src;
  });
}

async function getPdfLogoData(src) {
  try {
    const image = await loadImageForPdf(src);
    if (!image) return null;

    const maxWidth = 360;
    const scale = Math.min(1, maxWidth / Math.max(image.naturalWidth || image.width, 1));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round((image.naturalWidth || image.width) * scale));
    canvas.height = Math.max(1, Math.round((image.naturalHeight || image.height) * scale));
    const context = canvas.getContext('2d');
    if (!context) return null;

    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
    return {
      width: canvas.width,
      height: canvas.height,
      binary: dataUrlToBinary(dataUrl),
    };
  } catch {
    return null;
  }
}

function createStyledOrderPdfBlob({ title, settings, sections }, logoData = null) {
  const pageWidth = 595;
  const pageHeight = 842;
  const margin = 34;
  const accent = getOrderAccentColor(settings);
  const pages = [[]];
  let currentPage = 0;
  let y = pageHeight - 146;

  const push = (command) => {
    pages[currentPage].push(command);
  };

  const color = (hex) => {
    const clean = hex.replace('#', '');
    const r = parseInt(clean.slice(0, 2), 16) / 255;
    const g = parseInt(clean.slice(2, 4), 16) / 255;
    const b = parseInt(clean.slice(4, 6), 16) / 255;
    return `${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)}`;
  };

  const rect = (x, ry, width, height, fill) => {
    push(`q ${color(fill)} rg ${x} ${ry} ${width} ${height} re f Q`);
  };

  const text = (value, x, ty, size = 10, font = 'F1', fill = '#111827') => {
    push(`q ${color(fill)} rg BT /${font} ${size} Tf ${x} ${ty} Td (${escapePdfString(value)}) Tj ET Q`);
  };

  const line = (x1, y1, x2, y2, stroke = '#d1d5db', width = 1) => {
    push(`q ${color(stroke)} RG ${width} w ${x1} ${y1} m ${x2} ${y2} l S Q`);
  };

  const addPage = () => {
    currentPage += 1;
    pages[currentPage] = [];
    y = pageHeight - 56;
    text(title, margin, pageHeight - 34, 10, 'F2', '#111827');
    line(margin, pageHeight - 44, pageWidth - margin, pageHeight - 44);
  };

  const ensureSpace = (height) => {
    if (y - height < 42) addPage();
  };

  const wrapText = (value, maxChars = 74) => wrapPdfLine(value || '-', maxChars);

  rect(0, pageHeight - 104, pageWidth, 104, '#f3f4f6');
  rect(0, pageHeight - 104, 10, 104, accent.value);

  if (logoData?.binary) {
    const logoBoxWidth = 96;
    const logoBoxHeight = 50;
    const ratio = Math.min(logoBoxWidth / logoData.width, logoBoxHeight / logoData.height);
    const drawWidth = Math.max(1, Math.round(logoData.width * ratio));
    const drawHeight = Math.max(1, Math.round(logoData.height * ratio));
    const logoX = margin;
    const logoY = pageHeight - 82;
    rect(logoX - 6, logoY - 8, logoBoxWidth + 12, logoBoxHeight + 16, '#ffffff');
    push(`q ${drawWidth} 0 0 ${drawHeight} ${logoX + (logoBoxWidth - drawWidth) / 2} ${logoY + (logoBoxHeight - drawHeight) / 2} cm /Im1 Do Q`);
  }

  const infoX = logoData?.binary ? 158 : margin;
  text(settings.shopName || 'Assistencia Tecnica', infoX, pageHeight - 34, 15, 'F2', '#111827');
  [
    settings.shopAddress,
    settings.shopPhone ? `Telefone: ${formatPhoneDigits(settings.shopPhone)}` : '',
    settings.shopInstagram ? `Instagram: ${settings.shopInstagram}` : '',
    settings.shopFacebook ? `Facebook: ${settings.shopFacebook}` : '',
  ]
    .filter(Boolean)
    .slice(0, 4)
    .forEach((shopLine, index) => text(shopLine, infoX, pageHeight - 51 - index * 11, 8, 'F1', '#374151'));

  text(title, margin, pageHeight - 126, 14, 'F2', '#111827');
  text(`Emitido em ${formatDate(new Date().toISOString())}`, pageWidth - 178, pageHeight - 124, 8, 'F1', '#6b7280');

  sections.forEach((section) => {
    ensureSpace(section.title === 'Assinaturas' ? 118 : section.title === 'Termos e Condicoes' ? 72 : 40);
    text(section.title, margin, y, section.title === 'Termos e Condicoes' ? 8 : 10, 'F2', accent.value);
    y -= 12;
    line(margin, y, pageWidth - margin, y, accent.light, 0.6);
    y -= section.title === 'Assinaturas' ? 16 : section.title === 'Termos e Condicoes' ? 8 : 10;

    section.rows.forEach(([label, value]) => {
      const valueLines = wrapText(value, 78);
      const rowHeight = Math.max(19, valueLines.length * 10 + 7);
      ensureSpace(rowHeight + 2);

      if (section.title === 'Assinaturas') {
        ensureSpace(50);
        text(label, margin, y, 8, 'F2', '#374151');
        y -= 22;
        line(margin, y, pageWidth - margin, y, '#111827', 0.8);
        text(value, margin, y - 11, 7, 'F1', '#6b7280');
        y -= 30;
        return;
      }

      if (section.title === 'Termos e Condicoes') {
        const termLines = wrapText(value, 96);
        termLines.forEach((valueLine, index) => {
          text(valueLine, margin, y - index * 8, 7, 'F1', '#4b5563');
        });
        y -= termLines.length * 8 + 4;
        return;
      }

      text(label, margin, y, 7, 'F2', '#6b7280');
      valueLines.forEach((valueLine, index) => {
        text(valueLine, 142, y - index * 10, 9, 'F1', '#111827');
      });
      y -= rowHeight;
    });

    y -= 6;
  });

  pages.forEach((commands, index) => {
    commands.push(
      `q ${color('#6b7280')} rg BT /F1 8 Tf ${pageWidth - 106} 28 Td (Pagina ${index + 1} de ${pages.length}) Tj ET Q`
    );
  });

  const fontRegularObjectNumber = 3;
  const fontBoldObjectNumber = 4;
  const imageObjectNumber = logoData?.binary ? 5 : null;
  const firstPageObjectNumber = logoData?.binary ? 6 : 5;
  const objects = [];
  const pageRefs = [];

  pages.forEach((pageCommands, pageIndex) => {
    const pageObjectNumber = firstPageObjectNumber + pageIndex * 2;
    const contentObjectNumber = pageObjectNumber + 1;
    pageRefs.push(`${pageObjectNumber} 0 R`);
    const resources = [
      `/Font << /F1 ${fontRegularObjectNumber} 0 R /F2 ${fontBoldObjectNumber} 0 R >>`,
      logoData?.binary ? `/XObject << /Im1 ${imageObjectNumber} 0 R >>` : '',
      '/ProcSet [/PDF /Text /ImageC]',
    ]
      .filter(Boolean)
      .join(' ');
    const stream = `${pageCommands.join('\n')}\n`;

    objects.push({
      number: pageObjectNumber,
      body: `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << ${resources} >> /Contents ${contentObjectNumber} 0 R >>`,
    });
    objects.push({
      number: contentObjectNumber,
      body: `<< /Length ${stream.length} >>\nstream\n${stream}endstream`,
    });
  });

  const pdfObjects = [
    { number: 1, body: '<< /Type /Catalog /Pages 2 0 R >>' },
    { number: 2, body: `<< /Type /Pages /Kids [${pageRefs.join(' ')}] /Count ${pages.length} >>` },
    { number: 3, body: '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>' },
    { number: 4, body: '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>' },
    ...(logoData?.binary
      ? [
          {
            number: imageObjectNumber,
            body: `<< /Type /XObject /Subtype /Image /Width ${logoData.width} /Height ${logoData.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${logoData.binary.length} >>\nstream\n${logoData.binary}\nendstream`,
          },
        ]
      : []),
    ...objects.sort((a, b) => a.number - b.number),
  ];

  let pdf = '%PDF-1.4\n';
  const offsets = [0];

  pdfObjects.forEach((object) => {
    offsets[object.number] = pdf.length;
    pdf += `${object.number} 0 obj\n${object.body}\nendobj\n`;
  });

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${pdfObjects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';

  for (let objectNumber = 1; objectNumber <= pdfObjects.length; objectNumber += 1) {
    pdf += `${String(offsets[objectNumber]).padStart(10, '0')} 00000 n \n`;
  }

  pdf += `trailer\n<< /Size ${pdfObjects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return new Blob([binaryStringToBytes(pdf)], { type: 'application/pdf' });
}

async function createOrderPdfFile(order, title = 'Ordem de Servico') {
  const pdfData = buildOrderPdfSections(order, title);
  const logoSrc = pdfData.settings.shopLogo || DEFAULT_LOGO;
  const logoData = await getPdfLogoData(logoSrc);
  const blob = createStyledOrderPdfBlob(pdfData, logoData);
  const safeName = sanitizePdfText(order.customerName || 'cliente')
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9-_]/g, '')
    .toLowerCase() || 'cliente';

  return new File([blob], `os-${safeName}.pdf`, { type: 'application/pdf' });
}

function getWhatsAppNumber(phone) {
  const phoneNumber = parsePhone(phone);
  if (!isValidBrazilPhone(phoneNumber)) return '';
  return `55${phoneNumber}`;
}

function getWhatsAppMessage(order) {
  const settings = loadSettings();
  const shopName = settings.shopName || 'Assistência';
  return `Olá ${order.customerName}, segue o PDF da sua OS da ${shopName} referente ao aparelho ${order.device}.`;
}

function downloadFile(file) {
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = file.name;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function sendOrderPdfViaWhatsApp(order, title = 'Ordem de Servico') {
  const pdfFile = await createOrderPdfFile(order, title);
  const phoneNumber = getWhatsAppNumber(order.phone);
  const message = getWhatsAppMessage(order);

  if (navigator.share && navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
    try {
      await navigator.share({
        title,
        text: message,
        files: [pdfFile],
      });
      return;
    } catch (error) {
      if (error?.name === 'AbortError') return;
    }
  }

  downloadFile(pdfFile);

  if (!phoneNumber) {
    await alertModal('O PDF foi baixado. Como não há telefone válido, envie o arquivo manualmente pelo WhatsApp.');
    return;
  }

  const whatsappURL = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(`${message} O PDF foi baixado no seu aparelho para anexar.`)}`;
  window.open(whatsappURL, '_blank');
  await alertModal('O PDF foi baixado. Anexe o arquivo no WhatsApp após abrir a conversa.');
}

function choosePrintLayout() {
  return new Promise((resolve) => {
    const { overlay, message: msgEl, ok, cancel } = els.modal;
    msgEl.innerHTML = `
      <strong style="display:block; margin-bottom: 8px;">Escolha o formato de impressão</strong>
      <span>Selecione abaixo se deseja imprimir em folha A4 ou no estilo cupom.</span>
    `;

    overlay.classList.remove('hidden');
    overlay.setAttribute('aria-hidden', 'false');
    ok.textContent = 'A4';
    cancel.textContent = 'Cupom';
    cancel.style.display = 'inline-flex';

    function cleanup(result) {
      overlay.classList.add('hidden');
      overlay.setAttribute('aria-hidden', 'true');
      ok.onclick = null;
      cancel.onclick = null;
      overlay.onclick = null;
      document.onkeydown = null;
      resolve(result);
    }

    ok.onclick = () => cleanup('a4');
    cancel.onclick = () => cleanup('cupom');
    overlay.onclick = (event) => {
      if (event.target === overlay) cleanup(null);
    };
    document.onkeydown = (event) => {
      if (event.key === 'Escape') cleanup(null);
      if (event.key === 'Enter') cleanup('a4');
    };
  });
}

function buildA4PrintHtml({ title, shopBlock, rows, printChecklistSection, signatures, termsBlock, accentColor }) {
  const copyContent = (copyType) => `
      <div class="copy-container">
        <div class="copy-type">${copyType}</div>
        ${shopBlock ? `<div class="shop">${shopBlock}</div>` : ''}
        <h1>${title}</h1>
        ${rows}
        ${printChecklistSection}
        ${signatures}
        ${termsBlock}
      </div>`;

  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>${title}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; color: #111; }
        .print-page {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          width: 100%;
          min-height: 100vh;
          padding: 8px;
          background: #fff;
        }
        .copy-container {
          padding: 16px;
          display: flex;
          flex-direction: column;
          border: 1px solid #ddd;
          page-break-inside: avoid;
          min-height: 50vh;
        }
        .copy-type {
          text-align: right;
          color: #666;
          font-size: 10px;
          font-weight: 600;
          margin-bottom: 8px;
          border-bottom: 2px dashed #ccc;
          padding-bottom: 4px;
        }
        h1 { margin: 8px 0 6px; font-size: 18px; color: ${accentColor.value}; }
        .shop {
          text-align: left;
          margin-bottom: 8px;
          font-size: 14px;
        }
        .shop img {
          display: block;
          max-width: 120px;
          height: auto;
          margin-bottom: 10px;
        }
        .shop-name {
          font-weight: 800;
          font-size: 16px;
          letter-spacing: 0.2px;
        }
        .shop-line { color: #333; font-size: 12px; }
        .row { margin-bottom: 6px; font-size: 12px; }
        .label { display: inline-block; width: 100px; font-weight: 600; }
        .label::after { content: ':'; }
        .value { color: #222; }
        .print-checklists {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-top: 12px;
        }
        .print-checklist {
          border: 1px solid ${accentColor.light};
          border-radius: 10px;
          padding: 10px;
        }
        .print-checklist strong {
          display: block;
          margin-bottom: 6px;
          font-size: 12px;
          color: ${accentColor.value};
        }
        .print-checklist ul {
          list-style: none;
          display: grid;
          gap: 4px;
          padding: 0;
        }
        .print-checklist li {
          display: flex;
          gap: 6px;
          align-items: flex-start;
          font-size: 11px;
        }
        .checkmark { min-width: 14px; }
        .signatures {
          margin-top: auto;
          padding-top: 12px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .signature-block {
          flex: 1;
          text-align: center;
        }
        .signature-block p {
          font-weight: 600;
          font-size: 11px;
          margin-bottom: 3px;
        }
        .signature-line {
          border-bottom: 1px solid #333;
          height: 35px;
          margin: 4px 0;
        }
        .signature-label {
          font-size: 10px;
          font-weight: 700;
          color: #333;
          margin-top: 2px;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }
        .terms {
          margin-top: 12px;
          padding-top: 8px;
          border-top: 1px solid #ddd;
          color: #333;
        }
        .terms strong {
          display: block;
          margin-bottom: 4px;
          font-size: 9px;
          text-transform: uppercase;
        }
        .terms p {
          font-size: 8px;
          line-height: 1.35;
          text-align: justify;
          white-space: pre-line;
        }
        @media (max-width: 700px) {
          .print-page {
            grid-template-columns: 1fr;
          }
          .print-checklists {
            grid-template-columns: 1fr;
          }
        }
      </style>
    </head>
    <body>
      <div class="print-page">
        ${copyContent('Cópia Loja')}
        ${copyContent('Cópia Cliente')}
      </div>
    </body>
    </html>
  `;
}

function buildCupomPrintHtml({ title, shopBlock, rows, printChecklistSection, signatures, termsBlock, accentColor }) {
  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>${title}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        @page { size: 80mm auto; margin: 4mm; }
        body {
          font-family: "Courier New", monospace;
          color: #111;
          background: #fff;
        }
        .cupom {
          width: 72mm;
          margin: 0 auto;
          padding-bottom: 8mm;
        }
        .ticket-header {
          text-align: center;
          padding-bottom: 8px;
          border-bottom: 1px dashed #444;
          margin-bottom: 10px;
        }
        .ticket-header img {
          display: block;
          max-width: 44mm;
          max-height: 22mm;
          width: auto;
          height: auto;
          margin: 0 auto 6px;
        }
        .shop-name {
          font-size: 14px;
          font-weight: 700;
          margin-bottom: 4px;
        }
        .shop-line {
          font-size: 10px;
          line-height: 1.35;
          word-break: break-word;
        }
        .ticket-title {
          text-align: center;
          font-size: 13px;
          font-weight: 700;
          margin-bottom: 10px;
          text-transform: uppercase;
          color: ${accentColor.value};
        }
        .rows {
          display: grid;
          gap: 8px;
        }
        .row {
          display: grid;
          gap: 2px;
          font-size: 11px;
          padding-bottom: 6px;
          border-bottom: 1px dashed #d0d0d0;
        }
        .label {
          font-weight: 700;
          text-transform: uppercase;
          font-size: 10px;
        }
        .label::after { content: ':'; }
        .value {
          word-break: break-word;
          line-height: 1.35;
        }
        .print-checklists {
          display: grid;
          gap: 10px;
          margin-top: 10px;
        }
        .print-checklist {
          border-top: 1px dashed #444;
          padding-top: 8px;
        }
        .print-checklist strong {
          display: block;
          margin-bottom: 6px;
          font-size: 11px;
          text-transform: uppercase;
        }
        .print-checklist ul {
          list-style: none;
          display: grid;
          gap: 4px;
          padding: 0;
        }
        .print-checklist li {
          display: flex;
          gap: 6px;
          align-items: flex-start;
          font-size: 10px;
          line-height: 1.3;
        }
        .checkmark { min-width: 14px; }
        .signatures {
          margin-top: 12px;
          display: grid;
          gap: 12px;
          border-top: 1px dashed #444;
          padding-top: 10px;
        }
        .signature-block p {
          font-weight: 700;
          font-size: 10px;
          margin-bottom: 3px;
          text-transform: uppercase;
        }
        .signature-line {
          border-bottom: 1px solid #111;
          height: 28px;
          margin-bottom: 4px;
        }
        .signature-label {
          font-size: 9px;
          line-height: 1.3;
          text-transform: uppercase;
        }
        .ticket-footer {
          margin-top: 10px;
          padding-top: 8px;
          border-top: 1px dashed #444;
          text-align: center;
          font-size: 10px;
        }
        .terms {
          margin-top: 10px;
          padding-top: 8px;
          border-top: 1px dashed #444;
        }
        .terms strong {
          display: block;
          margin-bottom: 4px;
          font-size: 9px;
          text-transform: uppercase;
        }
        .terms p {
          font-size: 8px;
          line-height: 1.35;
          text-align: left;
          white-space: pre-line;
        }
      </style>
    </head>
    <body>
      <div class="cupom">
        <div class="ticket-header">
          ${shopBlock}
        </div>
        <div class="ticket-title">${title}</div>
        <div class="rows">
          ${rows}
        </div>
        ${printChecklistSection}
        ${signatures}
        ${termsBlock}
        <div class="ticket-footer">Comprovante de OS</div>
      </div>
    </body>
    </html>
  `;
}

function buildPrintIframe(order, title = 'Ordem de Serviço', layout = 'a4') {
  const settings = getSettingsSnapshot();
  const accentColor = getOrderAccentColor(settings);
  const logoSrc = settings.shopLogo || DEFAULT_LOGO;
  const logoHtml = `<img src="${logoSrc}" alt="Logo">`;
  const shopBlock = [
    logoHtml,
    settings.shopName && `<div class="shop-name">${settings.shopName}</div>`,
    settings.shopAddress && `<div class="shop-line"><strong>Endereço:</strong> ${settings.shopAddress}</div>`,
    settings.shopPhone && `<div class="shop-line"><strong>Telefone:</strong> ${formatPhoneDigits(settings.shopPhone)}</div>`,
    settings.shopInstagram && `<div class="shop-line"><strong>Instagram:</strong> ${settings.shopInstagram}</div>`,
    settings.shopFacebook && `<div class="shop-line"><strong>Facebook:</strong> ${settings.shopFacebook}</div>`,
  ]
    .filter(Boolean)
    .join('');

  const fields = [
    { label: 'Cliente', value: order.customerName || '-' },
    { label: 'Telefone', value: order.phone ? formatPhoneDigits(order.phone) : '-' },
    { label: 'Documento', value: order.customerDocument || '-' },
    { label: 'Aparelho', value: order.device || '-' },
    { label: 'Defeito', value: order.issue || '-' },
    { label: 'Valor', value: formatCurrency(order.price || 0) },
    { label: 'Observações', value: order.notes || '-' },
  ];

  if (order.status) fields.push({ label: 'Status', value: order.status });
  if (order.createdAt) fields.push({ label: 'Criada em', value: formatDate(order.createdAt) });
  if (order.updatedAt) fields.push({ label: 'Atualizada em', value: formatDate(order.updatedAt) });

  const rows = fields
    .map(
      (f) => `
        <div class="row">
          <span class="label">${f.label}</span>
          <span class="value">${f.value}</span>
        </div>`
    )
    .join('');

  const deviceChecklistBlock = order.deviceChecklistEnabled
    ? renderPrintChecklist(
        'Checklist do Aparelho',
        DEVICE_CHECKLIST_ITEMS,
        buildChecklistState(DEVICE_CHECKLIST_ITEMS, order.deviceChecklist)
      )
    : '';
  const accessoryChecklistBlock = order.accessoryChecklistEnabled
    ? renderPrintChecklist(
        'Periféricos Recebidos',
        ACCESSORY_CHECKLIST_ITEMS,
        buildChecklistState(ACCESSORY_CHECKLIST_ITEMS, order.accessoryChecklist)
      )
    : '';
  const printChecklistSection = deviceChecklistBlock || accessoryChecklistBlock
    ? `<div class="print-checklists">${deviceChecklistBlock}${accessoryChecklistBlock}</div>`
    : '';

  const signatures = `
      <div class="signatures">
        <div class="signature-block">
          <p style="font-weight: 600; margin-bottom: 5px;">Assinatura do Cliente</p>
          <div class="signature-line"></div>
          <div class="signature-label">${order.customerName || 'Cliente'}</div>
        </div>
        
        <div class="signature-block">
          <p style="font-weight: 600; margin-bottom: 5px;">Assinatura da Loja</p>
          <div class="signature-line"></div>
          <div class="signature-label">${settings.shopName || 'Assistência Técnica'}</div>
        </div>
      </div>`;
  const termsBlock = `
      <div class="terms">
        <strong>Termos e Condições</strong>
        <p>${escapeHtml(settings.orderTerms || ORDER_TERMS_TEXT)}</p>
      </div>`;
  return layout === 'cupom'
    ? buildCupomPrintHtml({ title, shopBlock, rows, printChecklistSection, signatures, termsBlock, accentColor })
    : buildA4PrintHtml({ title, shopBlock, rows, printChecklistSection, signatures, termsBlock, accentColor });
}

async function handleOrderPrint(order, title = 'Ordem de Serviço') {
  const layout = await choosePrintLayout();
  if (!layout) return;
  printOrder(order, title, layout);
}

function printOrder(order, title = 'Ordem de Serviço', layout = 'a4') {
  const html = buildPrintIframe(order, title, layout);

  // Criar iframe para impressão (funciona em mobile)
  const iframe = document.createElement('iframe');
  iframe.id = 'print-iframe-' + Date.now();
  iframe.style.display = 'none';
  iframe.style.position = 'absolute';
  iframe.style.left = '-9999px';
  document.body.appendChild(iframe);
  
  try {
    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
    iframeDoc.open();
    iframeDoc.write(html);
    iframeDoc.close();
    
    // Aguardar carregamento do conteúdo
    iframe.onload = function() {
      try {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      } catch (e) {
        console.error('Erro ao imprimir:', e);
      }
      
      // Remover iframe após um tempo
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 1000);
    };
    
    // Fallback se onload não disparar
    setTimeout(() => {
      try {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      } catch (e) {
        console.error('Erro ao imprimir (fallback):', e);
      }
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
    }, 500);
  } catch (e) {
    console.error('Erro ao criar iframe de impressão:', e);
    if (document.body.contains(iframe)) {
      document.body.removeChild(iframe);
    }
  }
}

function statusChip(status) {
  const map = {
    'Aguardando': { cls: 'await', label: 'Aguardando' },
    'Em andamento': { cls: 'progress', label: 'Em andamento' },
    'Finalizado': { cls: 'done', label: 'Finalizado' },
  };
  const cfg = map[status] || map['Aguardando'];
  return `<span class="chip ${cfg.cls}"><span></span>${cfg.label}</span>`;
}

function getDateLabel(dateString) {
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) {
    return 'Hoje';
  } else if (date.toDateString() === yesterday.toDateString()) {
    return 'Ontem';
  } else {
    return date.toLocaleDateString('pt-BR');
  }
}

function renderOrders() {
  const term = els.search.value.toLowerCase();
  const activeFilter =
    Array.from(els.filterButtons).find((b) => b.classList.contains('active')) || null;
  const status = activeFilter ? activeFilter.dataset.status : '';
  let orders = loadOrders().filter((o) => {
    const matchTerm =
      o.customerName.toLowerCase().includes(term) ||
      o.device.toLowerCase().includes(term);
    const matchStatus = term ? true : (status ? o.status === status : true);
    return matchTerm && matchStatus;
  });

  if (!orders.length) {
    els.ordersList.innerHTML = `<p class="meta">Nenhuma OS encontrada.</p>`;
    return;
  }

  // Sort by createdAt descending
  orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  // Group by date label
  const groups = {};
  orders.forEach((o) => {
    const label = getDateLabel(o.createdAt);
    if (!groups[label]) groups[label] = [];
    groups[label].push(o);
  });

  // Build HTML
  let html = '';
  Object.keys(groups).forEach((label) => {
    html += `<section class="date-group">
      <h3 class="date-header">${label}</h3>
      <div class="cards">
        ${groups[label]
          .map(
            (o) => `
        <article class="card" data-id="${o.id}">
          <header>
            <div>
              <strong>${o.customerName}</strong>
              <div class="meta">${o.device}</div>
            </div>
            ${statusChip(o.status)}
          </header>
          <div class="meta">${o.issue}</div>
          <div class="meta">Atualizado: ${formatDate(o.updatedAt)}</div>
          <div class="price">${formatCurrency(o.price)}</div>
        </article>`
          )
          .join('')}
      </div>
    </section>`;
  });

  els.ordersList.innerHTML = html;

  document.querySelectorAll('.card').forEach((card) =>
    card.addEventListener('click', () => openDetail(card.dataset.id))
  );
}

function clearForm() {
  editingId = null;
  els.formTitle.textContent = 'Nova OS';
  els.form.reset();
  formFields.price.dataset.raw = 0;
  formFields.cost.dataset.raw = 0;
  setChecklistEnabled('device', false);
  setChecklistEnabled('accessory', false);
  writeChecklistState('device', DEVICE_CHECKLIST_ITEMS, buildChecklistState(DEVICE_CHECKLIST_ITEMS));
  writeChecklistState('accessory', ACCESSORY_CHECKLIST_ITEMS, buildChecklistState(ACCESSORY_CHECKLIST_ITEMS));
  updateDeviceChecklistVisibility({ clearHidden: true });
  updateAccessoryChecklistVisibility({ clearHidden: true });
}

function openScreen(target) {
  const element = els.screens[target] || document.getElementById(target);
  if (!element) return;
  const app = document.getElementById('app');

  Object.values(els.screens).forEach((s) => s.classList.remove('active'));
  element.classList.add('active');
  app?.classList.toggle('home-header-active', element.id === 'listView');

  els.navButtons.forEach((btn) =>
    btn.classList.toggle('active', btn.dataset.target === element.id)
  );

  if (element.id === 'financeView') updateFinance();
  if (element.id === 'settingsView') renderSettings();
}

function openForm(editOrder) {
  openScreen('formView');
  if (editOrder) {
    editingId = editOrder.id;
    els.formTitle.textContent = 'Editar OS';
    formFields.customerName.value = editOrder.customerName;
    formFields.phone.value = editOrder.phone || '';
    formFields.customerDocument.value = editOrder.customerDocument || '';
    formFields.device.value = editOrder.device;
    formFields.issue.value = editOrder.issue;
    formFields.price.value = editOrder.price || 0;
    formFields.cost.value = editOrder.cost || 0;
    formatCurrencyInput(formFields.price);
    formatCurrencyInput(formFields.cost);
    formatPhoneInput(formFields.phone);
    formFields.notes.value = editOrder.notes;
    setChecklistEnabled('device', editOrder.deviceChecklistEnabled);
    setChecklistEnabled('accessory', editOrder.accessoryChecklistEnabled);
    writeChecklistState('device', DEVICE_CHECKLIST_ITEMS, buildChecklistState(DEVICE_CHECKLIST_ITEMS, editOrder.deviceChecklist));
    writeChecklistState('accessory', ACCESSORY_CHECKLIST_ITEMS, buildChecklistState(ACCESSORY_CHECKLIST_ITEMS, editOrder.accessoryChecklist));
    updateDeviceChecklistVisibility();
    updateAccessoryChecklistVisibility();
  } else {
    clearForm();
  }
}

function openDetail(id) {
  const order = loadOrders().find((o) => o.id === id);
  if (!order) return;
  if (detailCurrentId !== id) detailHistoryExpanded = false;
  detailCurrentId = id;
  detailPendingStatus = order.status;

  const sortedHistory = order.history
    .slice()
    .sort((a, b) => new Date(b.date) - new Date(a.date));
  const visibleHistory = detailHistoryExpanded ? sortedHistory : sortedHistory.slice(0, 4);
  const historyList = visibleHistory.map((h) => `<li>${formatDate(h.date)} - ${h.action}</li>`).join('');
  const showToggleHistory = sortedHistory.length > 4;
  const historyToggleButton = showToggleHistory
    ? `<button data-action="toggle-history" class="ghost-btn history-toggle-btn">${detailHistoryExpanded ? 'Ver menos' : 'Ver mais'}</button>`
    : '';
  const deviceChecklistSummary = order.deviceChecklistEnabled
    ? renderChecklistSummary(
        'Checklist do aparelho',
        getCheckedChecklistLabels(
          DEVICE_CHECKLIST_ITEMS,
          buildChecklistState(DEVICE_CHECKLIST_ITEMS, order.deviceChecklist)
        )
      )
    : '';
  const accessoryChecklistSummary = order.accessoryChecklistEnabled
    ? renderChecklistSummary(
        'Periféricos recebidos',
        getCheckedChecklistLabels(
          ACCESSORY_CHECKLIST_ITEMS,
          buildChecklistState(ACCESSORY_CHECKLIST_ITEMS, order.accessoryChecklist)
        )
      )
    : '';

  els.detailContent.innerHTML = `
    <div class="detail-grid">
      <div><strong>Cliente:</strong> ${order.customerName}</div>
      <div><strong>Telefone:</strong> ${order.phone ? formatPhoneDigits(order.phone) : '-'}</div>
      <div><strong>Documento:</strong> ${order.customerDocument || '-'}</div>
      <div><strong>Aparelho:</strong> ${order.device}</div>
      <div><strong>Defeito:</strong> ${order.issue}</div>
      <div><strong>Valor:</strong> ${formatCurrency(order.price)}</div>
      <div><strong>Custo:</strong> ${formatCurrency(order.cost || 0)}</div>
      <div><strong>Lucro:</strong> ${formatCurrency((order.price || 0) - (order.cost || 0))}</div>
      <div><strong>Status:</strong> ${statusChip(order.status)}</div>
      <div><strong>Observações:</strong> ${order.notes || '-'}</div>
      <div><strong>Criada em:</strong> ${formatDate(order.createdAt)}</div>
      <div><strong>Atualizada em:</strong> ${formatDate(order.updatedAt)}</div>
    </div>
    ${deviceChecklistSummary}
    ${accessoryChecklistSummary}
    <div class="history">
      <strong>Histórico</strong>
      <ul>${historyList || '<li>-</li>'}</ul>
      ${historyToggleButton}
    </div>
    <div class="detail-actions status-row">
      <strong class="group-title">Status</strong>
      <button data-action="status" data-status="Aguardando" class="filter-btn">Aguardando</button>
      <button data-action="status" data-status="Em andamento" class="filter-btn">Em andamento</button>
      <button data-action="status" data-status="Finalizado" class="filter-btn">Finalizar</button>
    </div>
    <div class="detail-actions contact-row">
      <strong class="group-title">Contato</strong>
      <button data-action="whatsapp" class="whatsapp-btn icon-btn">WhatsApp</button>
      <button data-action="call" class="call-btn icon-btn">Ligar</button>
    </div>
    <div class="detail-actions action-row">
      <strong class="group-title">Ações</strong>
      <button data-action="edit" class="primary-btn icon-btn">Editar</button>
      <button data-action="share-pdf" class="ghost-btn whatsapp-pdf-btn icon-btn">WhatsApp PDF</button>
      <button data-action="print" class="ghost-btn icon-btn">Imprimir</button>
      <button data-action="delete" class="ghost-btn delete-btn icon-btn">Excluir</button>
    </div>
  `;

  els.detailContent.querySelectorAll('button').forEach((btn) => {
    btn.onclick = () => handleDetailAction(order.id, btn.dataset);
  });

  setPendingStatus(detailPendingStatus);
  openScreen('detailView');
}

async function handleDetailAction(id, dataset) {
  if (dataset.action === 'toggle-history') {
    detailHistoryExpanded = !detailHistoryExpanded;
    openDetail(id);
    return;
  }
  if (dataset.action === 'status') {
    setPendingStatus(dataset.status);
    try {
      await saveManual(id);
    } catch (error) {
      await alertModal('Falhou ao sincronizar a alteração de status com o Firebase.');
      return;
    }
    renderOrders();
    updateFinance();
    openDetail(id); // Refresh the detail view
  }
  if (dataset.action === 'edit') {
    const order = loadOrders().find((o) => o.id === id);
    openForm(order);
  }
  if (dataset.action === 'delete') {
    if (await confirmModal('Deseja remover esta OS?')) {
      const filtered = loadOrders().filter((o) => o.id !== id);
      saveOrders(filtered);
      try {
        await deleteOrderRemote(id);
      } catch (error) {
        await alertModal('A OS foi removida do cache local, mas falhou a exclusão no Firebase.');
        return;
      }
      renderOrders();
      openScreen('listView');
      updateFinance();
    }
  }
  if (dataset.action === 'print') {
    const order = loadOrders().find((o) => o.id === id);
    if (order) {
      await handleOrderPrint(order, 'Ordem de Serviço');
    }
  }
  if (dataset.action === 'share-pdf') {
    const order = loadOrders().find((o) => o.id === id);
    if (order) {
      await sendOrderPdfViaWhatsApp(order, 'Ordem de Serviço');
    }
  }
  if (dataset.action === 'whatsapp') {
    const order = loadOrders().find((o) => o.id === id);
    if (order) {
      handleWhatsAppContact(order);
    }
  }
  if (dataset.action === 'call') {
    const order = loadOrders().find((o) => o.id === id);
    if (order) {
      handlePhoneCall(order.phone);
    }
  }
}

/**
 * Contatar cliente via WhatsApp com mensagem pré-pronta
 */
function handleWhatsAppContact(order) {
  if (!order.phone) {
    alertModal('Telefone do cliente não cadastrado');
    return;
  }

  // Limpar número para o padrão internacional
  const whatsappNumber = getWhatsAppNumber(order.phone);
  
  if (!whatsappNumber) {
    alertModal('Número de telefone inválido');
    return;
  }

  // Obter nome da assistência (do settings ou padrão)
  const settings = loadSettings();
  const shopName = settings.shopName || 'Assistência';

  // Criar mensagem simples
  const message = `Olá ${order.customerName}, aqui é da assistência ${shopName} referente a seu aparelho ${order.device}`;

  // Codificar mensagem para URL
  const encodedMessage = encodeURIComponent(message);
  
  // Link do WhatsApp
  const whatsappURL = `https://wa.me/${whatsappNumber}?text=${encodedMessage}`;
  
  // Abrir em nova aba
  window.open(whatsappURL, '_blank');
}

/**
 * Fazer ligação direta para o cliente
 */
function handlePhoneCall(phone) {
  if (!phone) {
    alertModal('Telefone do cliente não cadastrado');
    return;
  }

  const phoneNumber = parsePhone(phone);
  
  if (!isValidBrazilPhone(phoneNumber)) {
    alertModal('Número de telefone inválido');
    return;
  }

  // Verificar se está em um dispositivo que suporta ligações
  if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
    // Mobile - fazer ligação direta
    window.location.href = `tel:+55${phoneNumber}`;
  } else {
    // Desktop - copiar número para clipboard e mostrar aviso
    const fullNumber = `+55${phoneNumber}`;
    navigator.clipboard.writeText(fullNumber).then(() => {
      alertModal(`Número copiado para área de transferência:\n${fullNumber}\n\nFaça a ligação usando seu telefone.`);
    }).catch(() => {
      alertModal(`Para ligar:\n+55${phoneNumber}`);
    });
  }
}

async function updateStatus(id, newStatus) {
  const orders = loadOrders().map((o) => {
    if (o.id !== id) return o;
    const now = new Date().toISOString();
    return {
      ...o,
      status: newStatus,
      updatedAt: now,
      finalizedAt: getFinalizedAtForStatusChange(o, newStatus, now),
      history: [...o.history, { date: now, action: `Status alterado para ${newStatus}` }],
    };
  });
  saveOrders(orders);
  const updatedOrder = orders.find((order) => order.id === id);
  if (updatedOrder) await saveOrderRemote(updatedOrder);
}

async function saveManual(id) {
  const orders = loadOrders().map((o) => {
    if (o.id !== id) return o;
    const now = new Date().toISOString();
    const statusChanged = detailPendingStatus && detailPendingStatus !== o.status;
    const nextStatus = statusChanged ? detailPendingStatus : o.status;
    return {
      ...o,
      status: nextStatus,
      updatedAt: now,
      finalizedAt: getFinalizedAtForStatusChange(o, nextStatus, now),
      history: [
        ...o.history,
        ...(statusChanged ? [{ date: now, action: `Status alterado para ${detailPendingStatus}` }] : []),
        { date: now, action: 'OS salva manualmente' },
      ],
    };
  });
  saveOrders(orders);
  const updatedOrder = orders.find((order) => order.id === id);
  if (updatedOrder) await saveOrderRemote(updatedOrder);
}

async function handleSubmit(event) {
  event.preventDefault();
  const data = {
    customerName: formFields.customerName.value.trim(),
    phone: parsePhone(formFields.phone.value),
    customerDocument: formFields.customerDocument.value.trim(),
    deviceChecklistEnabled: isChecklistEnabled('device'),
    accessoryChecklistEnabled: isChecklistEnabled('accessory'),
    deviceChecklist: getDeviceChecklistStateFromForm(),
    accessoryChecklist: isChecklistEnabled('accessory')
      ? readChecklistState('accessory', ACCESSORY_CHECKLIST_ITEMS)
      : buildChecklistState(ACCESSORY_CHECKLIST_ITEMS),
    device: formFields.device.value.trim(),
    issue: formFields.issue.value.trim(),
    price: parseCurrency(formFields.price.value),
    cost: parseCurrency(formFields.cost.value),
    notes: formFields.notes.value.trim(),
  };

  if (!data.customerName || !data.device || !data.issue) {
    await alertModal('Preencha nome, aparelho e defeito.');
    return;
  }

  const orders = loadOrders();
  try {
    if (editingId) {
      const now = new Date().toISOString();
      const updated = orders.map((o) =>
        o.id === editingId
          ? {
              ...o,
              ...data,
              price: data.price,
              cost: data.cost,
              updatedAt: now,
              finalizedAt:
                o.status === 'Finalizado'
                  ? o.finalizedAt || o.updatedAt || o.createdAt || now
                  : '',
              history: [...o.history, { date: now, action: 'OS editada' }],
            }
          : o
      );
      saveOrders(updated);
      const updatedOrder = updated.find((order) => order.id === editingId);
      if (updatedOrder) await saveOrderRemote(updatedOrder);
    } else {
      const newOrder = createOrderObject({ ...data, status: 'Aguardando' });
      orders.unshift(newOrder);
      saveOrders(orders);
      await saveOrderRemote(newOrder);
    }
  } catch (error) {
    await alertModal('A OS foi atualizada no cache local, mas falhou ao sincronizar com o Firebase.');
    return;
  }

  clearForm();
  renderOrders();
  updateFinance();
  openScreen('listView');
}

function getFormOrderLike() {
  return {
    customerName: formFields.customerName.value.trim() || '(sem nome)',
    phone: parsePhone(formFields.phone.value),
    customerDocument: formFields.customerDocument.value.trim() || '-',
    deviceChecklistEnabled: isChecklistEnabled('device'),
    accessoryChecklistEnabled: isChecklistEnabled('accessory'),
    deviceChecklist: getDeviceChecklistStateFromForm(),
    accessoryChecklist: isChecklistEnabled('accessory')
      ? readChecklistState('accessory', ACCESSORY_CHECKLIST_ITEMS)
      : buildChecklistState(ACCESSORY_CHECKLIST_ITEMS),
    device: formFields.device.value.trim() || '-',
    issue: formFields.issue.value.trim() || '-',
    price: parseCurrency(formFields.price.value),
    cost: parseCurrency(formFields.cost.value),
    notes: formFields.notes.value.trim() || '-',
    status: 'Aguardando',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

async function handleFormPrint() {
  await handleOrderPrint(getFormOrderLike(), 'Nova OS');
}

async function handleFormSharePdf() {
  await sendOrderPdfViaWhatsApp(getFormOrderLike(), 'Nova OS');
}

function renderSettings() {
  const settings = loadSettings();
  const profileImage = settings.shopLogo || DEFAULT_PROFILE_PHOTO;
  // Display in profile
  els.profileElements.avatar.src = profileImage;
  els.profileElements.headerAvatar.src = profileImage;
  els.profileElements.name.textContent = settings.shopName || 'Nome da Loja';
  els.profileElements.address.textContent = settings.shopAddress || 'Endereço';
  els.profileElements.phone.textContent = settings.shopPhone ? formatPhoneDigits(settings.shopPhone) : '-';
  els.profileElements.instagram.textContent = settings.shopInstagram || '-';
  els.profileElements.facebook.textContent = settings.shopFacebook || '-';
  els.profileElements.orderTerms.textContent = settings.orderTerms || ORDER_TERMS_TEXT;
  const accentColor = getOrderAccentColor(settings);
  els.profileElements.accentLabel.textContent = accentColor.label;
  els.profileElements.accentSwatch.style.backgroundColor = accentColor.value;

  closeSettingsModal();
}

function enableSettingsEdit() {
  const settings = loadSettings();
  Object.entries(els.settingsFields).forEach(([key, input]) => {
    if (key === 'shopLogoFile') {
      input.value = '';
      return;
    }
    const val = settings[key] || '';
    if (key === 'orderTerms') {
      input.value = val || ORDER_TERMS_TEXT;
      return;
    }
    if (key === 'orderAccentColor') {
      input.value = ORDER_ACCENT_COLORS[val] ? val : DEFAULT_SETTINGS.orderAccentColor;
      return;
    }
    input.value = key === 'shopPhone' ? formatPhoneDigits(parsePhone(val)) : val;
  });
  els.settingsForm.classList.remove('hidden');
}

function closeSettingsModal() {
  els.settingsForm.classList.add('hidden');
}

async function handleSettingsSave(event) {
  event.preventDefault();
  const current = loadSettings();
  let shopLogo = current.shopLogo || '';
  const logoFile = els.settingsFields.shopLogoFile.files?.[0];
  if (logoFile) {
    if (logoFile.size > 250 * 1024) {
      await alertModal('A imagem da logo deve ter no maximo 250KB para funcionar sem Firebase Storage.');
      return;
    }
    try {
      shopLogo = await readFileAsDataUrl(logoFile);
    } catch (error) {
      await alertModal('Falhou ao ler a logo selecionada.');
      return;
    }
  }

  const data = {
    shopName: els.settingsFields.shopName.value.trim(),
    shopAddress: els.settingsFields.shopAddress.value.trim(),
    shopPhone: parsePhone(els.settingsFields.shopPhone.value),
    shopInstagram: els.settingsFields.shopInstagram.value.trim(),
    shopFacebook: els.settingsFields.shopFacebook.value.trim(),
    orderTerms: els.settingsFields.orderTerms.value.trim(),
    orderAccentColor: ORDER_ACCENT_COLORS[els.settingsFields.orderAccentColor.value]
      ? els.settingsFields.orderAccentColor.value
      : DEFAULT_SETTINGS.orderAccentColor,
    shopLogo,
  };
  saveSettings(data);
  try {
    await saveSettingsRemote(data);
  } catch (error) {
    await alertModal('As configurações foram salvas no cache local, mas falhou a sincronização com o Firebase.');
    return;
  }
  renderSettings();
  await alertModal('Configurações salvas.');
}

function cancelSettingsEdit() {
  closeSettingsModal();
}

function updateFinance() {
  let orders = loadOrders().filter((o) => o.status === 'Finalizado');

  // Sort by finalizedAt descending
  orders.sort((a, b) => new Date(getFinanceReferenceDate(b)) - new Date(getFinanceReferenceDate(a)));

  const today = new Date();
  const totalDay = orders
    .filter((o) => {
      const d = new Date(getFinanceReferenceDate(o));
      return d.toDateString() === today.toDateString();
    })
    .reduce((sum, o) => sum + (o.price || 0), 0);
  const costDay = orders
    .filter((o) => {
      const d = new Date(getFinanceReferenceDate(o));
      return d.toDateString() === today.toDateString();
    })
    .reduce((sum, o) => sum + (o.cost || 0), 0);

  // Calculate start of week (Monday)
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay() + 1); // Monday
  startOfWeek.setHours(0, 0, 0, 0);
  const totalWeek = orders
    .filter((o) => {
      const d = new Date(getFinanceReferenceDate(o));
      return d >= startOfWeek;
    })
    .reduce((sum, o) => sum + (o.price || 0), 0);
  const costWeek = orders
    .filter((o) => {
      const d = new Date(getFinanceReferenceDate(o));
      return d >= startOfWeek;
    })
    .reduce((sum, o) => sum + (o.cost || 0), 0);

  const totalMonth = orders
    .filter((o) => {
      const d = new Date(getFinanceReferenceDate(o));
      return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
    })
    .reduce((sum, o) => sum + (o.price || 0), 0);
  const costMonth = orders
    .filter((o) => {
      const d = new Date(getFinanceReferenceDate(o));
      return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
    })
    .reduce((sum, o) => sum + (o.cost || 0), 0);

  els.financeTotals.day.textContent = formatCurrency(totalDay);
  document.getElementById('costDay').textContent = `Custo: ${formatCurrency(costDay)}`;
  document.getElementById('profitDay').textContent = `Lucro: ${formatCurrency(totalDay - costDay)}`;
  els.financeTotals.week.textContent = formatCurrency(totalWeek);
  document.getElementById('costWeek').textContent = `Custo: ${formatCurrency(costWeek)}`;
  document.getElementById('profitWeek').textContent = `Lucro: ${formatCurrency(totalWeek - costWeek)}`;
  els.financeTotals.month.textContent = formatCurrency(totalMonth);
  document.getElementById('costMonth').textContent = `Custo: ${formatCurrency(costMonth)}`;
  document.getElementById('profitMonth').textContent = `Lucro: ${formatCurrency(totalMonth - costMonth)}`;

  // Group by date label
  const groups = {};
  orders.forEach((o) => {
    const label = getDateLabel(getFinanceReferenceDate(o));
    if (!groups[label]) groups[label] = [];
    groups[label].push(o);
  });

  // Build HTML
  let html = '';
  Object.keys(groups).forEach((label) => {
    html += `<section class="date-group">
      <h3 class="date-header">${label}</h3>
      <div class="cards compact">
        ${groups[label]
          .map(
            (o) => `
        <article class="card">
          <header>
            <strong>${o.customerName}</strong>
            <span class="price">${formatCurrency(o.price)}</span>
          </header>
          <div class="meta">${o.device}</div>
          <div class="finance-meta-row">
            <span class="finance-badge cost">Custo: ${formatCurrency(o.cost || 0)}</span>
            <span class="finance-badge profit">Lucro: ${formatCurrency((o.price || 0) - (o.cost || 0))}</span>
          </div>
          <div class="meta">Finalizado em ${formatDate(getFinanceReferenceDate(o))}</div>
        </article>`
          )
          .join('')}
      </div>
    </section>`;
  });

  els.financeList.innerHTML = html;
}

function initNavigation() {
  els.navButtons.forEach((btn) =>
    btn.addEventListener('click', () => {
      if (btn.dataset.target === 'formView') {
        clearForm();
      }
      openScreen(btn.dataset.target);
    })
  );
}

function bindEvents() {
  els.loginForm?.addEventListener('submit', handleLoginSubmit);
  els.logoutBtn?.addEventListener('click', async () => {
    try {
      await handleLogout();
    } catch (error) {
      setAppMode('app');
      await alertModal('Não foi possível sair agora.');
    }
  });
  els.search.addEventListener('input', renderOrders);
  els.filterButtons.forEach((btn) =>
    btn.addEventListener('click', () => {
      els.filterButtons.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      renderOrders();
    })
  );
  els.openProfileHeader?.addEventListener('click', () => openScreen('settingsView'));
  els.closeForm.addEventListener('click', () => openScreen('listView'));
  els.cancelForm.addEventListener('click', () => openScreen('listView'));
  els.form.addEventListener('submit', handleSubmit);
  els.closeDetail.addEventListener('click', () => openScreen('listView'));
  document.getElementById('closeFinance').addEventListener('click', () => openScreen('listView'));
  document.getElementById('printForm').addEventListener('click', handleFormPrint);
  document.getElementById('sharePdfForm')?.addEventListener('click', handleFormSharePdf);
  els.settingsForm.addEventListener('submit', handleSettingsSave);
  document.getElementById('editSettings').addEventListener('click', enableSettingsEdit);
  document.getElementById('cancelSettings').addEventListener('click', cancelSettingsEdit);
  els.settingsForm.addEventListener('click', (event) => {
    if (event.target === els.settingsForm) closeSettingsModal();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !els.settingsForm.classList.contains('hidden')) {
      closeSettingsModal();
    }
  });
  document.querySelectorAll('.close-settings').forEach((btn) =>
    btn.addEventListener('click', () => openScreen('listView'))
  );
  [formFields.price, formFields.cost].forEach((field) => {
    field.addEventListener('input', () => formatCurrencyInputLive(field));
    field.addEventListener('blur', () => formatCurrencyInput(field));
  });
  formFields.phone.addEventListener('input', () => formatPhoneInput(formFields.phone));
  formFields.phone.addEventListener('blur', () => formatPhoneInput(formFields.phone));
  els.settingsFields.shopPhone.addEventListener('input', () => formatPhoneInput(els.settingsFields.shopPhone));
  els.settingsFields.shopPhone.addEventListener('blur', () => formatPhoneInput(els.settingsFields.shopPhone));
  document.querySelectorAll('input[name="deviceChecklistEnabled"]').forEach((input) => {
    input.addEventListener('change', () => updateDeviceChecklistVisibility({ clearHidden: true }));
  });
  document.querySelectorAll('input[name="accessoryChecklistEnabled"]').forEach((input) => {
    input.addEventListener('change', () => updateAccessoryChecklistVisibility({ clearHidden: true }));
  });
  getChecklistInput('device', 'doesNotPowerOn')?.addEventListener('change', () => {
    updateDeviceChecklistVisibility({ clearHidden: true });
  });
}

async function start() {
  bindEvents();
  initNavigation();
  updateDeviceChecklistVisibility({ clearHidden: true });
  updateAccessoryChecklistVisibility({ clearHidden: true });
  await bootstrapAuth();
}

start().catch((error) => {
  setAppMode('login');
  setLoginFeedback('Falha ao iniciar o sistema.');
  console.error(error);
});
function setPendingStatus(status) {
  detailPendingStatus = status;
  document.querySelectorAll('.status-row button').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.status === status);
  });
}

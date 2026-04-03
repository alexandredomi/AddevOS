const STORAGE_KEY = 'orders';
const SETTINGS_KEY = 'settings';

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
  filterGroup: document.querySelector('.filter-group'),
  ordersList: document.getElementById('ordersList'),
  navButtons: document.querySelectorAll('.nav-btn'),
  form: document.getElementById('orderForm'),
  formTitle: document.getElementById('formTitle'),
  closeForm: document.getElementById('closeForm'),
  cancelForm: document.getElementById('cancelForm'),
  settingsForm: document.getElementById('settingsForm'),
  settingsFields: {
    shopName: document.getElementById('shopName'),
    shopAddress: document.getElementById('shopAddress'),
    shopPhone: document.getElementById('shopPhone'),
    shopInstagram: document.getElementById('shopInstagram'),
    shopFacebook: document.getElementById('shopFacebook'),
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
    month: document.getElementById('totalMonth'),
    all: document.getElementById('totalAll'),
  },
  financeList: document.getElementById('financeList'),
};

const formFields = {
  customerName: document.getElementById('customerName'),
  phone: document.getElementById('phone'),
  device: document.getElementById('device'),
  issue: document.getElementById('issue'),
  price: document.getElementById('price'),
  cost: document.getElementById('cost'),
  notes: document.getElementById('notes'),
};

let editingId = null;
let detailPendingStatus = null;
let detailCurrentId = null;

function loadOrders() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved)
    return JSON.parse(saved).map((o) => ({
      ...o,
      price: Number(o.price) || 0,
      cost: Number(o.cost) || 0,
    }));

  const seed = [
    createOrderObject({
      customerName: 'João Silva',
      phone: '11999999999',
      device: 'iPhone 13',
      issue: 'Tela trincada',
      price: 1200,
      cost: 650,
      notes: 'Cliente solicita troca rápida',
      status: 'Aguardando',
    }),
    createOrderObject({
      customerName: 'Maria Costa',
      phone: '11988887777',
      device: 'Notebook Dell',
      issue: 'Sem vídeo',
      price: 850,
      cost: 300,
      notes: 'Verificar placa de vídeo',
      status: 'Em andamento',
    }),
    createOrderObject({
      customerName: 'Pedro Santos',
      phone: '11911114444',
      device: 'Samsung S22',
      issue: 'Bateria descarregando rápido',
      price: 680,
      cost: 220,
      notes: 'Troca de bateria',
      status: 'Finalizado',
    }),
  ];
  saveOrders(seed);
  return seed;
}

function saveOrders(orders) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
}

function loadSettings() {
  const saved = localStorage.getItem(SETTINGS_KEY);
  if (saved) return JSON.parse(saved);
  const defaults = {
    shopName: '',
    shopAddress: '',
    shopPhone: '',
    shopInstagram: '',
    shopFacebook: '',
  };
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(defaults));
  return defaults;
}

function saveSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

function createOrderObject({
  customerName,
  phone = '',
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
    device,
    issue,
    price: Number(price) || 0,
    cost: Number(cost) || 0,
    notes,
    status,
    createdAt: now,
    updatedAt: now,
    history: [
      { date: now, action: 'OS criada' },
      { date: now, action: `Status definido: ${status}` },
    ],
  };
}

function formatCurrency(value) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function parseCurrency(str) {
  if (!str) return 0;
  const digits = str.toString().replace(/\D/g, '');
  return digits ? Number(digits) / 100 : 0;
}

function formatCurrencyInput(input) {
  const num = parseCurrency(input.value);
  input.value = num ? formatCurrency(num) : '';
  input.dataset.raw = num;
}

function parsePhone(str) {
  return (str || '').toString().replace(/\D/g, '').slice(0, 11);
}

function formatPhoneDigits(digits) {
  const only = parsePhone(digits);
  const len = only.length;
  if (!len) return '';

  if (len <= 2) return `(${only}`;

  if (len <= 7) {
    return `(${only.slice(0, 2)}) ${only.slice(2)}`;
  }

  // len 8-11
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
  // If the form is loaded, prefer what's on screen (even se ainda não salvou)
  const formValues = els.settingsFields
    ? {
        shopName: els.settingsFields.shopName.value.trim(),
        shopAddress: els.settingsFields.shopAddress.value.trim(),
        shopPhone: formatPhoneDigits(parsePhone(els.settingsFields.shopPhone.value)),
        shopInstagram: els.settingsFields.shopInstagram.value.trim(),
        shopFacebook: els.settingsFields.shopFacebook.value.trim(),
      }
    : {};

  const merged = { ...saved, ...formValues };
  return merged;
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

function printOrder(order, title = 'Ordem de Serviço') {
  const settings = getSettingsSnapshot();
  const shopBlock = [
    settings.shopName && `<div class="shop-name">${settings.shopName}</div>`,
    settings.shopAddress && `<div class="shop-line">${settings.shopAddress}</div>`,
    settings.shopPhone && `<div class="shop-line">Tel: ${formatPhoneDigits(settings.shopPhone)}</div>`,
    settings.shopInstagram && `<div class="shop-line">Instagram: ${settings.shopInstagram}</div>`,
    settings.shopFacebook && `<div class="shop-line">Facebook: ${settings.shopFacebook}</div>`,
  ]
    .filter(Boolean)
    .join('');

  const fields = [
    { label: 'Cliente', value: order.customerName || '-' },
    { label: 'Telefone', value: order.phone ? formatPhoneDigits(order.phone) : '-' },
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
          <span class="label">${f.label}:</span>
          <span class="value">${f.value}</span>
        </div>`
    )
    .join('');

  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>${title}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 24px; color: #111; }
        h1 { margin: 12px 0 10px; font-size: 22px; }
        .shop {
          text-align: left;
          margin-bottom: 14px;
        }
        .shop-name {
          font-weight: 800;
          font-size: 18px;
          letter-spacing: 0.2px;
        }
        .shop-line { color: #333; font-size: 13px; }
        .row { margin-bottom: 10px; }
        .label { display: inline-block; width: 140px; font-weight: 600; }
        .value { color: #222; }
      </style>
    </head>
    <body>
      ${shopBlock ? `<div class="shop">${shopBlock}</div>` : ''}
      <h1>${title}</h1>
      ${rows}
    </body>
    </html>
  `;

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.style.visibility = 'hidden';
  iframe.srcdoc = html;
  document.body.appendChild(iframe);

  iframe.onload = () => {
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
    setTimeout(() => iframe.remove(), 300);
  };
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

function renderOrders() {
  const term = els.search.value.toLowerCase();
  const activeFilter =
    Array.from(els.filterButtons).find((b) => b.classList.contains('active')) || null;
  const status = activeFilter ? activeFilter.dataset.status : '';
  const orders = loadOrders().filter((o) => {
    const matchTerm =
      o.customerName.toLowerCase().includes(term) ||
      o.device.toLowerCase().includes(term);
    const matchStatus = status ? o.status === status : true;
    return matchTerm && matchStatus;
  });

  if (!orders.length) {
    els.ordersList.innerHTML = `<p class="meta">Nenhuma OS encontrada.</p>`;
    return;
  }

  els.ordersList.innerHTML = orders
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
    .join('');

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
}

function openScreen(target) {
  const element = els.screens[target] || document.getElementById(target);
  if (!element) return;

  Object.values(els.screens).forEach((s) => s.classList.remove('active'));
  element.classList.add('active');

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
    formFields.device.value = editOrder.device;
    formFields.issue.value = editOrder.issue;
    formFields.price.value = editOrder.price;
    formFields.cost.value = editOrder.cost || 0;
    formatCurrencyInput(formFields.price);
    formatCurrencyInput(formFields.cost);
    formatPhoneInput(formFields.phone);
    formFields.notes.value = editOrder.notes;
  } else {
    clearForm();
  }
}

function openDetail(id) {
  const order = loadOrders().find((o) => o.id === id);
  if (!order) return;
  detailCurrentId = id;
  detailPendingStatus = order.status;

  const historyList = order.history
    .slice()
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .map((h) => `<li>${formatDate(h.date)} — ${h.action}</li>`)
    .join('');

  els.detailContent.innerHTML = `
    <div class="detail-grid">
      <div><strong>Cliente:</strong> ${order.customerName}</div>
      <div><strong>Telefone:</strong> ${order.phone ? formatPhoneDigits(order.phone) : '-'}</div>
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
    <div class="history">
      <strong>Histórico</strong>
      <ul>${historyList}</ul>
    </div>
    <div class="detail-actions status-row">
      <strong class="group-title">Status</strong>
      <button data-action="status" data-value="Aguardando" class="ghost-btn status-await icon-btn">Aguardando</button>
      <button data-action="status" data-value="Em andamento" class="ghost-btn status-progress icon-btn">Em andamento</button>
      <button data-action="status" data-value="Finalizado" class="ghost-btn status-done icon-btn">Finalizar</button>
    </div>
    <div class="detail-actions action-row">
      <strong class="group-title">Ações</strong>
      <button data-action="save" class="primary-btn icon-btn">Salvar</button>
      <button data-action="edit" class="primary-btn icon-btn">Editar</button>
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
  if (dataset.action === 'status') {
    setPendingStatus(dataset.value);
  }
  if (dataset.action === 'save') {
    if (await confirmModal('Deseja salvar esta OS?')) {
      saveManual(id);
      renderOrders();
      openDetail(id);
      updateFinance();
      await alertModal('OS salva com sucesso.');
    }
  }
  if (dataset.action === 'edit') {
    const order = loadOrders().find((o) => o.id === id);
    openForm(order);
  }
  if (dataset.action === 'delete') {
    if (await confirmModal('Deseja remover esta OS?')) {
      const filtered = loadOrders().filter((o) => o.id !== id);
      saveOrders(filtered);
      renderOrders();
      openScreen('listView');
      updateFinance();
    }
  }
  if (dataset.action === 'print') {
    const order = loadOrders().find((o) => o.id === id);
    if (order) {
      printOrder(order, 'Detalhes da OS');
    }
  }
}

function updateStatus(id, newStatus) {
  const orders = loadOrders().map((o) => {
    if (o.id !== id) return o;
    const now = new Date().toISOString();
    return {
      ...o,
      status: newStatus,
      updatedAt: now,
      history: [...o.history, { date: now, action: `Status alterado para ${newStatus}` }],
    };
  });
  saveOrders(orders);
}

function saveManual(id) {
  const orders = loadOrders().map((o) => {
    if (o.id !== id) return o;
    const now = new Date().toISOString();
    const statusChanged = detailPendingStatus && detailPendingStatus !== o.status;
    return {
      ...o,
      status: statusChanged ? detailPendingStatus : o.status,
      updatedAt: now,
      history: [
        ...o.history,
        ...(statusChanged ? [{ date: now, action: `Status alterado para ${detailPendingStatus}` }] : []),
        { date: now, action: 'OS salva manualmente' },
      ],
    };
  });
  saveOrders(orders);
}

async function handleSubmit(event) {
  event.preventDefault();
  const data = {
    customerName: formFields.customerName.value.trim(),
    phone: parsePhone(formFields.phone.value),
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
            history: [...o.history, { date: now, action: 'OS editada' }],
          }
        : o
    );
    saveOrders(updated);
  } else {
    orders.unshift(createOrderObject({ ...data, status: 'Aguardando' }));
    saveOrders(orders);
  }

  clearForm();
  renderOrders();
  updateFinance();
  openScreen('listView');
}

function handleFormPrint() {
  const orderLike = {
    customerName: formFields.customerName.value.trim() || '(sem nome)',
    phone: parsePhone(formFields.phone.value),
    device: formFields.device.value.trim() || '-',
    issue: formFields.issue.value.trim() || '-',
    price: parseCurrency(formFields.price.value),
    notes: formFields.notes.value.trim() || '-',
    status: 'Aguardando',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  printOrder(orderLike, 'Nova OS');
}

function renderSettings(disable = true) {
  const settings = loadSettings();
  Object.entries(els.settingsFields).forEach(([key, input]) => {
    const val = settings[key] || '';
    input.value = key === 'shopPhone' ? formatPhoneDigits(parsePhone(val)) : val;
    input.disabled = disable;
  });
  document.getElementById('saveSettings').disabled = disable;
}

function enableSettingsEdit() {
  Object.values(els.settingsFields).forEach((input) => (input.disabled = false));
  document.getElementById('saveSettings').disabled = false;
}

async function handleSettingsSave(event) {
  event.preventDefault();
  const data = {
    shopName: els.settingsFields.shopName.value.trim(),
    shopAddress: els.settingsFields.shopAddress.value.trim(),
    shopPhone: parsePhone(els.settingsFields.shopPhone.value),
    shopInstagram: els.settingsFields.shopInstagram.value.trim(),
    shopFacebook: els.settingsFields.shopFacebook.value.trim(),
  };
  saveSettings(data);
  renderSettings(true);
  await alertModal('Configurações salvas.');
}

function updateFinance() {
  const orders = loadOrders().filter((o) => o.status === 'Finalizado');
  const totalAll = orders.reduce((sum, o) => sum + (o.price || 0), 0);
  const costAll = orders.reduce((sum, o) => sum + (o.cost || 0), 0);

  const today = new Date();
  const totalDay = orders
    .filter((o) => {
      const d = new Date(o.updatedAt);
      return d.toDateString() === today.toDateString();
    })
    .reduce((sum, o) => sum + (o.price || 0), 0);
  const costDay = orders
    .filter((o) => {
      const d = new Date(o.updatedAt);
      return d.toDateString() === today.toDateString();
    })
    .reduce((sum, o) => sum + (o.cost || 0), 0);

  const totalMonth = orders
    .filter((o) => {
      const d = new Date(o.updatedAt);
      return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
    })
    .reduce((sum, o) => sum + (o.price || 0), 0);
  const costMonth = orders
    .filter((o) => {
      const d = new Date(o.updatedAt);
      return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
    })
    .reduce((sum, o) => sum + (o.cost || 0), 0);

  els.financeTotals.day.textContent = formatCurrency(totalDay);
  document.getElementById('costDay').textContent = `Custo: ${formatCurrency(costDay)}`;
  document.getElementById('profitDay').textContent = `Lucro: ${formatCurrency(totalDay - costDay)}`;
  els.financeTotals.month.textContent = formatCurrency(totalMonth);
  document.getElementById('costMonth').textContent = `Custo: ${formatCurrency(costMonth)}`;
  document.getElementById('profitMonth').textContent = `Lucro: ${formatCurrency(totalMonth - costMonth)}`;
  els.financeTotals.all.textContent = formatCurrency(totalAll);
  document.getElementById('costAll').textContent = `Custo: ${formatCurrency(costAll)}`;
  document.getElementById('profitAll').textContent = `Lucro: ${formatCurrency(totalAll - costAll)}`;

  els.financeList.innerHTML = orders
    .map(
      (o) => `
    <article class="card">
      <header>
        <strong>${o.customerName}</strong>
        <span class="price">${formatCurrency(o.price)}</span>
      </header>
      <div class="meta">${o.device}</div>
      <div class="meta">Custo: ${formatCurrency(o.cost || 0)} | Lucro: ${formatCurrency((o.price || 0) - (o.cost || 0))}</div>
      <div class="meta">Finalizado em ${formatDate(o.updatedAt)}</div>
    </article>`
    )
    .join('');
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
  els.search.addEventListener('input', renderOrders);
  els.filterButtons.forEach((btn) =>
    btn.addEventListener('click', () => {
      els.filterButtons.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      renderOrders();
      updateFilterOverflow();
    })
  );
  els.closeForm.addEventListener('click', () => openScreen('listView'));
  els.cancelForm.addEventListener('click', () => openScreen('listView'));
  els.form.addEventListener('submit', handleSubmit);
  els.closeDetail.addEventListener('click', () => openScreen('listView'));
  document.getElementById('closeFinance').addEventListener('click', () => openScreen('listView'));
  document.getElementById('printForm').addEventListener('click', handleFormPrint);
  els.settingsForm.addEventListener('submit', handleSettingsSave);
  document.getElementById('editSettings').addEventListener('click', enableSettingsEdit);
  document.querySelectorAll('.close-settings').forEach((btn) =>
    btn.addEventListener('click', () => openScreen('listView'))
  );
  [formFields.price, formFields.cost].forEach((field) => {
    field.addEventListener('input', () => formatCurrencyInput(field));
    field.addEventListener('blur', () => formatCurrencyInput(field));
  });
  formFields.phone.addEventListener('input', () => formatPhoneInput(formFields.phone));
  formFields.phone.addEventListener('blur', () => formatPhoneInput(formFields.phone));
  if (els.filterGroup) {
    els.filterGroup.addEventListener('scroll', updateFilterOverflow);
    window.addEventListener('resize', updateFilterOverflow);
  }
}

function start() {
  loadOrders();
  loadSettings();
  formatCurrencyInput(formFields.price);
  formatCurrencyInput(formFields.cost);
  formatPhoneInput(formFields.phone);
  bindEvents();
  initNavigation();
  renderOrders();
  updateFinance();
  updateFilterOverflow();
}

start();
function setPendingStatus(status) {
  detailPendingStatus = status;
  document.querySelectorAll('.status-row button').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.value === status);
  });
}
function updateFilterOverflow() {
  const el = els.filterGroup;
  if (!el) return;
  const overflowing = el.scrollWidth - el.clientWidth > 4;
  el.classList.toggle('overflowing', overflowing);
  const atEnd = el.scrollLeft >= el.scrollWidth - el.clientWidth - 8;
  el.classList.toggle('at-end', atEnd);
}

const STORAGE_KEY = 'orders';
const SETTINGS_KEY = 'settings';
const DEFAULT_LOGO = 'assets/img/logo.png';

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
  form: document.getElementById('orderForm'),
  formTitle: document.getElementById('formTitle'),
  closeForm: document.getElementById('closeForm'),
  cancelForm: document.getElementById('cancelForm'),
  settingsForm: document.getElementById('settingsForm'),
  profileElements: {
    avatar: document.getElementById('profileAvatar'),
    name: document.getElementById('profileName'),
    address: document.getElementById('profileAddress'),
    phone: document.getElementById('profilePhone'),
    instagram: document.getElementById('profileInstagram'),
    facebook: document.getElementById('profileFacebook'),
  },
  settingsFields: {
    shopName: document.getElementById('shopName'),
    shopAddress: document.getElementById('shopAddress'),
    shopPhone: document.getElementById('shopPhone'),
    shopInstagram: document.getElementById('shopInstagram'),
    shopFacebook: document.getElementById('shopFacebook'),
    shopLogoFile: document.getElementById('shopLogoFile'),
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
  device: document.getElementById('device'),
  issue: document.getElementById('issue'),
  price: document.getElementById('price'),
  cost: document.getElementById('cost'),
  notes: document.getElementById('notes'),
};

let editingId = null;
let detailPendingStatus = null;
let detailCurrentId = null;
let detailHistoryExpanded = false;

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
    shopLogo: '',
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
  
  // Verify if all fields exist and are properly populated from the form inputs
  const formValues = {};
  if (els.settingsFields && els.settingsFields.shopName) {
    formValues.shopName = els.settingsFields.shopName.value?.trim() || saved.shopName || '';
    formValues.shopAddress = els.settingsFields.shopAddress.value?.trim() || saved.shopAddress || '';
    formValues.shopPhone = els.settingsFields.shopPhone.value?.trim() || saved.shopPhone || '';
    formValues.shopInstagram = els.settingsFields.shopInstagram.value?.trim() || saved.shopInstagram || '';
    formValues.shopFacebook = els.settingsFields.shopFacebook.value?.trim() || saved.shopFacebook || '';
  }
  
  // Merge: prioritize form values if they exist, otherwise use saved
  const merged = {
    shopName: formValues.shopName || saved.shopName || '',
    shopAddress: formValues.shopAddress || saved.shopAddress || '',
    shopPhone: formValues.shopPhone || saved.shopPhone || '',
    shopInstagram: formValues.shopInstagram || saved.shopInstagram || '',
    shopFacebook: formValues.shopFacebook || saved.shopFacebook || '',
    shopLogo: saved.shopLogo || '',
  };
  
  return merged;
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

function printOrder(order, title = 'Ordem de Serviço') {
  const settings = getSettingsSnapshot();
  const logoSrc = settings.shopLogo || DEFAULT_LOGO;
  const logoHtml = `<img src="${logoSrc}" alt="Logo" style="max-width: 120px; height: auto; margin-bottom: 10px;">`;
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
          font-size: 18px;
        }
        .shop-name {
          font-weight: 800;
          font-size: 22px;
          letter-spacing: 0.2px;
        }
        .shop-line { color: #333; font-size: 18px; }
        .row { margin-bottom: 10px; }
        .label { display: inline-block; width: 140px; font-weight: 600; }
        .value { color: #222; }
        .signatures {
          margin-top: 40px;
          display: flex;
          flex-direction: column;
          gap: 30px;
        }
        .signature-block {
          flex: 1;
          text-align: center;
        }
        .signature-line {
          border-bottom: 1px solid #333;
          height: 60px;
          margin: 10px 0;
        }
        .signature-label {
          font-size: 16px;
          font-weight: 700;
          color: #333;
          margin-top: 5px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
      </style>
    </head>
    <body>
      ${shopBlock ? `<div class="shop">${shopBlock}</div>` : ''}
      <h1>${title}</h1>
      ${rows}
      
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
      </div>
    </body>
    </html>
  `;

  const printWindow = window.open('', '', 'width=800,height=600');
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 250);
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
      <ul>${historyList || '<li>-</li>'}</ul>
      ${historyToggleButton}
    </div>
    <div class="detail-actions status-row">
      <strong class="group-title">Status</strong>
      <button data-action="status" data-status="Aguardando" class="filter-btn">Aguardando</button>
      <button data-action="status" data-status="Em andamento" class="filter-btn">Em andamento</button>
      <button data-action="status" data-status="Finalizado" class="filter-btn">Finalizar</button>
    </div>
    <div class="detail-actions action-row">
      <strong class="group-title">Ações</strong>
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
  if (dataset.action === 'toggle-history') {
    detailHistoryExpanded = !detailHistoryExpanded;
    openDetail(id);
    return;
  }
  if (dataset.action === 'status') {
    setPendingStatus(dataset.status);
    saveManual(id);
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

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Falha ao ler imagem.'));
    reader.readAsDataURL(file);
  });
}

function renderSettings() {
  const settings = loadSettings();
  // Display in profile
  els.profileElements.avatar.src = settings.shopLogo || DEFAULT_LOGO;
  els.profileElements.name.textContent = settings.shopName || 'Nome da Loja';
  els.profileElements.address.textContent = settings.shopAddress || 'Endereço';
  els.profileElements.phone.textContent = settings.shopPhone ? formatPhoneDigits(settings.shopPhone) : '-';
  els.profileElements.instagram.textContent = settings.shopInstagram || '-';
  els.profileElements.facebook.textContent = settings.shopFacebook || '-';

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
    if (logoFile.size > 1024 * 1024) {
      await alertModal('A imagem da logo deve ter no maximo 1MB.');
      return;
    }
    shopLogo = await readFileAsDataUrl(logoFile);
  }

  const data = {
    shopName: els.settingsFields.shopName.value.trim(),
    shopAddress: els.settingsFields.shopAddress.value.trim(),
    shopPhone: parsePhone(els.settingsFields.shopPhone.value),
    shopInstagram: els.settingsFields.shopInstagram.value.trim(),
    shopFacebook: els.settingsFields.shopFacebook.value.trim(),
    shopLogo,
  };
  saveSettings(data);
  renderSettings();
  await alertModal('Configurações salvas.');
}

function cancelSettingsEdit() {
  closeSettingsModal();
}

function updateFinance() {
  let orders = loadOrders().filter((o) => o.status === 'Finalizado');

  // Sort by updatedAt descending
  orders.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

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

  // Calculate start of week (Monday)
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay() + 1); // Monday
  startOfWeek.setHours(0, 0, 0, 0);
  const totalWeek = orders
    .filter((o) => {
      const d = new Date(o.updatedAt);
      return d >= startOfWeek;
    })
    .reduce((sum, o) => sum + (o.price || 0), 0);
  const costWeek = orders
    .filter((o) => {
      const d = new Date(o.updatedAt);
      return d >= startOfWeek;
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
  els.financeTotals.week.textContent = formatCurrency(totalWeek);
  document.getElementById('costWeek').textContent = `Custo: ${formatCurrency(costWeek)}`;
  document.getElementById('profitWeek').textContent = `Lucro: ${formatCurrency(totalWeek - costWeek)}`;
  els.financeTotals.month.textContent = formatCurrency(totalMonth);
  document.getElementById('costMonth').textContent = `Custo: ${formatCurrency(costMonth)}`;
  document.getElementById('profitMonth').textContent = `Lucro: ${formatCurrency(totalMonth - costMonth)}`;

  // Group by date label
  const groups = {};
  orders.forEach((o) => {
    const label = getDateLabel(o.updatedAt);
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
          <div class="meta">Finalizado em ${formatDate(o.updatedAt)}</div>
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
  els.search.addEventListener('input', renderOrders);
  els.filterButtons.forEach((btn) =>
    btn.addEventListener('click', () => {
      els.filterButtons.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      renderOrders();
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
    field.addEventListener('input', () => formatCurrencyInput(field));
    field.addEventListener('blur', () => formatCurrencyInput(field));
  });
  formFields.phone.addEventListener('input', () => formatPhoneInput(formFields.phone));
  formFields.phone.addEventListener('blur', () => formatPhoneInput(formFields.phone));
  els.settingsFields.shopPhone.addEventListener('input', () => formatPhoneInput(els.settingsFields.shopPhone));
  els.settingsFields.shopPhone.addEventListener('blur', () => formatPhoneInput(els.settingsFields.shopPhone));
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
}

start();
function setPendingStatus(status) {
  detailPendingStatus = status;
  document.querySelectorAll('.status-row button').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.status === status);
  });
}



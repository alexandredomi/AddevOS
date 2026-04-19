const STORAGE_KEY = 'orders';
const SETTINGS_KEY = 'settings';
const DEFAULT_LOGO = 'assets/img/logo.png';
const DEFAULT_PROFILE_PHOTO = 'assets/img/perfil-sem-foto.jpg';

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
  customerDocument: document.getElementById('customerDocument'),
  device: document.getElementById('device'),
  issue: document.getElementById('issue'),
  price: document.getElementById('price'),
  cost: document.getElementById('cost'),
  notes: document.getElementById('notes'),
};

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
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved)
    return JSON.parse(saved).map((o) => ({
      ...o,
      price: Number(o.price) || 0,
      cost: Number(o.cost) || 0,
      deviceChecklistEnabled: Boolean(o.deviceChecklistEnabled),
      accessoryChecklistEnabled: Boolean(o.accessoryChecklistEnabled),
      deviceChecklist: buildChecklistState(DEVICE_CHECKLIST_ITEMS, o.deviceChecklist),
      accessoryChecklist: buildChecklistState(ACCESSORY_CHECKLIST_ITEMS, o.accessoryChecklist),
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
    history: [
      { date: now, action: 'OS criada' },
      { date: now, action: `Status definido: ${status}` },
    ],
  };
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

function sanitizePdfText(value) {
  return (value || '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, ' ')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .trim();
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

function buildOrderPdfLines(order, title = 'Ordem de Servico') {
  const settings = getSettingsSnapshot();
  const deviceChecklistLabels = getCheckedChecklistLabels(
    DEVICE_CHECKLIST_ITEMS,
    buildChecklistState(DEVICE_CHECKLIST_ITEMS, order.deviceChecklist)
  );
  const accessoryChecklistLabels = getCheckedChecklistLabels(
    ACCESSORY_CHECKLIST_ITEMS,
    buildChecklistState(ACCESSORY_CHECKLIST_ITEMS, order.accessoryChecklist)
  );

  const lines = [
    sanitizePdfText(settings.shopName || 'Assistencia Tecnica'),
    sanitizePdfText(settings.shopAddress || ''),
    settings.shopPhone ? `Telefone: ${formatPhoneDigits(settings.shopPhone)}` : '',
    settings.shopInstagram ? `Instagram: ${settings.shopInstagram}` : '',
    settings.shopFacebook ? `Facebook: ${settings.shopFacebook}` : '',
    '',
    sanitizePdfText(title),
    '',
    `Cliente: ${order.customerName || '-'}`,
    `Telefone: ${order.phone ? formatPhoneDigits(order.phone) : '-'}`,
    `Documento: ${order.customerDocument || '-'}`,
    `Aparelho: ${order.device || '-'}`,
    `Defeito: ${order.issue || '-'}`,
    `Valor: ${formatCurrency(order.price || 0)}`,
    `Custo: ${formatCurrency(order.cost || 0)}`,
    `Observacoes: ${order.notes || '-'}`,
    `Status: ${order.status || '-'}`,
    `Criada em: ${order.createdAt ? formatDate(order.createdAt) : '-'}`,
    `Atualizada em: ${order.updatedAt ? formatDate(order.updatedAt) : '-'}`,
    '',
    'Assinatura do cliente: ______________________________',
    `Assinatura da loja: ${sanitizePdfText(settings.shopName || 'Assistencia Tecnica')} __________________`,
  ];

  if (order.deviceChecklistEnabled) {
    lines.splice(
      lines.length - 2,
      0,
      '',
      'Checklist do aparelho:',
      ...(deviceChecklistLabels.length ? deviceChecklistLabels.map((item) => `- ${item}`) : ['- Nenhum item marcado'])
    );
  }

  if (order.accessoryChecklistEnabled) {
    lines.splice(
      lines.length - 2,
      0,
      '',
      'Perifericos recebidos:',
      ...(accessoryChecklistLabels.length ? accessoryChecklistLabels.map((item) => `- ${item}`) : ['- Nenhum item marcado'])
    );
  }

  return lines.flatMap((line) => wrapPdfLine(line));
}

function createSimplePdfBlob(lines) {
  const pageWidth = 595;
  const pageHeight = 842;
  const marginLeft = 40;
  const marginTop = 48;
  const lineHeight = 14;
  const maxLinesPerPage = 52;
  const pages = [];

  for (let index = 0; index < lines.length; index += maxLinesPerPage) {
    pages.push(lines.slice(index, index + maxLinesPerPage));
  }

  if (!pages.length) pages.push(['']);

  const fontObjectNumber = 3;
  const objects = [];
  const pageRefs = [];

  pages.forEach((pageLines, pageIndex) => {
    const pageObjectNumber = 4 + pageIndex * 2;
    const contentObjectNumber = pageObjectNumber + 1;
    pageRefs.push(`${pageObjectNumber} 0 R`);

    const contentLines = [
      'BT',
      '/F1 11 Tf',
      `${marginLeft} ${pageHeight - marginTop} Td`,
    ];

    pageLines.forEach((line, lineIndex) => {
      const safeText = sanitizePdfText(line);
      contentLines.push(`(${safeText}) Tj`);
      if (lineIndex < pageLines.length - 1) {
        contentLines.push(`0 -${lineHeight} Td`);
      }
    });

    contentLines.push('ET');
    const stream = `${contentLines.join('\n')}\n`;

    objects.push({
      number: pageObjectNumber,
      body: `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 ${fontObjectNumber} 0 R >> >> /Contents ${contentObjectNumber} 0 R >>`,
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

  return new Blob([pdf], { type: 'application/pdf' });
}

function createOrderPdfFile(order, title = 'Ordem de Servico') {
  const lines = buildOrderPdfLines(order, title);
  const blob = createSimplePdfBlob(lines);
  const safeName = sanitizePdfText(order.customerName || 'cliente')
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9-_]/g, '')
    .toLowerCase() || 'cliente';

  return new File([blob], `os-${safeName}.pdf`, { type: 'application/pdf' });
}

function getWhatsAppNumber(phone) {
  const phoneNumber = parsePhone(phone);
  if (!phoneNumber) return '';
  return phoneNumber.startsWith('55') ? phoneNumber : `55${phoneNumber}`;
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
  const pdfFile = createOrderPdfFile(order, title);
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
          <span class="label">${f.label}:</span>
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

  const copyContent = (copyType) => `
      <div class="copy-container">
        <div class="copy-type">${copyType}</div>
        ${shopBlock ? `<div class="shop">${shopBlock}</div>` : ''}
        <h1>${title}</h1>
        ${rows}
        ${printChecklistSection}
        ${signatures}
      </div>`;

  const html = `
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
        h1 { margin: 8px 0 6px; font-size: 18px; }
        .shop {
          text-align: left;
          margin-bottom: 8px;
          font-size: 14px;
        }
        .shop-name {
          font-weight: 800;
          font-size: 16px;
          letter-spacing: 0.2px;
        }
        .shop-line { color: #333; font-size: 12px; }
        .row { margin-bottom: 6px; font-size: 12px; }
        .label { display: inline-block; width: 100px; font-weight: 600; }
        .value { color: #222; }
        .print-checklists {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-top: 12px;
        }
        .print-checklist {
          border: 1px solid #ddd;
          border-radius: 10px;
          padding: 10px;
        }
        .print-checklist strong {
          display: block;
          margin-bottom: 6px;
          font-size: 12px;
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
        @media (max-width: 700px) {
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
  if (dataset.action === 'share-pdf') {
    const order = loadOrders().find((o) => o.id === id);
    if (order) {
      await sendOrderPdfViaWhatsApp(order, 'Detalhes da OS');
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
  const phoneNumber = parsePhone(order.phone);
  
  if (!phoneNumber) {
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
  
  // Número com código +55 (Brasil)
  const whatsappNumber = phoneNumber.startsWith('55') ? phoneNumber : '55' + phoneNumber;
  
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
  
  if (!phoneNumber) {
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

function handleFormPrint() {
  printOrder(getFormOrderLike(), 'Nova OS');
}

async function handleFormSharePdf() {
  await sendOrderPdfViaWhatsApp(getFormOrderLike(), 'Nova OS');
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
  els.profileElements.avatar.src = settings.shopLogo || DEFAULT_PROFILE_PHOTO;
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

function start() {
  loadOrders();
  loadSettings();
  bindEvents();
  initNavigation();
  updateDeviceChecklistVisibility({ clearHidden: true });
  updateAccessoryChecklistVisibility({ clearHidden: true });
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

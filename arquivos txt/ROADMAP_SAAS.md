# 📋 Roadmap SaaS - AddevOS
## Transformação de App Local para SaaS Profissional

**Última atualização:** Abril 2026  
**Status:** Planning  
**Escala alvo:** 100 lojas | ~400 usuários | Multi-tenant  

---

## 📊 Visão Geral da Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENTE (Frontend)                       │
│  ├─ Web App (HTML/CSS/JS + Vue/React)                      │
│  └─ Progressive Web App (PWA)                              │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              CAMADA DE AUTENTICAÇÃO                         │
│  ├─ Firebase Authentication (Email/Google/WhatsApp)        │
│  └─ JWT + Session Management                              │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│            BACKEND (Cloud Functions)                        │
│  ├─ Validações de negócio                                 │
│  ├─ Autorização (Firestore Security Rules)                │
│  └─ Integrações externas (WhatsApp, Email)               │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│         BANCO DE DADOS (Firestore)                         │
│  ├─ Multi-tenant (organizationId)                          │
│  ├─ Dados estruturados por coleção                        │
│  └─ Real-time sync                                        │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│         SERVIÇOS COMPLEMENTARES                            │
│  ├─ Cloud Storage (Logos/Fotos)                           │
│  ├─ Cloud Tasks (Envios agendados)                        │
│  └─ Analytics & Monitoring                                │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔐 1. SEGURANÇA & AUTENTICAÇÃO

### 1.1 Sistema de Autenticação

#### Firebase Authentication
```javascript
// Configuração inicial
firebase.auth().createUserWithEmailAndPassword(email, password)
  .then(async (userCredential) => {
    // Criar documento de usuário
    await createUserProfile(userCredential.user);
  })
  .catch(handleAuthError);
```

**Métodos de Login Suportados:**
- ✅ Email/Password (com verificação)
- ✅ Google Sign-In
- ✅ WhatsApp Business (via API externa)
- ✅ Login Social (Facebook, LinkedIn futuramente)

#### Fluxo de Registro
1. Usuário entra email
2. Verifica se já existe
3. Se novo → cria auth user
4. Cria documento em `users/{uid}`
5. Cria organização (loja) em `organizations/{orgId}`
6. Adiciona plano padrão (Free/Trial)

### 1.2 Multi-tenant & Autorização

#### Estrutura de Dados - Relacionamento de Usuários

```javascript
// Coleção: users/{uid}
{
  uid: "user123",
  email: "gerente@assistencia.com",
  displayName: "João Silva",
  phone: "(11) 99999-9999",
  avatar: "https://...",
  
  // Associações de organizações
  organizations: {
    "org123": {
      role: "owner",        // owner, manager, technician, viewer
      joinedAt: "2024-01-15",
      isActive: true
    },
    "org456": {
      role: "technician",
      joinedAt: "2024-02-01",
      isActive: true
    }
  },
  
  createdAt: "2024-01-15",
  lastLogin: "2024-04-15",
  status: "active"
}

// Coleção: organizations/{orgId}
{
  orgId: "org123",
  name: "Assistência Silva",
  phone: "(11) 98888-8888",
  email: "contato@assistencia.com",
  address: "Rua XX, nº 123",
  city: "São Paulo",
  
  // Logo
  logoUrl: "https://storage.../logo.jpg",
  
  // Assinatura
  plan: "professional",     // free, starter, professional, enterprise
  planStartDate: "2024-01-15",
  planEndDate: "2025-01-15",
  billingCycle: "monthly",
  
  // Limites
  maxUsers: 5,
  maxOrders: 1000,
  
  // Stats
  totalUsers: 3,
  totalOrders: 87,
  
  owner: {
    uid: "user123",
    email: "gerente@assistencia.com"
  },
  
  createdAt: "2024-01-15",
  updatedAt: "2024-04-15"
}

// Coleção: organizations/{orgId}/users/{uid}
{
  uid: "user123",
  role: "owner",
  email: "gerente@assistencia.com",
  displayName: "João Silva",
  joinedAt: "2024-01-15",
  lastAccess: "2024-04-15"
}
```

### 1.3 Controle de Acesso (RBAC)

```
PERMISSÕES POR ROLE:
┌──────────────┬────────┬─────────┬────────────┬────────┐
│ Ação         │ Owner  │ Manager │ Technician │ Viewer │
├──────────────┼────────┼─────────┼────────────┼────────┤
│ Criar OS     │   ✓    │    ✓    │      ✓     │   ✗    │
│ Editar OS    │   ✓    │    ✓    │      ✓     │   ✗    │
│ Deletar OS   │   ✓    │    ✓    │      ✗     │   ✗    │
│ Financeiro   │   ✓    │    ✓    │      ✗     │   ✗    │
│ Relatórios   │   ✓    │    ✓    │      ✓     │   ✓    │
│ Usuários     │   ✓    │    ✗    │      ✗     │   ✗    │
│ Configuração │   ✓    │    ✗    │      ✗     │   ✗    │
└──────────────┴────────┴─────────┴────────────┴────────┘
```

### 1.4 Firestore Security Rules

```firestore
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // ==================== USERS ====================
    match /users/{userId} {
      // Pode ler seu próprio documento
      allow read: if request.auth.uid == userId;
      // Pode escrever seu próprio documento
      allow write: if request.auth.uid == userId;
    }
    
    // ==================== ORGANIZATIONS ====================
    match /organizations/{orgId} {
      // Leitura: user deve estar na organização
      allow read: if request.auth.uid in resource.data.userIds || 
                     exists(/databases/$(database)/documents/organizations/$(orgId)/users/$(request.auth.uid));
      
      // Escrita: apenas owner e manager
      allow write: if isOrgMember(orgId) && (
        isRole('owner') || isRole('manager')
      );
      
      // ==================== ORDERS ====================
      match /orders/{orderId} {
        allow read: if isOrgMember(orgId);
        allow create: if isOrgMember(orgId) && isRole('owner', 'manager', 'technician');
        allow update: if isOrgMember(orgId) && (
          isRole('owner', 'manager') || 
          (isRole('technician') && !isSensitiveFieldChanged())
        );
        allow delete: if isOrgMember(orgId) && isRole('owner', 'manager');
      }
      
      // ==================== USERS ====================
      match /users/{userId} {
        allow read: if isOrgMember(orgId);
        allow write: if isOrgMember(orgId) && isRole('owner', 'manager');
      }
    }
    
    // ==================== HELPER FUNCTIONS ====================
    function isOrgMember(orgId) {
      return exists(/databases/$(database)/documents/organizations/$(orgId)/users/$(request.auth.uid));
    }
    
    function isRole(roles) {
      let userRole = get(/databases/$(database)/documents/organizations/$(orgId)/users/$(request.auth.uid)).data.role;
      return userRole in roles;
    }
    
    function isSensitiveFieldChanged() {
      return request.resource.data.diff(resource.data).affectedKeys().hasAny(['status', 'price', 'cost']);
    }
  }
}
```

---

## 💾 2. ESTRUTURA FIREBASE

### 2.1 Collections & Schema

```
Firestore Structure:
└── users/
    └── {uid}
        ├── email
        ├── displayName
        ├── organizations
        ├── createdAt
        └── lastLogin

└── organizations/
    └── {orgId}
        ├── name
        ├── plan
        ├── owner
        ├── createdAt
        └── users/
            └── {uid}
                ├── role
                ├── joinedAt
                └── lastAccess

        └── orders/
            └── {orderId}
                ├── customerName
                ├── device
                ├── issue
                ├── price
                ├── cost
                ├── status
                ├── createdAt
                ├── updatedAt
                └── history/
                    └── {timestamp}
                        ├── action
                        └── date

        └── invoices/
            └── {invoiceId}
                ├── month
                ├── year
                ├── total
                ├── status
                └── createdAt

        └── settings/
            └── profile
                ├── shopName
                ├── shopAddress
                ├── shopPhone
                ├── logoUrl
                └── updatedAt
```

### 2.2 Indexação Inteligente

**Índices Críticos (criar automaticamente):**

```
orders (collection):
  - organizationId (Ascending) + createdAt (Descending)
  - organizationId (Ascending) + status (Ascending) + createdAt (Descending)
  - organizationId (Ascending) + customerName (Ascending)

users (collection):
  - organizationId (Ascending) + role (Ascending)
```

### 2.3 Estrutura de Storage

```
gs://project.appspot.com/
└── organizations/
    └── {orgId}/
        ├── logo/
        │   └── logo.jpg (max 5MB)
        └── orders/
            └── {orderId}/
                └── photos/
                    └── photo_{n}.jpg (max 10MB each)
```

---

## 💰 3. OTIMIZAÇÃO DE CUSTOS FIREBASE

### 3.1 Estratégia de Custos

| Serviço | Limite Free | Custo Pago | Estratégia |
|---------|------------|-----------|-----------|
| **Firestore** | 50k leitura/dia | $0.06/100k read | Caching local + paginação |
| **Auth** | Ilimitado | Grátis | Sem custo direto |
| **Storage** | 5GB | $0.018/GB | Comprimir fotos, limite tamanho |
| **Cloud Functions** | 2M/mês | $0.40/M | Usar Cloud Firestore triggers |

### 3.2 Redução de Leituras Firestore

#### ✅ Implementar Cache Local (IndexedDB)

```javascript
// Cache com expiração
class FirestoreCache {
  constructor(expirationMinutes = 5) {
    this.db = null;
    this.expiration = expirationMinutes * 60 * 1000;
    this.init();
  }

  async init() {
    return new Promise((resolve) => {
      const request = indexedDB.open('AddevOS', 1);
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('cache')) {
          db.createObjectStore('cache', { keyPath: 'key' });
        }
      };
      request.onsuccess = (e) => {
        this.db = e.target.result;
        resolve();
      };
    });
  }

  async set(key, data) {
    const tx = this.db.transaction(['cache'], 'readwrite');
    tx.objectStore('cache').put({
      key,
      data,
      timestamp: Date.now()
    });
    return new Promise((resolve) => {
      tx.oncomplete = resolve;
    });
  }

  async get(key) {
    return new Promise((resolve) => {
      const tx = this.db.transaction(['cache'], 'readonly');
      const request = tx.objectStore('cache').get(key);
      request.onsuccess = () => {
        const item = request.result;
        if (!item) return resolve(null);
        
        // Verificar expiração
        if (Date.now() - item.timestamp > this.expiration) {
          return resolve(null);
        }
        resolve(item.data);
      };
    });
  }
}
```

#### ✅ Paginação & Lazy Loading

```javascript
async function loadOrders(orgId, pageSize = 50) {
  let firstPage = await db.collection('organizations')
    .doc(orgId)
    .collection('orders')
    .orderBy('createdAt', 'desc')
    .limit(pageSize)
    .get();
  
  // Próxima página começa do último documento
  let nextPage = await db.collection('organizations')
    .doc(orgId)
    .collection('orders')
    .orderBy('createdAt', 'desc')
    .startAfter(firstPage.docs[firstPage.docs.length - 1])
    .limit(pageSize)
    .get();
  
  return {
    orders: firstPage.docs.map(doc => doc.data()),
    hasMore: nextPage.docs.length === pageSize,
    cursor: nextPage.docs[0]?.id
  };
}
```

#### ✅ Agregar Dados (Counter Pattern)

```javascript
// Em vez de contar documentos (leitura cara)
// Manter um contador atualizado

// Estrutura:
organizations/{orgId}/stats/daily
{
  date: "2024-04-15",
  totalOrders: 42,
  totalRevenue: 5400.00,
  updatedAt: serverTimestamp()
}

// Atualizar via Cloud Function
async function updateDailyStats(orgId) {
  const today = new Date().toISOString().split('T')[0];
  const orders = await db.collection(`organizations/${orgId}/orders`)
    .where('createdAt', '>=', new Date(today))
    .get();
  
  const stats = {
    totalOrders: orders.size,
    totalRevenue: orders.docs.reduce((sum, doc) => sum + doc.data().price, 0),
    updatedAt: new Date()
  };
  
  await db.collection(`organizations/${orgId}/stats`)
    .doc('daily')
    .set(stats, { merge: true });
}
```

#### ✅ Usar Realtime com Listeners Eficientes

```javascript
// ❌ ERRADO - Leitura a cada ação
async function handleOrderClick(orderId) {
  const order = await db.collection('orders').doc(orderId).get();
  // Uma leitura por clique
}

// ✅ CORRETO - Listener que não cobra re-leituras
let unsubscribe;
function setupOrderListener(orderId) {
  unsubscribe = db.collection('orders')
    .doc(orderId)
    .onSnapshot(snapshot => {
      updateUI(snapshot.data());
      // Sem custo adicional por updates
    });
}
```

### 3.3 Estimativa de Custos (100 lojas, 400 usuários)

```
CENÁRIO: 3-4 usuários por loja, média 20 OS por loja/mês

LEITURAS/DIA (cálculo):
├─ Login: 400 usuários × 1 leitura = 400
├─ Sincronizar OS: 300 usuários × 2 leituras = 600
├─ Ver Dashboard: 100 usuários × 3 leituras = 300
├─ Relatórios: 50 usuários × 5 leituras = 250
└─ Background tasks: 100 leituras
   ────────────────────────────────
   TOTAL: ~1.650 leituras/dia

CUSTOS MENSAIS:
├─ Firestore: (1.650 × 30) / 100.000 × $0.06 = $0.30
├─ Authentication: $0.00 (grátis)
├─ Storage: 100 logos × 2MB + fotos = ~300MB = $5.40/mês
├─ Cloud Functions: ~5M invocações = $2.00
└─ Bandwidth: ~10GB/mês = $1.20
   ────────────────────────────────
   TOTAL ESTIMADO: ~$8.90/mês ✅ MUITO BARATO

COM OTIMIZAÇÕES (cache + paginação):
├─ Leituras reduzidas em 60%
└─ TOTAL: ~$4-5/mês ✅ PRATICAMENTE GRATUITO
```

---

## 🚀 4. IMPLEMENTAÇÃO

### 4.1 Roadmap de Desenvolvimento

#### **FASE 1: Fundação (Semanas 1-4)**

- [x] Estrutura de projeto Firebase
- [ ] Sistema de autenticação
  - [ ] Email/Password
  - [ ] Google Sign-In
  - [ ] Verificação de email
- [ ] Criação de organização (onboarding)
- [ ] Modelo de dados (Firestore)
- [ ] Security Rules básicas
- [ ] Testes de autenticação

**Deliverable:** App funciona com login e cada usuário tem sua organização

#### **FASE 2: Multi-tenant (Semanas 5-8)**

- [ ] Sistema de convite de usuários
- [ ] Gerenciamento de roles
- [ ] Permissões por role
- [ ] Compartilhamento de dados entre usuários
- [ ] Auditoria de ações
- [ ] Testes de permissões

**Deliverable:** Múltiplos usuários podem gerenciar a mesma loja

#### **FASE 3: Backend & Integrações (Semanas 9-12)**

- [ ] Cloud Functions
  - [ ] Criar/editar/deletar OS
  - [ ] Calcular estatísticas
  - [ ] Gerar relatórios
- [ ] Integrações
  - [ ] Envio de WhatsApp (Twilio/Baileys)
  - [ ] Email (SendGrid)
  - [ ] SMS (opcional)
- [ ] Webhooks e notificações
- [ ] Testes integrados

**Deliverable:** Sistema automatizado com notificações

#### **FASE 4: Planos & Pagamento (Semanas 13-16)**

- [ ] Stripe integration
- [ ] Planos e pricing
  - [ ] Free (limitado)
  - [ ] Starter ($29/mês)
  - [ ] Professional ($79/mês)
  - [ ] Enterprise (custom)
- [ ] Faturamento automático
- [ ] Gestão de assinaturas
- [ ] Portal do cliente

**Deliverable:** SaaS monetizado pronto para produção

#### **FASE 5: Otimização & Escalabilidade (Semanas 17-20)**

- [ ] Performance tuning
- [ ] Cache estratégico
- [ ] CDN para assets
- [ ] Monitoramento
- [ ] Rate limiting
- [ ] DDoS protection
- [ ] Analytics

**Deliverable:** Sistema pronto para 1000+ usuários

### 4.2 Stack Tecnológico Recomendado

```
FRONTEND:
├─ Vue 3 (ou React)
├─ Vuetify (ou Material UI)
├─ Pinia (state management)
├─ Firebase SDK
└─ Vite (build tool)

BACKEND:
├─ Firebase Firestore
├─ Firebase Authentication
├─ Cloud Functions (Node.js/Python)
├─ Cloud Storage
└─ Cloud Tasks

INTEGRAÇÕES:
├─ Stripe (pagamentos)
├─ SendGrid (email)
├─ Twilio (SMS/WhatsApp)
├─ Sentry (error tracking)
└─ Google Analytics

DEVOPS:
├─ Firebase Hosting (frontend)
├─ GitHub Actions (CI/CD)
└─ Datadog (monitoring)
```

---

## 📈 5. PLANOS & PRICING

```
┌─────────────────────────────────────────────────────────────────┐
│                    PLANOS DE ASSINATURA                         │
├─────────────┬──────────┬──────────┬───────────┬─────────────────┤
│ Recurso     │   Free   │ Starter  │Professional│  Enterprise    │
├─────────────┼──────────┼──────────┼───────────┼─────────────────┤
│ Preço       │   R$ 0   │  R$ 99   │  R$ 249   │   Customizado   │
│ Período     │ Ilimitado│ Mensal   │  Mensal   │    Anual        │
│             │          │          │           │                 │
│ Usuários    │    1     │    3     │     5     │   Ilimitado     │
│ OS/mês      │   100    │   500    │  2.000    │   Ilimitado     │
│ Armazén.    │   100MB  │   1GB    │   10GB    │   Ilimitado     │
│ Suporte     │  Email   │  Email   │  Chat+Tel │  Dedicado       │
│             │          │          │           │                 │
│ Relatórios  │   ✗      │   ✓      │    ✓      │     ✓           │
│ API         │   ✗      │   ✗      │    ✓      │     ✓           │
│ Custom API  │   ✗      │   ✗      │    ✗      │     ✓           │
│ White Label │   ✗      │   ✗      │    ✗      │     ✓           │
└─────────────┴──────────┴──────────┴───────────┴─────────────────┘
```

---

## 🔧 6. SETUP FIREBASE

### 6.1 Criar Projeto Firebase

```bash
# 1. Ir para https://console.firebase.google.com
# 2. Criar novo projeto "AddevOS"
# 3. Habilitar Google Analytics (recomendado)

# 4. Instalar CLI
npm install -g firebase-tools

# 5. Login
firebase login

# 6. Inicializar projeto
firebase init
```

### 6.2 Configurar Firestore

```bash
# 1. Em Console > Firestore Database
# 2. Criar Database
# 3. Escolher "Start in test mode" (depois mudar regras)
# 4. Escolher região: us-central1 (mais barato)
```

### 6.3 Configurar Authentication

```javascript
// firebase-config.js
import { initializeApp } from "firebase/app";
import { getAuth, setPersistence, browserLocalPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "addvos.firebaseapp.com",
  projectId: "addvos",
  storageBucket: "addvos.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Persistência de sessão
setPersistence(auth, browserLocalPersistence)
  .catch((error) => console.error("Persistence error:", error));
```

### 6.4 Habilitar Provedores de Sign-In

```
Firebase Console > Authentication > Sign-in method

Ativar:
☑ Email/Password
☑ Google
☑ Phone (opcional)
```

---

## 🛡️ 7. SEGURANÇA

### 7.1 Checklist de Segurança

- [ ] HTTPS obrigatório (Firebase Hosting)
- [ ] CORS configurado corretamente
- [ ] Rate limiting em Cloud Functions
- [ ] Input validation em frontend + backend
- [ ] SQL Injection prevention (N/A - Firestore)
- [ ] XSS protection (usar Vue/React)
- [ ] CSRF tokens para formulários sensíveis
- [ ] Senhas com hash (Firebase faz automaticamente)
- [ ] 2FA para contas admin (future)
- [ ] Backup automático de dados
- [ ] Logging e auditoria de ações
- [ ] Encriptação de dados sensíveis (PII)
- [ ] Testes de penetração antes de produção
- [ ] GDPR/LGPD compliance

### 7.2 Proteção de Dados Sensíveis

```javascript
// Não armazenar em Firestore:
// ❌ Senhas (Firebase cuida)
// ❌ Tokens de API
// ❌ Chaves privadas
// ❌ Dados de cartão de crédito

// Armazenar com cuidado:
// ⚠️ Telefone (criptografar em descanso)
// ⚠️ Email (já é público)
// ⚠️ Documentos (criptografar dados sensíveis)

// Exemplo: Criptografar sensíveis
import crypto from 'crypto';

function encryptData(data, key) {
  const cipher = crypto.createCipher('aes-256-cbc', key);
  let encrypted = cipher.update(data);
  encrypted += cipher.final('hex');
  return encrypted;
}
```

---

## 📊 8. ANALYTICS & MONITORING

### 8.1 Métricas Chave

```
Rastrear via Google Analytics 4:

├─ Eventos
│  ├─ users_signup (quando cria conta)
│  ├─ organization_created (quando cria loja)
│  ├─ order_created
│  ├─ order_updated
│  ├─ user_invited
│  ├─ subscription_upgraded
│  └─ subscription_downgraded

├─ Conversões
│  ├─ Free → Starter (dias para converter)
│  └─ Churn rate (quantos cancelaram)

└─ Retenção
   ├─ DAU (Daily Active Users)
   ├─ MAU (Monthly Active Users)
   └─ Engagement (ações por usuário)
```

### 8.2 Error Tracking (Sentry)

```javascript
import * as Sentry from "@sentry/vue";

Sentry.init({
  dsn: "YOUR_SENTRY_DSN",
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
});

// Capturar erros
try {
  // código
} catch (error) {
  Sentry.captureException(error);
}
```

---

## 📝 9. ROADMAP DETALHADO (120 dias)

```
SEMANA 1-4: AUTENTICAÇÃO
├─ Day 1-3: Setup Firebase + estrutura base
├─ Day 4-7: Tela de login/registro
├─ Day 8-14: Email verification + password reset
├─ Day 15-21: Google Sign-In
└─ Day 22-28: Testes + deploy beta

SEMANA 5-8: MULTI-TENANT
├─ Day 29-35: Onboarding organização
├─ Day 36-42: Convite de usuários
├─ Day 43-49: Gerenciamento de roles
└─ Day 50-56: Testes + bug fixes

SEMANA 9-12: BACKEND
├─ Day 57-63: Cloud Functions setup
├─ Day 64-70: Integrações (WhatsApp/Email)
├─ Day 71-77: Notificações real-time
└─ Day 78-84: Testes integrados

SEMANA 13-16: MONETIZAÇÃO
├─ Day 85-91: Stripe integration
├─ Day 92-98: Planos + faturamento
├─ Day 99-105: Portal do cliente
└─ Day 106-112: Testes + compliance

SEMANA 17-20: PRODUÇÃO
├─ Day 113-119: Performance + monitoring
└─ Day 120: Launch! 🎉
```

---

## 💡 10. BOAS PRÁTICAS

### 10.1 Estrutura de Projeto

```
addevos/
├── public/
├── src/
│   ├── assets/
│   ├── components/
│   │   ├── auth/
│   │   ├── dashboard/
│   │   ├── orders/
│   │   ├── users/
│   │   └── shared/
│   ├── services/
│   │   ├── authService.js
│   │   ├── firestoreService.js
│   │   ├── storageService.js
│   │   └── analyticsService.js
│   ├── stores/        (Pinia)
│   │   ├── auth.js
│   │   ├── organization.js
│   │   └── orders.js
│   ├── views/
│   ├── App.vue
│   └── main.js
├── functions/         (Cloud Functions)
│   ├── src/
│   │   ├── orders.js
│   │   ├── notifications.js
│   │   ├── billing.js
│   │   └── utils.js
│   └── package.json
├── firestore.rules
├── storage.rules
└── firebase.json
```

### 10.2 Git Workflow

```bash
# Main branches
main          → produção
staging       → pré-produção
develop       → desenvolvimento

# Feature branches
feature/auth
feature/multi-tenant
feature/payments
feature/cloud-functions
```

### 10.3 Testes

```javascript
// Exemplo: Teste de autenticação
import { describe, it, expect } from 'vitest';
import { signUp, signIn, signOut } from './authService';

describe('Authentication', () => {
  it('should sign up a new user', async () => {
    const result = await signUp('test@example.com', 'password123');
    expect(result.uid).toBeDefined();
  });

  it('should sign in existing user', async () => {
    const result = await signIn('test@example.com', 'password123');
    expect(result.email).toBe('test@example.com');
  });
});
```

---

## 🚀 11. DEPLOYMENT

### 11.1 Deploy Frontend (Firebase Hosting)

```bash
# 1. Build
npm run build

# 2. Deploy
firebase deploy --only hosting

# Resultado: https://addvos.web.app
```

### 11.2 Deploy Cloud Functions

```bash
# Deploy
firebase deploy --only functions

# Ver logs
firebase functions:log
```

### 11.3 Configurar Domain Customizado

```
1. Comprar domínio (Google Domains / Namecheap)
2. Firebase Hosting > Conectar domínio
3. Adicionar registros DNS
4. Esperar validação (24-48h)
```

---

## 📞 12. SUPORTE AO CLIENTE

### 12.1 Canais de Suporte

- **Email:** support@addvos.com
- **Chat:** Intercom (in-app)
- **Telefone:** (Plano Enterprise)
- **Base de conhecimento:** Notion/Docs públicos

### 12.2 Template de Resposta

```
Olá [Nome],

Obrigado por contatar nossa equipe!

Recebi seu ticket sobre [assunto].
Vou analisar e responder em até 24h.

ID do ticket: [#12345]

Atenciosamente,
Equipe AddevOS
```

---

## 📚 PRÓXIMOS PASSOS

1. **Hoje:** Revisar este documento com time
2. **Semana 1:** Setup completo do Firebase
3. **Semana 2:** Começar implementação fase 1
4. **Semana 4:** Primeiro beta com amigos/tester
5. **Semana 8:** Abrir para 20 beta users
6. **Semana 16:** Lançamento oficial

---

## 📎 REFERÊNCIAS

- [Firebase Best Practices](https://firebase.google.com/docs/firestore/best-practices)
- [Security Rules Guide](https://firebase.google.com/docs/rules)
- [Stripe Integration](https://stripe.com/docs)
- [LGPD Compliance](https://www.gov.br/cidadania/pt-br/acesso-a-informacao/lgpd)
- [Vue 3 Guide](https://vuejs.org/)
- [Firestore Pricing](https://firebase.google.com/pricing)

---

**Última atualização:** Abril 2026  
**Responsável:** Equipe de Desenvolvimento  
**Status:** ✅ Pronto para implementação  


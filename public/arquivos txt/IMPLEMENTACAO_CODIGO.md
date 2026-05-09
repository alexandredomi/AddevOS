# 🔧 IMPLEMENTAÇÃO PRÁTICA - AddevOS SaaS

## 1. SETUP INICIAL FIREBASE

### 1.1 Instalar dependências

```bash
npm install firebase
npm install vue-router pinia
npm install stripe @stripe/js
npm install axios date-fns
```

### 1.2 Arquivo de Configuração Firebase

```javascript
// src/config/firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.VUE_APP_FIREBASE_API_KEY,
  authDomain: 'addvos-saas.firebaseapp.com',
  projectId: 'addvos-saas',
  storageBucket: 'addvos-saas.appspot.com',
  messagingSenderId: process.env.VUE_APP_FIREBASE_SENDER_ID,
  appId: process.env.VUE_APP_FIREBASE_APP_ID,
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Autenticação
export const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence).catch(console.error);

// Firestore com cache local
export const db = getFirestore(app);
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    console.warn('Firestore persistence failed: múltiplas abas abertas');
  } else if (err.code === 'unimplemented') {
    console.warn('Firestore persistence não suportado');
  }
});

// Storage
export const storage = getStorage(app);

export default app;
```

---

## 2. SERVIÇOS DE AUTENTICAÇÃO

### 2.1 AuthService.js

```javascript
// src/services/authService.js
import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateProfile,
  signInWithPopup,
  GoogleAuthProvider,
} from 'firebase/auth';
import { auth, db } from '@/config/firebase';
import { doc, setDoc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';

export class AuthService {
  /**
   * Registrar novo usuário e criar organização
   */
  static async signUp(email, password, displayName, shopName) {
    try {
      // 1. Criar usuário em Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 2. Atualizar perfil
      await updateProfile(user, { displayName });

      // 3. Criar documento de usuário
      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(userDocRef, {
        uid: user.uid,
        email: user.email,
        displayName,
        photoURL: null,
        organizations: {},
        createdAt: new Date(),
        lastLogin: new Date(),
        status: 'active',
        emailVerified: false,
      });

      // 4. Criar organização padrão
      const orgId = this.generateOrgId();
      const orgRef = doc(db, 'organizations', orgId);
      
      await setDoc(orgRef, {
        orgId,
        name: shopName,
        owner: {
          uid: user.uid,
          email: user.email,
        },
        plan: 'free', // Free trial por 14 dias
        planStartDate: new Date(),
        planEndDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        billingCycle: 'monthly',
        status: 'active',
        maxUsers: 1, // Free permite 1 usuário
        maxOrders: 100,
        totalUsers: 1,
        totalOrders: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // 5. Criar subcoleção de usuários na organização
      const orgUserRef = doc(db, `organizations/${orgId}/users`, user.uid);
      await setDoc(orgUserRef, {
        uid: user.uid,
        email: user.email,
        displayName,
        role: 'owner',
        joinedAt: new Date(),
        lastAccess: new Date(),
      });

      // 6. Adicionar organização ao documento de usuário
      await setDoc(userDocRef, {
        organizations: {
          [orgId]: {
            role: 'owner',
            joinedAt: new Date(),
            isActive: true,
          },
        },
      }, { merge: true });

      return {
        user,
        organizationId: orgId,
      };
    } catch (error) {
      console.error('Erro ao registrar:', error);
      throw this.handleAuthError(error);
    }
  }

  /**
   * Login com email e senha
   */
  static async signIn(email, password) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Atualizar último login
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, { lastLogin: new Date() }, { merge: true });

      return user;
    } catch (error) {
      console.error('Erro ao fazer login:', error);
      throw this.handleAuthError(error);
    }
  }

  /**
   * Login com Google
   */
  static async signInWithGoogle() {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Verificar se já existe
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        // Novo usuário - criar documento e organização
        const orgId = this.generateOrgId();
        
        await setDoc(userRef, {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          organizations: {
            [orgId]: {
              role: 'owner',
              joinedAt: new Date(),
              isActive: true,
            },
          },
          createdAt: new Date(),
          lastLogin: new Date(),
          status: 'active',
        });

        // Criar organização padrão
        const orgRef = doc(db, 'organizations', orgId);
        await setDoc(orgRef, {
          orgId,
          name: `${user.displayName}'s Shop`,
          owner: { uid: user.uid, email: user.email },
          plan: 'free',
          planStartDate: new Date(),
          planEndDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          maxUsers: 1,
          maxOrders: 100,
          totalUsers: 1,
          totalOrders: 0,
          createdAt: new Date(),
        });

        // Adicionar na subcoleção
        const orgUserRef = doc(db, `organizations/${orgId}/users`, user.uid);
        await setDoc(orgUserRef, {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          role: 'owner',
          joinedAt: new Date(),
          lastAccess: new Date(),
        });
      } else {
        // Usuário existente - apenas atualizar último login
        await setDoc(userRef, { lastLogin: new Date() }, { merge: true });
      }

      return user;
    } catch (error) {
      console.error('Erro no Google Sign-In:', error);
      throw this.handleAuthError(error);
    }
  }

  /**
   * Logout
   */
  static async signOut() {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
      throw error;
    }
  }

  /**
   * Reset de senha
   */
  static async resetPassword(email) {
    try {
      await sendPasswordResetEmail(auth, email);
      return { success: true, message: 'Email de reset enviado' };
    } catch (error) {
      console.error('Erro ao resetar senha:', error);
      throw this.handleAuthError(error);
    }
  }

  /**
   * Observer para estado de autenticação
   */
  static onAuthStateChanged(callback) {
    return onAuthStateChanged(auth, callback);
  }

  /**
   * Gerar ID de organização
   */
  static generateOrgId() {
    return `org_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Traduzir erros do Firebase
   */
  static handleAuthError(error) {
    const errorMessages = {
      'auth/email-already-in-use': 'Este email já está registrado',
      'auth/invalid-email': 'Email inválido',
      'auth/weak-password': 'Senha muito fraca (mínimo 6 caracteres)',
      'auth/user-not-found': 'Usuário não encontrado',
      'auth/wrong-password': 'Senha incorreta',
      'auth/user-disabled': 'Usuário desativado',
      'auth/too-many-requests': 'Muitas tentativas. Tente novamente mais tarde',
      'auth/operation-not-allowed': 'Operação não permitida',
    };

    const message = errorMessages[error.code] || error.message;
    const customError = new Error(message);
    customError.code = error.code;
    return customError;
  }
}

export default AuthService;
```

### 2.2 OrganizationService.js

```javascript
// src/services/organizationService.js
import { 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  getDocs, 
  query, 
  where,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/config/firebase';

export class OrganizationService {
  /**
   * Obter organização por ID
   */
  static async getOrganization(orgId) {
    try {
      const orgRef = doc(db, 'organizations', orgId);
      const orgSnap = await getDoc(orgRef);
      
      if (!orgSnap.exists()) {
        throw new Error('Organização não encontrada');
      }

      return orgSnap.data();
    } catch (error) {
      console.error('Erro ao buscar organização:', error);
      throw error;
    }
  }

  /**
   * Obter todas as organizações do usuário
   */
  static async getUserOrganizations(userId) {
    try {
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        return [];
      }

      const organizations = userSnap.data().organizations || {};
      const orgIds = Object.keys(organizations);

      if (orgIds.length === 0) {
        return [];
      }

      const orgPromises = orgIds.map(orgId => 
        getDoc(doc(db, 'organizations', orgId))
      );

      const orgSnaps = await Promise.all(orgPromises);
      return orgSnaps
        .filter(snap => snap.exists())
        .map(snap => ({
          id: snap.id,
          ...snap.data(),
        }));
    } catch (error) {
      console.error('Erro ao buscar organizações do usuário:', error);
      throw error;
    }
  }

  /**
   * Atualizar perfil da organização
   */
  static async updateOrganization(orgId, data) {
    try {
      const orgRef = doc(db, 'organizations', orgId);
      await updateDoc(orgRef, {
        ...data,
        updatedAt: new Date(),
      });
      return { success: true };
    } catch (error) {
      console.error('Erro ao atualizar organização:', error);
      throw error;
    }
  }

  /**
   * Convidar usuário para organização
   */
  static async inviteUser(orgId, email, role = 'technician') {
    try {
      // 1. Verificar se email existe em organizações
      const usersRef = collection(db, 'organizations', orgId, 'users');
      const q = query(usersRef, where('email', '==', email));
      const userSnaps = await getDocs(q);

      if (!userSnaps.empty) {
        throw new Error('Este usuário já está na organização');
      }

      // 2. Se usuario nao existir, criar convite (salvar em subcoleção)
      const inviteRef = doc(collection(db, 'organizations', orgId, 'invites'));
      await setDoc(inviteRef, {
        email,
        role,
        status: 'pending',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 dias
      });

      // 3. TODO: Enviar email com link de convite

      return { success: true, message: 'Convite enviado' };
    } catch (error) {
      console.error('Erro ao convidar usuário:', error);
      throw error;
    }
  }

  /**
   * Adicionar usuário à organização
   */
  static async addUserToOrganization(orgId, userId, email, displayName, role = 'technician') {
    try {
      const batch = writeBatch(db);

      // 1. Adicionar na subcoleção users da organização
      const orgUserRef = doc(db, `organizations/${orgId}/users`, userId);
      batch.set(orgUserRef, {
        uid: userId,
        email,
        displayName,
        role,
        joinedAt: new Date(),
        lastAccess: new Date(),
      });

      // 2. Adicionar organização ao documento do usuário
      const userRef = doc(db, 'users', userId);
      batch.set(userRef, {
        organizations: {
          [orgId]: {
            role,
            joinedAt: new Date(),
            isActive: true,
          },
        },
      }, { merge: true });

      // 3. Incrementar contador de usuários
      const orgRef = doc(db, 'organizations', orgId);
      const orgSnap = await getDoc(orgRef);
      const currentUsers = orgSnap.data().totalUsers || 0;
      
      batch.update(orgRef, {
        totalUsers: currentUsers + 1,
      });

      await batch.commit();
      return { success: true };
    } catch (error) {
      console.error('Erro ao adicionar usuário:', error);
      throw error;
    }
  }

  /**
   * Listar usuários da organização
   */
  static async getOrganizationUsers(orgId) {
    try {
      const usersRef = collection(db, 'organizations', orgId, 'users');
      const usersSnap = await getDocs(usersRef);

      return usersSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (error) {
      console.error('Erro ao listar usuários:', error);
      throw error;
    }
  }

  /**
   * Alterar role do usuário
   */
  static async updateUserRole(orgId, userId, newRole) {
    try {
      const batch = writeBatch(db);

      // Atualizar na subcoleção da org
      const orgUserRef = doc(db, `organizations/${orgId}/users`, userId);
      batch.update(orgUserRef, { role: newRole });

      // Atualizar no documento do usuário
      const userRef = doc(db, 'users', userId);
      batch.set(userRef, {
        organizations: {
          [orgId]: { role: newRole },
        },
      }, { merge: true });

      await batch.commit();
      return { success: true };
    } catch (error) {
      console.error('Erro ao atualizar role:', error);
      throw error;
    }
  }

  /**
   * Remover usuário da organização
   */
  static async removeUserFromOrganization(orgId, userId) {
    try {
      const batch = writeBatch(db);

      // Remover da subcoleção
      const orgUserRef = doc(db, `organizations/${orgId}/users`, userId);
      batch.delete(orgUserRef);

      // Remover da lista de organizações do usuário
      const userRef = doc(db, 'users', userId);
      batch.set(userRef, {
        organizations: {
          [orgId]: null, // Firestore irá remover a chave
        },
      }, { merge: true });

      // Decrementar contador
      const orgRef = doc(db, 'organizations', orgId);
      const orgSnap = await getDoc(orgRef);
      const currentUsers = orgSnap.data().totalUsers || 1;
      
      batch.update(orgRef, {
        totalUsers: Math.max(0, currentUsers - 1),
      });

      await batch.commit();
      return { success: true };
    } catch (error) {
      console.error('Erro ao remover usuário:', error);
      throw error;
    }
  }
}

export default OrganizationService;
```

---

## 3. STORE (PINIA)

### 3.1 Auth Store

```javascript
// src/stores/auth.js
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import AuthService from '@/services/authService';

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null);
  const loading = ref(true);
  const error = ref(null);

  const isAuthenticated = computed(() => !!user.value);

  const initAuth = () => {
    return new Promise((resolve) => {
      AuthService.onAuthStateChanged((authUser) => {
        user.value = authUser;
        loading.value = false;
        resolve(authUser);
      });
    });
  };

  const signUp = async (email, password, displayName, shopName) => {
    try {
      loading.value = true;
      error.value = null;
      const result = await AuthService.signUp(email, password, displayName, shopName);
      user.value = result.user;
      return result;
    } catch (err) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const signIn = async (email, password) => {
    try {
      loading.value = true;
      error.value = null;
      const result = await AuthService.signIn(email, password);
      user.value = result;
      return result;
    } catch (err) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const signInWithGoogle = async () => {
    try {
      loading.value = true;
      error.value = null;
      const result = await AuthService.signInWithGoogle();
      user.value = result;
      return result;
    } catch (err) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const signOut = async () => {
    try {
      loading.value = true;
      error.value = null;
      await AuthService.signOut();
      user.value = null;
    } catch (err) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const resetPassword = async (email) => {
    try {
      loading.value = true;
      error.value = null;
      return await AuthService.resetPassword(email);
    } catch (err) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  return {
    user,
    loading,
    error,
    isAuthenticated,
    initAuth,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    resetPassword,
  };
});
```

### 3.2 Organization Store

```javascript
// src/stores/organization.js
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import OrganizationService from '@/services/organizationService';
import { useAuthStore } from './auth';

export const useOrganizationStore = defineStore('organization', () => {
  const authStore = useAuthStore();
  const currentOrganization = ref(null);
  const organizations = ref([]);
  const users = ref([]);
  const loading = ref(false);
  const error = ref(null);

  const isOwner = computed(() => 
    currentOrganization.value?.owner?.uid === authStore.user?.uid
  );

  const canInviteUsers = computed(() => {
    const plan = currentOrganization.value?.plan;
    return ['starter', 'professional', 'enterprise'].includes(plan);
  });

  const fetchUserOrganizations = async (userId) => {
    try {
      loading.value = true;
      error.value = null;
      organizations.value = await OrganizationService.getUserOrganizations(userId);
      
      if (organizations.value.length > 0) {
        currentOrganization.value = organizations.value[0];
      }
      return organizations.value;
    } catch (err) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const setCurrentOrganization = async (orgId) => {
    try {
      loading.value = true;
      error.value = null;
      const org = await OrganizationService.getOrganization(orgId);
      currentOrganization.value = org;
      
      // Carregar usuários também
      await fetchOrganizationUsers(orgId);
      
      return org;
    } catch (err) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const fetchOrganizationUsers = async (orgId) => {
    try {
      users.value = await OrganizationService.getOrganizationUsers(orgId);
      return users.value;
    } catch (err) {
      error.value = err.message;
      throw err;
    }
  };

  const updateOrganization = async (data) => {
    try {
      loading.value = true;
      error.value = null;
      await OrganizationService.updateOrganization(currentOrganization.value.orgId, data);
      currentOrganization.value = { ...currentOrganization.value, ...data };
      return { success: true };
    } catch (err) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const inviteUser = async (email, role) => {
    try {
      loading.value = true;
      error.value = null;
      return await OrganizationService.inviteUser(
        currentOrganization.value.orgId,
        email,
        role
      );
    } catch (err) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const removeUser = async (userId) => {
    try {
      loading.value = true;
      error.value = null;
      await OrganizationService.removeUserFromOrganization(
        currentOrganization.value.orgId,
        userId
      );
      users.value = users.value.filter(u => u.id !== userId);
      return { success: true };
    } catch (err) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  return {
    currentOrganization,
    organizations,
    users,
    loading,
    error,
    isOwner,
    canInviteUsers,
    fetchUserOrganizations,
    setCurrentOrganization,
    fetchOrganizationUsers,
    updateOrganization,
    inviteUser,
    removeUser,
  };
});
```

---

## 4. COMPONENTES VUE

### 4.1 Tela de Login/Registro

```vue
<!-- src/views/Auth/Login.vue -->
<template>
  <div class="auth-container">
    <div class="auth-card">
      <div class="auth-header">
        <h1>AddevOS</h1>
        <p>Gerencie suas ordens de serviço com facilidade</p>
      </div>

      <form @submit.prevent="handleSubmit">
        <div v-if="isLogin" class="form-group">
          <label>Email</label>
          <input 
            v-model="form.email" 
            type="email" 
            required
            placeholder="seu@email.com"
          >
        </div>

        <div v-if="!isLogin" class="form-group">
          <label>Nome Completo</label>
          <input 
            v-model="form.displayName" 
            type="text" 
            required
            placeholder="João Silva"
          >
        </div>

        <div v-if="!isLogin" class="form-group">
          <label>Nome da Loja</label>
          <input 
            v-model="form.shopName" 
            type="text" 
            required
            placeholder="Assistência Silva"
          >
        </div>

        <div class="form-group">
          <label>Email</label>
          <input 
            v-model="form.email" 
            type="email" 
            required
            placeholder="seu@email.com"
          >
        </div>

        <div class="form-group">
          <label>Senha</label>
          <input 
            v-model="form.password" 
            type="password" 
            required
            placeholder="Mínimo 6 caracteres"
          >
        </div>

        <div v-if="error" class="error-message">
          {{ error }}
        </div>

        <button 
          type="submit" 
          class="btn-primary" 
          :disabled="authStore.loading"
        >
          {{ authStore.loading ? 'Carregando...' : (isLogin ? 'Entrar' : 'Criar Conta') }}
        </button>
      </form>

      <div class="divider">ou</div>

      <button 
        @click="handleGoogleSignIn"
        class="btn-google"
        :disabled="authStore.loading"
      >
        <img src="@/assets/google-icon.svg" alt="Google">
        {{ isLogin ? 'Entrar com Google' : 'Registrar com Google' }}
      </button>

      <div class="auth-footer">
        <p v-if="isLogin">
          Não tem conta? 
          <a href="#" @click.prevent="isLogin = false">Criar conta</a>
        </p>
        <p v-else>
          Já tem conta? 
          <a href="#" @click.prevent="isLogin = true">Entrar</a>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const router = useRouter();
const authStore = useAuthStore();

const isLogin = ref(true);
const form = ref({
  email: '',
  password: '',
  displayName: '',
  shopName: '',
});
const error = ref(null);

const handleSubmit = async () => {
  try {
    error.value = null;

    if (isLogin.value) {
      await authStore.signIn(form.value.email, form.value.password);
    } else {
      await authStore.signUp(
        form.value.email,
        form.value.password,
        form.value.displayName,
        form.value.shopName
      );
    }

    // Redirecionar para dashboard
    router.push('/dashboard');
  } catch (err) {
    error.value = err.message;
  }
};

const handleGoogleSignIn = async () => {
  try {
    error.value = null;
    await authStore.signInWithGoogle();
    router.push('/dashboard');
  } catch (err) {
    error.value = err.message;
  }
};
</script>

<style scoped>
.auth-container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.auth-card {
  background: white;
  border-radius: 12px;
  padding: 40px;
  width: 100%;
  max-width: 400px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.auth-header {
  text-align: center;
  margin-bottom: 30px;
}

.auth-header h1 {
  margin: 0 0 10px;
  color: #333;
  font-size: 28px;
}

.auth-header p {
  margin: 0;
  color: #666;
  font-size: 14px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  color: #333;
}

.form-group input {
  width: 100%;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  transition: border-color 0.2s;
}

.form-group input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.error-message {
  background: #fee;
  color: #c33;
  padding: 12px;
  border-radius: 6px;
  margin-bottom: 20px;
  font-size: 14px;
}

.btn-primary,
.btn-google {
  width: 100%;
  padding: 12px;
  border: none;
  border-radius: 6px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: #667eea;
  color: white;
  margin-bottom: 15px;
}

.btn-primary:hover:not(:disabled) {
  background: #5568d3;
  box-shadow: 0 8px 16px rgba(102, 126, 234, 0.4);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-google {
  background: white;
  color: #333;
  border: 2px solid #ddd;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.btn-google:hover:not(:disabled) {
  border-color: #667eea;
  background: #f9f9f9;
}

.btn-google img {
  width: 18px;
  height: 18px;
}

.divider {
  text-align: center;
  color: #999;
  margin: 20px 0;
  font-size: 14px;
}

.auth-footer {
  text-align: center;
  margin-top: 20px;
}

.auth-footer p {
  margin: 0;
  color: #666;
  font-size: 14px;
}

.auth-footer a {
  color: #667eea;
  text-decoration: none;
  font-weight: 600;
}

.auth-footer a:hover {
  text-decoration: underline;
}

@media (max-width: 480px) {
  .auth-card {
    padding: 30px 20px;
  }

  .auth-header h1 {
    font-size: 24px;
  }
}
</style>
```

---

## 5. CLOUD FUNCTIONS

### 5.1 Função para Criar OS (orders.js)

```javascript
// functions/src/orders.js
const functions = require('firebase-functions');
const admin = require('firebase-admin');

const db = admin.firestore();

/**
 * Cloud Function para criar ordem de serviço
 */
exports.createOrder = functions.https.onCall(async (data, context) => {
  // Validar autenticação
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Usuário não autenticado'
    );
  }

  const userId = context.auth.uid;
  const { orgId, orderData } = data;

  try {
    // 1. Validar permissão (usuário deve ser da organização)
    const userOrgRef = doc(db, `organizations/${orgId}/users`, userId);
    const userOrgSnap = await userOrgRef.get();

    if (!userOrgSnap.exists()) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'Você não tem permissão para criar OS nesta loja'
      );
    }

    // 2. Validar dados
    if (!orderData.customerName || !orderData.device || !orderData.issue) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Dados inválidos'
      );
    }

    // 3. Criar ordem
    const ordersRef = collection(db, `organizations/${orgId}/orders`);
    const newOrderRef = doc(ordersRef);

    await newOrderRef.set({
      id: newOrderRef.id,
      ...orderData,
      createdBy: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'Aguardando',
      history: [{
        action: 'OS criada',
        date: new Date(),
      }],
    });

    // 4. Atualizar contador de OS na organização
    const orgRef = doc(db, 'organizations', orgId);
    const orgSnap = await orgRef.get();
    const currentCount = orgSnap.data().totalOrders || 0;

    await orgRef.update({
      totalOrders: currentCount + 1,
      updatedAt: new Date(),
    });

    return {
      success: true,
      orderId: newOrderRef.id,
      message: 'OS criada com sucesso',
    };
  } catch (error) {
    console.error('Erro ao criar OS:', error);
    throw new functions.https.HttpsError(
      'internal',
      'Erro ao criar OS: ' + error.message
    );
  }
});

/**
 * Trigger: Calcular estatísticas diárias
 */
exports.updateDailyStats = functions.pubsub
  .schedule('0 0 * * *')  // Diariamente à meia-noite
  .timeZone('America/Sao_Paulo')
  .onRun(async (context) => {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

    const orgsRef = collection(db, 'organizations');
    const orgsSnap = await orgsRef.get();

    for (const orgDoc of orgsSnap.docs) {
      const orgId = orgDoc.id;
      
      // Buscar orders do dia
      const ordersRef = collection(db, `organizations/${orgId}/orders`);
      const q = query(
        ordersRef,
        where('createdAt', '>=', startOfDay),
        where('createdAt', '<', endOfDay)
      );
      const ordersSnap = await getDocs(q);

      const totalOrders = ordersSnap.size;
      const totalRevenue = ordersSnap.docs.reduce(
        (sum, doc) => sum + (doc.data().price || 0),
        0
      );
      const totalCost = ordersSnap.docs.reduce(
        (sum, doc) => sum + (doc.data().cost || 0),
        0
      );

      // Salvar estatísticas
      const statsRef = doc(db, `organizations/${orgId}/stats`, 'daily');
      await statsRef.set({
        date: today.toISOString().split('T')[0],
        totalOrders,
        totalRevenue,
        totalCost,
        profit: totalRevenue - totalCost,
        updatedAt: new Date(),
      }, { merge: true });
    }

    return { success: true };
  });

module.exports = {
  ...require('./orders'),
  ...require('./notifications'),
  ...require('./billing'),
};
```

---

## 6. ROUTER

### 6.1 Router Configuration

```javascript
// src/router/index.js
import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

// Views
import Login from '@/views/Auth/Login.vue';
import Dashboard from '@/views/Dashboard.vue';
import Orders from '@/views/Orders.vue';
import Users from '@/views/Users.vue';
import Settings from '@/views/Settings.vue';

const routes = [
  {
    path: '/',
    redirect: '/dashboard',
  },
  {
    path: '/login',
    name: 'Login',
    component: Login,
    meta: { requiresAuth: false },
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: Dashboard,
    meta: { requiresAuth: true },
  },
  {
    path: '/orders',
    name: 'Orders',
    component: Orders,
    meta: { requiresAuth: true },
  },
  {
    path: '/users',
    name: 'Users',
    component: Users,
    meta: { requiresAuth: true, requiresOwner: true },
  },
  {
    path: '/settings',
    name: 'Settings',
    component: Settings,
    meta: { requiresAuth: true, requiresOwner: true },
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// Guard de autenticação
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore();

  // Inicializar autenticação se não foi feito
  if (authStore.loading === true && !authStore.user) {
    await authStore.initAuth();
  }

  const requiresAuth = to.meta.requiresAuth !== false;
  const isAuthenticated = !!authStore.user;

  if (requiresAuth && !isAuthenticated) {
    next('/login');
  } else if (to.path === '/login' && isAuthenticated) {
    next('/dashboard');
  } else {
    next();
  }
});

export default router;
```

---

## 7. VARIÁVEIS DE AMBIENTE

### 7.1 .env.local

```
# Firebase
VUE_APP_FIREBASE_API_KEY=seu_api_key
VUE_APP_FIREBASE_SENDER_ID=seu_sender_id
VUE_APP_FIREBASE_APP_ID=seu_app_id

# Stripe (para pagamentos)
VUE_APP_STRIPE_PUBLISHABLE_KEY=pk_test_...

# API
VUE_APP_API_URL=https://addvos-saas.web.app
VUE_APP_ENVIRONMENT=development
```

---

## 8. PRÓXIMOS PASSOS

1. **Setup Firebase:** Criar projeto e obter credenciais
2. **Clonar estrutura:** Copiar arquivo structure para seu projeto
3. **Implementar Auth:** Usar AuthService e componente Login
4. **Testar:** Registrar usuário e fazer login
5. **Expandir:** Adicionar funcionalidades de OS, usuários, etc

---

**Status:** ✅ Pronto para usar  
**Última atualização:** Abril 2026


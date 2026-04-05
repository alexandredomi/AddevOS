# 🔥 Guia de Prompts — Firebase para SaaS de OS
## Estratégia: custo mínimo, resultado máximo

---

## ⚠️ Entendendo o custo do Firebase (Firestore)

| Operação        | Free tier/dia | Custo após |
|----------------|--------------|------------|
| Leituras       | 50.000/dia   | $0,06/100k |
| Escritas       | 20.000/dia   | $0,18/100k |
| Exclusões      | 20.000/dia   | $0,02/100k |
| Armazenamento  | 1 GB         | $0,18/GB   |

**Principal regra:** cada `getDocs`, `onSnapshot`, `getDoc` = leituras. Cada `setDoc`, `updateDoc` = escritas.

---

## 📦 PROMPT 1 — Estrutura do banco de dados

```
Estou criando um SaaS de gerenciamento de Ordens de Serviço com Firebase Firestore.
Cada usuário tem suas próprias OS. Quero gastar o mínimo possível em leituras/escritas.

Me dê a estrutura ideal do Firestore para este objeto de OS:
{
  id, numero, cliente, telefone, servico, data, status,
  obs, moCusto, moVenda, items: [{desc, qty, custo, venda}],
  custo, venda, lucro, margem, criadoEm
}

Regras:
- Um usuário nunca deve ler OS de outro usuário
- Devo conseguir filtrar por status e data sem múltiplas queries
- Evitar subcoleções desnecessárias que aumentem leituras
- Me mostre o path da coleção e as regras de segurança do Firestore
```

---

## 🔐 PROMPT 2 — Autenticação sem custo extra

```
Preciso adicionar login ao meu SaaS de OS. Quero usar Firebase Authentication.
O sistema já tem todo o frontend em HTML/CSS/JS puro (sem framework).

Me dê o código completo para:
1. Login e cadastro com email/senha
2. Persistência de sessão (usuário não precisa logar toda vez)
3. Redirecionar para /dashboard.html se logado, senão /login.html
4. Botão de logout
5. Proteger todas as páginas: se não logado, redirecionar para login

Use apenas firebase/auth do SDK modular (v9+) para manter o bundle pequeno.
Não use GoogleAuthProvider por enquanto, só email/senha.
```

---

## 💾 PROMPT 3 — CRUD com mínimo de leituras

```
Tenho um SaaS de OS em HTML/CSS/JS com Firebase Firestore (SDK v9 modular).
Estrutura: /users/{uid}/ordens/{osId}

Implemente as funções CRUD seguindo estas regras de otimização de custo:

1. LISTAR: Usar onSnapshot UMA vez ao abrir a página, salvar em variável local
   - Não chamar getDocs novamente se os dados já estiverem em memória
   - Cancelar o listener ao sair da página (unsubscribe)

2. CRIAR: setDoc com o objeto completo (1 escrita)
   - Gerar o ID no frontend com crypto.randomUUID() para evitar leitura extra

3. EDITAR: updateDoc com APENAS os campos alterados (não reescrever tudo)

4. EXCLUIR: deleteDoc direto pelo ID (sem ler antes)

5. FILTROS: fazer no frontend em memória, não fazer nova query no Firestore

Me mostre o código JS com essas 5 funções e como inicializar o Firebase.
Inclua tratamento de erro simples.
```

---

## 🧠 PROMPT 4 — Cache local + sync inteligente

```
Meu SaaS de OS usa Firestore mas quero minimizar ao máximo as leituras.
Estratégia: usar localStorage como cache e só sincronizar quando necessário.

Implemente este sistema:
1. Na primeira abertura do dia: buscar tudo do Firestore e salvar no localStorage com timestamp
2. Nas próximas aberturas do mesmo dia: ler do localStorage (0 leituras do Firestore)
3. Ao criar/editar/excluir: escrever no Firestore E atualizar o cache local imediatamente
4. Adicionar botão "Sincronizar" para forçar busca nova quando o usuário quiser

Use localStorage com chave: 'os_cache_{uid}' e 'os_cache_ts_{uid}'
Mostrar quando foi a última sincronização.

Isso garante que um usuário normal gaste apenas 1 leitura por dia de acesso.
```

---

## 📊 PROMPT 5 — Migração do localStorage para Firebase

```
Tenho um MVP de gerenciador de OS funcionando 100% com localStorage.
Agora preciso migrar para Firebase Firestore mantendo todos os dados existentes.

Os dados estão em: localStorage.getItem('ordens_os') — array JSON

Me dê:
1. Script de migração único que roda uma vez: lê o localStorage e envia tudo pro Firestore
2. Função que detecta se é a primeira vez (sem dados no Firestore) e roda a migração automaticamente
3. Após migrar, limpar o localStorage antigo para não confundir

Estrutura Firestore: /users/{uid}/ordens/{osId}
SDK: Firebase v9 modular
Preserve todos os campos: id, numero, cliente, servico, data, status, custo, venda, lucro, margem, items, moCusto, moVenda, obs, criadoEm
```

---

## 🔒 PROMPT 6 — Regras de segurança Firestore

```
Me escreva as regras de segurança do Firestore para meu SaaS de OS com estas restrições:

- Usuário só pode ler/escrever suas próprias OS: /users/{uid}/ordens/{osId}
- Usuário deve estar autenticado (auth != null)
- Não permitir nenhum acesso público
- Campos obrigatórios na escrita: cliente (string), servico (string), status (string)
- Limite máximo por documento: nenhum campo pode ser array com mais de 50 itens
- Bloquear completamente leitura/escrita de outros usuários mesmo que saibam o UID

Também me mostre como testar essas regras no emulador local antes de publicar.
```

---

## 📱 PROMPT 7 — Firestore offline (app funciona sem internet)

```
Quero que meu SaaS de OS funcione offline também.
O Firebase Firestore tem persistência offline nativa.

Me mostre como:
1. Ativar a persistência offline no Firebase SDK v9
2. Detectar quando o usuário está online/offline e mostrar um indicador na UI
3. Garantir que ao voltar online, as alterações feitas offline sejam sincronizadas
4. Tratar conflitos simples (última escrita ganha)

O projeto é HTML/CSS/JS puro, sem framework.
Quero apenas o código de configuração e os indicadores visuais de status de conexão.
```

---

## 💰 PROMPT 8 — Firebase config segura para produção

```
Meu SaaS de OS vai para produção com Firebase.
Me ensine como:

1. Proteger as chaves do Firebase no HTML (environment variables ou config segura)
   - Contexto: é uma app web pura em HTML/JS, sem build step como Webpack
   - Solução alternativa ao .env para este caso

2. Configurar domínios autorizados no Firebase Auth
   (para que só meu domínio possa usar a autenticação)

3. Ativar App Check para evitar abuse da API por terceiros

4. Monitorar gastos: onde ver no console do Firebase se estou perto do limite gratuito

5. Alertas de cobrança: como configurar alerta de email se gastar mais de R$ 5,00

Me dê o passo a passo prático para cada item.
```

---

## 🏗️ ORDEM RECOMENDADA DE IMPLEMENTAÇÃO

```
1. [FEITO] MVP local com localStorage ✅
2. Criar projeto no Firebase Console
3. Usar PROMPT 2 → implementar autenticação
4. Usar PROMPT 1 → definir estrutura do banco
5. Usar PROMPT 6 → configurar regras de segurança
6. Usar PROMPT 3 → implementar CRUD com Firestore
7. Usar PROMPT 5 → migrar dados do localStorage
8. Usar PROMPT 4 → adicionar cache inteligente
9. Usar PROMPT 7 → ativar modo offline
10. Usar PROMPT 8 → configurar produção segura
```

---

## 💡 DICAS EXTRAS DE ECONOMIA

- **Nunca use `onSnapshot` em listagens grandes** — prefira `getDocs` único + cache
- **Agrupe campos calculados** (custo, venda, lucro) no próprio documento da OS para evitar queries de agregação
- **Não crie coleção separada para itens** — mantenha como array dentro da OS (menos leituras)
- **Paginação**: se um usuário tiver 500+ OS, use `limit(20)` + `startAfter()` para não ler tudo de uma vez
- **Índices compostos**: só crie se realmente filtrar por 2+ campos no Firestore (cada índice ocupa armazenamento)
- **Regra dos 80/20**: 80% dos usuários só leem dados, então otimize leituras primeiro

---

*Este guia foi gerado para o MVP OrdensFlow — atualize conforme a escala crescer.*

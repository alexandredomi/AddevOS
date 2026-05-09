# Firebase Setup

## 1. Credenciais do projeto

Preencha `firebase-config.js` com os dados do seu app Web no Firebase Console.

## 2. Ativar login

No Firebase Console:

1. Abra `Authentication`
2. Vá em `Sign-in method`
3. Ative `Email/Password`

## 2.1. Storage

Na versão atual de teste, a logo da loja está sendo salva direto no Firestore em base64.
Então você pode testar sem ativar o Firebase Storage.

Importante:

- use logos pequenas
- o limite no app foi reduzido para `250KB`
- isso é bom para teste, mas para produção o ideal continua sendo Storage

## 3. Estrutura de dados

Cada assistência usa o próprio `uid` do Firebase Auth como chave.

### Documento principal da assistência

Coleção:

`assistances/{uid}`

Campos sugeridos:

```json
{
  "ownerEmail": "loja@exemplo.com",
  "shopName": "Assistência Exemplo",
  "shopAddress": "Rua Exemplo, 123",
  "shopPhone": "51999999999",
  "shopInstagram": "@assistenciaexemplo",
  "shopFacebook": "facebook.com/assistenciaexemplo",
  "shopLogo": "data:image/png;base64,...",
  "subscriptionStatus": "active",
  "planName": "Mensal",
  "monthlyPrice": 39.9,
  "updatedAt": "2026-04-27T00:00:00.000Z"
}
```

### OS da assistência

Subcoleção:

`assistances/{uid}/orders/{orderId}`

Cada OS é salva em um documento separado.

## 4. Cadastro manual de uma nova assistência

1. Crie o usuário em `Authentication` com e-mail e senha
2. Copie o `uid` desse usuário
3. Crie o documento `assistances/{uid}` no Firestore
4. Preencha os campos da loja
5. Defina `subscriptionStatus` como:
   - `active` para liberar acesso
   - `inactive` para bloquear por falta de pagamento
   - `blocked` para bloqueio manual

## 5. Regras

Publique o arquivo `firestore.rules`.
O arquivo `storage.rules` pode ficar guardado para uso futuro, mas não é obrigatório nesta fase de teste.

## 6. Observação sobre custo

Este projeto foi preparado para gastar pouco:

- sem listener em tempo real nas OS
- uma leitura da assistência no login
- uma leitura da coleção de OS no login
- gravação apenas quando algo muda
- cache local por assistência no navegador
- sem depender do Storage para testar agora

Se no futuro você quiser bloquear assinatura no backend sem depender da checagem do app, o caminho ideal é usar `custom claims` com um processo admin.

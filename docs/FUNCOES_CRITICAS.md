# 📘 Guia de Funções Críticas & Arquitetura — Tracker Platform

Este documento serve como a **Fonte Única de Verdade (Single Source of Truth)** técnica sobre as funções críticas da plataforma Tracker. Use este manual para entender a arquitetura, diagnosticar comportamentos e corrigir rapidamente eventuais inconsistências em produção.

---

## 📑 Sumário

1. [Serviço de Disparo de E-mails & Resend](#1-serviço-de-disparo-de-e-mails--resend)
2. [Fluxo de Convites & Ativação de Usuários](#2-fluxo-de-convites--ativação-de-usuários)
3. [Gestão de Organizações & Modelo Enterprise Ilimitado](#3-gestão-de-organizações--modelo-enterprise-ilimitado)
4. [Autenticação, Perfis & Roteamento SPA](#4-autenticação-perfis--roteamento-spa)
5. [FinOps & Telemetria do Firestore](#5-finops--telemetria-do-firestore)
6. [Matriz de Troubleshooting Rápido](#6-matriz-de-troubleshooting-rápido)

---

## 1. Serviço de Disparo de E-mails & Resend

### 📂 Arquivos Responsáveis:
- **Serverless Function (Backend)**: [`/api/send-email.ts`](file:///C:/Users/JoséFrazãodaSilvaNet/api/send-email.ts)
- **Serviço Frontend**: [`src/services/emailService.ts`](file:///C:/Users/JoséFrazãodaSilvaNet/src/services/emailService.ts) e [`src/lib/emailService.ts`](file:///C:/Users/JoséFrazãodaSilvaNet/src/lib/emailService.ts)
- **Template HTML**: [`src/templates/inviteEmailTemplate.ts`](file:///C:/Users/JoséFrazãodaSilvaNet/src/templates/inviteEmailTemplate.ts)
- **Modal de Teste no Super Admin**: [`src/components/modals/EmailTesterModal.tsx`](file:///C:/Users/JoséFrazãodaSilvaNet/src/components/modals/EmailTesterModal.tsx)

### ⚙️ Arquitetura e Fluxo de Dados:
```
[Frontend / React]
   │
   │ POST /api/send-email (Zero chaves ou dados sensíveis no client-side)
   ▼
[Vercel Serverless Function: api/send-email.ts]
   │
   │ Lê estritamente process.env.RESEND_API_KEY
   ▼
[Resend API: https://api.resend.com/emails]
   │
   ├── Sucesso: Retorna { success: true, id: 're_...' }
   └── Falha: Retorna erro real e status code detalhado (ex: 403 Domínio Não Verificado)
```

> **Princípio de Segurança**: O frontend **nunca** conhece a chave do Resend. A chave reside exclusivamente nas variáveis de ambiente seguras da Vercel (`Settings > Environment Variables`).
> **Zero Fallback no Firestore**: Não são gerados documentos na coleção `mail`, eliminando escritas residuais e mantendo o custo de Firestore otimizado.

---

## 2. Fluxo de Convites & Ativação de Usuários

### 📂 Arquivos Responsáveis:
- **Criação em Lote**: [`src/lib/teams.ts`](file:///C:/Users/JoséFrazãodaSilvaNet/src/lib/teams.ts) (`createInvitesInBulk`)
- **Validação de Token**: [`src/lib/teams.ts`](file:///C:/Users/JoséFrazãodaSilvaNet/src/lib/teams.ts) (`validateInvite`)
- **Aceite & Vinculação**: [`src/lib/teams.ts`](file:///C:/Users/JoséFrazãodaSilvaNet/src/lib/teams.ts) (`acceptInvite`)
- **Tela de Ativação**: [`src/components/auth/AcceptInvitePage.tsx`](file:///C:/Users/JoséFrazãodaSilvaNet/src/components/auth/AcceptInvitePage.tsx)
- **Modal de Gestão**: [`src/components/modals/CompanyUserSetupModal.tsx`](file:///C:/Users/JoséFrazãodaSilvaNet/src/components/modals/CompanyUserSetupModal.tsx)

### 🔄 Ciclo de Vida do Convite (Fonte Única da Verdade no Firestore):
```
1. Gestor cria convite no modal -> createInvitesInBulk()
   ├── Gera token aleatório de 16 caracteres
   ├── Grava documento em `invites/{inviteId}` com status 'pending' e expiresAt (72h)
   ├── Dispara e-mail com link limpo: /accept-invite?token=ABCDEF123456
   └── Disponibiliza link seguro para WhatsApp ou cópia em lote

2. Colaborador clica no link -> /accept-invite?token=ABCDEF123456
   ├── AcceptInvitePage extrai estritamente o `token` da URL
   ├── Consulta Firestore: validateInvite(token)
   ├── Se válido: preenche Nome da Empresa, Cargo e E-mail a partir do banco de dados
   └── Se inválido ou expirado: bloqueia a tela com aviso explícito

3. Colaborador define sua senha e envia:
   ├── createUserWithEmailAndPassword() no Firebase Auth
   ├── setDoc() no Firestore `users/{uid}`
   ├── acceptInvite() atualiza status do convite para 'accepted'
   └── Redireciona diretamente para o Dashboard da empresa
```

---

## 3. Gestão de Organizações & Modelo Enterprise Ilimitado

### 📂 Arquivos Responsáveis:
- **Provisionamento**: [`src/lib/teams.ts`](file:///C:/Users/JoséFrazãodaSilvaNet/src/lib/teams.ts) (`createOrganization`)
- **Dashboard Super Admin**: [`src/components/dashboard/AdminDashboard.tsx`](file:///C:/Users/JoséFrazãodaSilvaNet/src/components/dashboard/AdminDashboard.tsx)

### 🏢 Parâmetros Corporativos:
- **Plano Padrão**: `enterprise` (All-Inclusive — R$ 3.200/mês).
- **Limite de Usuários (`maxUsers`)**: `-1` (onde `<= 0` ou `-1` = **Usuários Ilimitados** sem travas artificiais).
- **Limite de Equipes (`maxTeams`)**: `-1` (Equipes Ilimitadas).
- **Status da Empresa**: `active` ou `inactive`.

---

## 4. Autenticação, Perfis & Roteamento SPA

### 📂 Arquivos Responsáveis:
- **Orquestrador de Rotas**: [`src/App.tsx`](file:///C:/Users/JoséFrazãodaSilvaNet/src/App.tsx)
- **Consulta de Perfil**: [`src/lib/teams.ts`](file:///C:/Users/JoséFrazãodaSilvaNet/src/lib/teams.ts) (`getUserProfile`)

### 🧭 Hierarquia de Roteamento no `App.tsx`:
1. **`loading === true`** ➔ `<AppLoadingScreen />` (safety timer de 800ms).
2. **`isPublicRoute` (`/public/portfolio`)** ➔ `<PublicPortfolioView />`.
3. **`simulation?.active`** ➔ `<Dashboard>` em memória (`sandboxService`).
4. **`!user` (Não autenticado)**:
   - `/login` ➔ `<LoginPage />`
   - `/register` ou `/accept-invite` ➔ `<AcceptInvitePage />`
   - `/apresentacao` ou `/vendas` ➔ `<SalesPresentationPage />`
   - `/demo` ➔ `<DemoPage />`
   - Links com `?token=` ➔ Redirecionam para `/accept-invite?...`
5. **`profile?.role === 'super_admin'`** ➔ `<AdminDashboard />`.
6. **`user` autenticado (Empresa)** ➔ `<Dashboard />`.

---

## 5. FinOps & Telemetria do Firestore

### 📂 Arquivos Responsáveis:
- **Interceptador / Telemetria**: [`src/lib/firebase.ts`](file:///C:/Users/JoséFrazãodaSilvaNet/src/lib/firebase.ts)
- **Painel de Monitoramento**: [`src/components/dashboard/FinOpsFirestorePanel.tsx`](file:///C:/Users/JoséFrazãodaSilvaNet/src/components/dashboard/FinOpsFirestorePanel.tsx)

### 📊 Métricas Monitoradas em Tempo Real:
- **Reads Reais**: Contagem de leituras cobráveis no servidor Firestore.
- **Cache Hits**: Leituras servidas localmente pelo IndexedDB (custo zero).
- **Writes / Deletes**: Operações de gravação e exclusão rastreadas.
- **Projeção de Custos**: Cálculo em tempo real baseado no Blaze Plan oficial.

---

## 6. Matriz de Troubleshooting Rápido

| Sintoma / Erro | Causa Mais Provável | Onde Corrigir |
| :--- | :--- | :--- |
| **Erro 403 no Resend** | 1. Conta em modo de teste do Resend enviando para destinatário que não é o titular da conta.<br>2. Chave `RESEND_API_KEY` na Vercel ausente ou sem permissões de envio.<br>3. Domínio remetente não verificado no painel do Resend. | No painel do Resend (`resend.com/domains`) verificar o domínio corporativo e atualizar `RESEND_API_KEY` na Vercel. |
| **Link de convite caindo no Login** | URL antiga gerada com `/register?invite=` sem rota. | Gerar novo convite pelo sistema — agora padronizado em `/accept-invite?token=`. |
| **Convite Inválido ou Expirado** | O token não existe na coleção `invites` ou ultrapassou 72 horas. | No Super Admin ➔ Setup da Empresa ➔ Reenviar Convite. |
| **Empresa Bloqueada por Limite** | Organização com `maxUsers` positivo preenchido. | No Super Admin ➔ Editar Empresa ➔ Definir Limite de Usuários para ilimitado (`-1`). |

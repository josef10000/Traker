# 📘 Guia de Funções Críticas & Arquitetura — Tracker Platform

Este documento serve como a **Fonte Única de Verdade (Single Source of Truth)** técnica sobre as funções críticas da plataforma Tracker. Use este manual para entender a arquitetura, diagnosticar comportamentos e corrigir rapidamente eventuais inconsistências em produção.

---

## 📑 Sumário

1. [Serviço de Disparo de E-mails & Resend](#1-serviço-de-disparo-de-e-mails--resend)
2. [Fluxo de Convites & Ativação de Usuários](#2-fluxo-de-convites--ativação-de-usuários)
3. [Gestão de Organizações & Modelo Enterprise](#3-gestão-de-organizações--modelo-enterprise)
4. [Autenticação, Perfis & Roteamento SPA](#4-autenticação-perfis--roteamento-spa)
5. [FinOps & Telemetria do Firestore](#5-finops--telemetria-do-firestore)
6. [Matriz de Troubleshooting Rápido](#6-matriz-de-troubleshooting-rápido)

---

## 1. Serviço de Disparo de E-mails & Resend

### 📂 Arquivos Responsáveis:
- **Serverless Function (Backend)**: [`/api/send-email.ts`](file:///C:/Users/JoséFrazãodaSilvaNet/api/send-email.ts)
- **Serviço Frontend**: [`src/services/emailService.ts`](file:///C:/Users/JoséFrazãodaSilvaNet/src/services/emailService.ts) e [`src/lib/emailService.ts`](file:///C:/Users/JoséFrazãodaSilvaNet/src/lib/emailService.ts)
- **Template HTML Responsivo**: [`src/templates/inviteEmailTemplate.ts`](file:///C:/Users/JoséFrazãodaSilvaNet/src/templates/inviteEmailTemplate.ts)
- **Painel de Teste no Super Admin**: [`src/components/modals/EmailTesterModal.tsx`](file:///C:/Users/JoséFrazãodaSilvaNet/src/components/modals/EmailTesterModal.tsx)

### ⚙️ Como Funciona:
```
[Frontend / UI]
   │
   ├── sendInviteEmail({ recipientEmail, orgName, roleName, inviteUrl })
   │
   ▼
[Vercel Serverless Function: POST /api/send-email]
   │
   ├── 1. Valida payload (recipientEmail, inviteUrl)
   ├── 2. Lê RESEND_API_KEY do process.env (Vercel Secrets)
   ├── 3. Gera HTML com inviteEmailTemplate
   ├── 4. Dispara POST https://api.resend.com/emails
   │
   ▼
[Fallback Firestore (Se a Serverless Function estiver offline)]
   └── Grava documento em db.collection('mail') para envio via Firestore Trigger Email
```

### 🔒 Variáveis de Ambiente Necessárias (Vercel):
| Variável | Descrição | Exemplo |
| :--- | :--- | :--- |
| `RESEND_API_KEY` | Chave de API da conta Resend | `re_123456789...` |
| `RESEND_FROM_EMAIL` | E-mail remetente verificado no Resend | `onboarding@resend.dev` ou `contato@seudominio.com.br` |
| `RESEND_FROM_NAME` | Nome exibido no remetente | `Tracker Platform` |

---

## 2. Fluxo de Convites & Ativação de Usuários

### 📂 Arquivos Responsáveis:
- **Criação em Lote**: [`src/lib/teams.ts`](file:///C:/Users/JoséFrazãodaSilvaNet/src/lib/teams.ts) (`createInvitesInBulk`)
- **Validação de Token**: [`src/lib/teams.ts`](file:///C:/Users/JoséFrazãodaSilvaNet/src/lib/teams.ts) (`validateInvite`)
- **Aceite & Vinculação**: [`src/lib/teams.ts`](file:///C:/Users/JoséFrazãodaSilvaNet/src/lib/teams.ts) (`acceptInvite`)
- **Tela de Ativação**: [`src/components/auth/AcceptInvitePage.tsx`](file:///C:/Users/JoséFrazãodaSilvaNet/src/components/auth/AcceptInvitePage.tsx)
- **Modal de Gestão**: [`src/components/modals/CompanyUserSetupModal.tsx`](file:///C:/Users/JoséFrazãodaSilvaNet/src/components/modals/CompanyUserSetupModal.tsx)

### 🔄 Ciclo de Vida do Convite:
```
1. Gestor cria convite no modal -> createInvitesInBulk()
   ├── Gera token aleatório de 16 caracteres
   ├── Grava documento em `invites/{inviteId}` com status 'pending' e expiresAt (72h)
   ├── Dispara e-mail com link: /accept-invite?token=ABC&email=user@emp.com&org=Empresa&role=manager&orgId=XYZ
   └── Disponibiliza link para envio via WhatsApp ou cópia em lote

2. Colaborador clica no link -> /accept-invite?token=ABC
   ├── AcceptInvitePage valida token no Firestore (validateInvite)
   ├── Se válido: preenche Nome da Empresa, Cargo e E-mail automaticamente
   └── Exibe formulário "Defina sua Senha de Acesso"

3. Colaborador envia formulário:
   ├── createUserWithEmailAndPassword() no Firebase Auth
   ├── setDoc() no Firestore `users/{uid}` com role, organizationId e teamId
   ├── acceptInvite() atualiza status do convite para 'accepted'
   └── Redireciona diretamente para o Dashboard da empresa
```

---

## 3. Gestão de Organizações & Modelo Enterprise

### 📂 Arquivos Responsáveis:
- **Provisionamento**: [`src/lib/teams.ts`](file:///C:/Users/JoséFrazãodaSilvaNet/src/lib/teams.ts) (`createOrganization`)
- **Dashboard Super Admin**: [`src/components/dashboard/AdminDashboard.tsx`](file:///C:/Users/JoséFrazãodaSilvaNet/src/components/dashboard/AdminDashboard.tsx)

### 🏢 Parâmetros Corporativos:
- **Plano Padrão**: `pro` (Modelo All-Inclusive Enterprise - R$ 3.200/mês).
- **Limite de Usuários (`maxUsers`)**: `999` (Sem trava artificial de assentos).
- **Limite de Equipes (`maxTeams`)**: `50`.
- **Status da Empresa**: `active` ou `inactive` (Se inativa, os membros caem na tela [`OrgSuspendedScreen.tsx`](file:///C:/Users/JoséFrazãodaSilvaNet/src/components/app/OrgSuspendedScreen.tsx)).

---

## 4. Autenticação, Perfis & Roteamento SPA

### 📂 Arquivos Responsáveis:
- **Orquestrador de Rotas**: [`src/App.tsx`](file:///C:/Users/JoséFrazãodaSilvaNet/src/App.tsx)
- **Consulta de Perfil**: [`src/lib/teams.ts`](file:///C:/Users/JoséFrazãodaSilvaNet/src/lib/teams.ts) (`getUserProfile`)

### 🧭 Hierarquia de Roteamento no `App.tsx`:
1. **`loading === true`** ➔ `<AppLoadingScreen />` (com safety timer de 800ms).
2. **`isPublicRoute` (`/public/portfolio`)** ➔ `<PublicPortfolioView />`.
3. **`simulation?.active`** ➔ `<Dashboard>` com dados mockados em memória via `sandboxService`.
4. **`!user` (Não autenticado)**:
   - `/login` ➔ `<LoginPage />`
   - `/register` ou `/accept-invite` ➔ `<AcceptInvitePage />`
   - `/apresentacao` ou `/vendas` ➔ `<SalesPresentationPage />`
   - `/demo` ➔ `<DemoPage />`
   - `*` com `?token=` ➔ Redireciona para `/accept-invite?...`
5. **`profile?.role === 'super_admin'`** ➔ `<AdminDashboard />`.
6. **`user` autenticado (Empresa)** ➔ `<Dashboard />`.

---

## 5. FinOps & Telemetria do Firestore

### 📂 Arquivos Responsáveis:
- **Interceptador / Telemetria**: [`src/lib/firebase.ts`](file:///C:/Users/JoséFrazãodaSilvaNet/src/lib/firebase.ts)
- **Painel de Monitoramento**: [`src/components/dashboard/FinOpsFirestorePanel.tsx`](file:///C:/Users/JoséFrazãodaSilvaNet/src/components/dashboard/FinOpsFirestorePanel.tsx)

### 📊 Métricas Monitoradas em Tempo Real:
- **Reads Reais**: Contagem exata de leituras feitas contra o Firestore no servidor.
- **Cache Hits**: Leituras servidas pelo IndexedDB local do navegador (custo zero no Google Cloud).
- **Writes / Deletes**: Operações de escrita e deleção registradas na sessão.
- **Projeção de Custos**: Custo baseado na tabela oficial do Firebase Blaze Plan ($0.06 por 100k reads, $0.18 por 100k writes).

---

## 6. Matriz de Troubleshooting Rápido

| Sintoma / Erro | Causa Mais Provável | Onde Corrigir |
| :--- | :--- | :--- |
| **Erro 403 ao enviar e-mail** | `RESEND_API_KEY` ausente ou inválida no painel da Vercel | Vercel ➔ Settings ➔ Environment Variables |
| **Link de convite caindo no Login** | URL antiga com `/register?invite=` sem rota mapeada | Verificar se `teams.ts` está usando `/accept-invite?token=` |
| **Erro React #310** | Hook declarado após um `return` condicional ou `useNavigate` fora de `<Routes>` | Inspecionar topo do componente e garantir execução incondicional de hooks |
| **Empresa bloqueada ao criar usuários** | `maxUsers` da organização setado com número baixo | No Super Admin ➔ Editar Empresa ➔ Aumentar Limite de Usuários para 999 |
| **Convite Expirado** | Data de expiração ultrapassou as 72 horas | No Super Admin ➔ Setup da Empresa ➔ Reenviar Convite |

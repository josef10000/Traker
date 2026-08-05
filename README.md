# ⚡ Tracker SaaS — Gestão Inteligente de Acordos & Recuperação de Crédito

[![React](https://img.shields.io/badge/React-18.3-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.4-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Firebase](https://img.shields.io/badge/Firebase-10.12-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](https://firebase.google.com/)
[![SonarCloud](https://img.shields.io/badge/SonarCloud-Security_A-4E9BCD?style=for-the-badge&logo=sonarcloud&logoColor=white)](https://sonarcloud.io/)

Plataforma corporativa de **alta performance (Multi-Tenant)** voltada para a gestão de cobrança, conciliação financeira, BI analítico preditivo e monitoramento em tempo real de equipes operacionais. Unindo **Compliance LGPD rigoroso**, **Resiliência Offline-First** e **arquitetura de baixo custo de nuvem**.

---

## 🌟 Principais Pilares do Sistema

| Pilar | Descrição |
| :--- | :--- |
| **🏢 Multi-Tenant Isolado** | Isolamento físico e lógico absoluto de dados por organização no Firebase Firestore. |
| **🔒 Compliance LGPD Nativo** | Mascaramento dinâmico de CPF/valores e **Cadeia de Auditoria Criptográfica (SHA-256)** encadeada em blockchain local. |
| **📡 Resiliência Offline-First** | Operação ininterrupta sem internet via **IndexedDB Cache Gate**, com sincronização automática na reconexão. |
| **📊 BI & Forecast Preditivo** | Analytics em 5 visões com projeções N+1, análise de sazonalidade, curva de liquidez e rastreamento de descontos. |
| **⏱️ Jornada Hora a Hora** | Cockpit de acompanhamento de produção em tempo real com **Banco de Pausas Flexível de 72 min/dia**. |
| **🎨 Design Enterprise Pastel** | Interface minimalista em Dark Mode com **Glassmorphism**, reduzindo o cansaço visual e otimizando o espaço vertical. |

---

## 👥 Permissões & Hierarquia de Cargos (Roles)

```mermaid
graph TD
    SA[👑 Super Admin] --> COR[🧭 Coordenador Geral]
    COR --> GER[👔 Gerente de Organização]
    GER --> SUP[👥 Supervisor de Equipe]
    SUP --> OP[👤 Operador de Cobrança]
    SUP --> QA[🎯 Monitor de Qualidade / QA]
    COR --> BO[📊 Back Office / Tratador]
```

- **👑 Super Admin**: Gestão de instâncias, planos corporativos e ferramentas de manutenção em lote.
- **🧭 Coordenador**: Visão macro de performance, escala mensal de presença, abonos PJ e transferência de equipes.
- **👔 Gerente**: Autonomia de equipes, relatórios corporativos executivos e políticas operacionais.
- **👥 Supervisor**: Gestão da equipe, acompanhamento de metas R$, histórico comportamental, criação e conciliação de acordos.
- **🎯 Monitor de Qualidade (QA)**: Avaliação por competências customizadas, matrizes de radar e gestão de PDIs.
- **👤 Operador**: Registro e conciliação de acordos, agenda CRM de retornos, meta diária dinâmica e modo conferência.
- **📊 Back Office**: Higienização e tratamento automatizado de cargas/planilhas (.xlsx, .csv) com ações em lote.

---

## ⚡ Recursos de Destaque

### 📡 Resiliência Offline & Optimistic UI
- **Operação Sem Sinal**: Se a conexão de internet oscilar ou cair, operadores e supervisores logados continuam registrando acordos, tabulações e retornos normalmente.
- **Badge Visual**: O cabeçalho exibe automaticamente o badge `📡 Modo Offline (Gravando Localmente)` quando desconectado.
- **Sincronização Transparente**: Assim que a rede retorna, os registros acumulados no `IndexedDB` são enviados de forma atômica para a nuvem sem exigir recarregar a página.

### 🛡️ Criptografia & Audit Chain LGPD
- **Mascaramento Automático**: CPFs exibidos como `***.***.*89-01` com revelação temporária auditada de 10 segundos.
- **Audit Logs Criptográficos**: Cada leitura, exportação ou alteração gera um bloco encadeado via hash SHA-256 (vincular bloco anterior ao atual no Firestore), garantindo rastreabilidade à prova de adulteração.

### 📊 BI Analítico em 5 Visões & Previsibilidade
1. **Visão Geral & Heatmaps**: Distribuição diária, horária e mapa de calor de arrecadação de 31 dias.
2. **Matriz por Canais de Contato**: Performance por *Voz*, *WhatsApp*, *Salesforce*, *Oktor*, *Quite Digital*, etc.
3. **Quadrante QA vs. Performance**: Cruzamento de nota de qualidade com retorno financeiro (ROI do treinamento).
4. **Maturação & Alerta Preditivo**: Forecast N+1 com curva de liquidez e colchão de pagamentos parcelados (MRR).
5. **Análise de Descontos**: Efetividade de pagamento e taxa de quebra em acordos com vs. sem desconto.

---

## 🚀 Arquitetura & Otimização de Engenharia

- **Cache Gate (Economia de ~95% no Firestore)**: A leitura de estatísticas e KPIs é validada por um "portão de frescor" no Firestore. Se não houver novas mutações, o sistema lê os dados diretamente do IndexedDB local com **custo 0 de leitura na nuvem**.
- **Paginação por Cursors**: Listagem de acordos via cursores nativos (`limit`, `startAfter`), reduzindo o consumo de memória e tráfego.
- **Componentização Desacoplada**: Lógicas de negócio em hooks puros (`useAgreements`, `useTeamMembers`, `useNetworkStatus`) e modais centralizados em `DashboardModals.tsx`.

---

## 📂 Estrutura do Projeto

```text
src/
├── components/
│   ├── auth/          # Login, Onboarding e Seleção de Organização
│   ├── chat/          # Chat Interno com Regras de Segurança Firestore
│   ├── dashboard/     # Módulos do Dashboard (Header, BI, Jornada, Auditoria, QA)
│   ├── modals/        # Modais Operacionais (Acordo, Conciliação, Configurações, Equipes)
│   ├── profile/       # Gestão de Perfil, Escala e Prestação PJ
│   └── ui/            # Design System (CustomSelect, Toast, Animações, ModalConfirm)
├── hooks/             # Custom Hooks (useAgreements, useNetworkStatus, useTeamMembers)
├── lib/               # Firebase SDK, Criptografia de Auditoria e Cache Stats
├── utils/             # Formatadores, Máscaras, Manipulação de Datas e Webhooks
└── types.ts           # Interfaces e Contratos de Dados TypeScript
```

---

## 💻 Como Executar o Projeto Localmente

### Pré-requisitos
- **Node.js** (v18+)
- **npm** (v10+)

### 1. Clonar & Instalar
```bash
git clone https://github.com/josef10000/Traker.git
cd Traker
npm install
```

### 2. Configurar Variáveis de Ambiente (`.env.local`)
Crie o arquivo `.env.local` na raiz do projeto com suas chaves do Firebase:

```env
VITE_FIREBASE_API_KEY=sua_api_key
VITE_FIREBASE_AUTH_DOMAIN=seu_auth_domain
VITE_FIREBASE_PROJECT_ID=seu_project_id
VITE_FIREBASE_STORAGE_BUCKET=seu_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=seu_messaging_sender_id
VITE_FIREBASE_APP_ID=seu_app_id
```

### 3. Rodar em Desenvolvimento
```bash
npm run dev
```

---

## 🛡️ CI/CD & Qualidade de Código

O repositório está integrado a pipelines automatizados do **GitHub Actions**:
- **TypeScript Typecheck**: `npm run build` / `tsc --noEmit`
- **Análise Estática SonarCloud**: Cobertura de segurança (Rating A), prevenção de bugs e boas práticas.

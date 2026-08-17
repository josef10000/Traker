# ⚡ Tracker SaaS — Gestão Inteligente de Acordos & Recuperação de Crédito

[![React](https://img.shields.io/badge/React-19.0-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.4-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.0-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Firebase](https://img.shields.io/badge/Firebase-12.12-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](https://firebase.google.com/)
[![Grafana](https://img.shields.io/badge/Grafana-Cloud-F46800?style=for-the-badge&logo=grafana&logoColor=white)](https://grafana.com/)
[![SonarCloud](https://img.shields.io/badge/SonarCloud-Security_A-4E9BCD?style=for-the-badge&logo=sonarcloud&logoColor=white)](https://sonarcloud.io/)

Plataforma corporativa de **alta performance (Multi-Tenant)** voltada para a gestão de cobrança, conciliação financeira, BI analítico preditivo e monitoramento em tempo real de equipes operacionais. Unindo **Compliance LGPD rigoroso**, **Observabilidade com Grafana**, **Resiliência Offline-First** e **arquitetura de baixo custo de nuvem**.

---

## 🌟 Principais Pilares do Sistema

| Pilar | Descrição |
| :--- | :--- |
| **🏢 Multi-Tenant Isolado** | Isolamento físico e lógico absoluto de dados por organização no Firebase Firestore. |
| **⚡ FinOps & Telemetria do Firestore** | Cockpit em tempo real de auditoria de leituras (*reads*), gravações (*writes*), latência média e taxa de *Cache Hit* por tela, prevenindo custos desnecessários em escala. |
| **📦 Materialização de Estatísticas (`monthly_stats`)** | Agregação e pré-cálculo de métricas consolidadas por organização e carteira, reduzindo de 100.000 para **1 leitura única** no carregamento do Dashboard. |
| **🧊 Freshness Gate com TTL em Camadas** | Cache de alta velocidade em memória e IndexedDB com política *Stale-While-Revalidate* e TTL de 90 a 180s, eliminando requisições repetitivas ao banco. |
| **🔒 Compliance LGPD Nativo** | Mascaramento dinâmico de CPF/valores e **Cadeia de Auditoria Criptográfica (SHA-256)** encadeada em blockchain local. |
| **📡 Resiliência Offline-First** | Operação ininterrupta sem internet via **IndexedDB Cache Gate**, com sincronização automática na reconexão. |
| **📈 Grafana & Observabilidade** | Telemetria contínua com Grafana Cloud para monitoramento de métricas, throughput de rede e saúde do SaaS. |
| **🛡️ SonarCloud Security A** | Análise estática contínua de segurança, prevenção de bugs e 0 vulnerabilidades em pipeline CI/CD. |
| **📊 BI & Forecast Preditivo** | Analytics estruturado em 4 visões focadas (Visão Geral & Heatmaps, Matriz de Canais, Análise de Descontos e Forecast Preditivo com Maturação), eliminando visões estáticas e consolidando scores preditivos. |
| **⏱️ Jornada Hora a Hora** | Cockpit de acompanhamento de produção em tempo real com **Banco de Pausas Flexível de 72 min/dia**. |
| **🚨 Risco em Vencimento no Dia** | Painel exclusivo de Supervisão com configurador de corte de **"Valor Alto"**, filtro estrito, badges prioritárias, disparo direto via WhatsApp e cópia de scripts em 1-clique. |
| **⭐ Biblioteca de Ouro (QA)** | Galeria de gravações de alta performance e áudios de destaque (*Best Practice*) para treinamento contínuo e *onboarding* de novos operadores. |
| **🧹 Higienização & Deduplicação (Back Office)** | Importação inteligente com diagnóstico prévio em tempo real, detecção e remoção atômica de CPFs duplicados e validação cadastral. |
| **🏆 Comparador Multi-Nível** | Benchmark lado a lado entre **Equipes, Supervisores e Operadores** com comparativos de R$ Gerado, R$ Pago, Efetividade % e Quebra %. |
| **📜 Prontuário 360° por CPF** | Histórico cronológico completo do cliente por CPF com registro de acordos passados, operadores e mural de anotações internas. |
| **🔗 Link Público Modular** | Gerador interativo de relatórios públicos com **switches de bolinha verde**, presets rápidos (TV, Diretoria, Escala), módulos de Presença/Absenteísmo, Pacing, Pódio, Ranking, Ocultação de R$, Modo Sigiloso e PIN de 4 dígitos. |
| **🚀 Apresentação Comercial Interativa (`/apresentacao`)** | Landing page de vendas imersiva com **Simulador Interativo de ROI**, gerador em 1-clique de **Proposta Comercial em PDF** e apresentação da oferta única de **R$ 3.200/mês (All-Inclusive com usuários ilimitados)**. |
| **📑 Relatório Executivo em PDF** | Emissão em 1-clique de demonstrativo consolidado mensal com KPIs, taxas de liquidação, ticket médio e ranking operacional em layout A4 de alta fidelidade. |
| **✨ Badges Semânticos & Shimmer Skeletons** | Badges dinâmicos com micro-animações de pulso esmeralda/âmbar e carregamento estruturado com efeito shimmer gradiente. |
| **📁 Retenção R2 de Comprovantes** | Central de anexo de comprovantes bancários em nuvem R2 (retenção 24h na Sandbox e 1 ano em Produção). |
| **🎨 Design Enterprise Pastel** | Interface minimalista em Dark Mode com **Glassmorphism**, reduzindo o cansaço visual e otimizando o espaço vertical. |
| **🔔 Sino & Confirmação de Ciência** | Entrega de 100% das notificações exclusivamente pelo sino (0 modais na tela no login) e sistema de confirmação de leitura com ciente e tréplica para QA e Comunicados. |
| **🌤️ Clima & Feriados Nacionais** | Widget de temperatura ao vivo (Open-Meteo) e mapeamento automático de feriados brasileiros (BrasilAPI) no calendário geral de escala e atividades PJ. |
| **🎧 Tabulação Ágil & Auto-Registro** | Auto-geração de tabulação ao fechar acordos (sem retrabalho), CPF opcional para ligações improdutivas, presets rápidos ordenados adaptativamente por mais usados e segmentação de motivos por equipe/carteira. |
| **⚖️ Conformidade Jurídica PJ** | Estruturação de nomenclatura e recursos operacionais voltados a prestadores de serviços PJ (Minha Escala e Prestação PJ), eliminando termos trabalhistas. |

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

### 🔗 Relatórios Públicos Modulares & Suíte Executiva
- **Árvore Organizacional em Cascata**: Navegação e filtragem dinâmica em 4 níveis: `🏢 Empresa` ➔ `🏷️ Produto/Carteira` ➔ `👔 Gerente` ➔ `👥 Supervisor` ➔ `👥 Equipe`.
- **Configurador Visual Interativo**: Modal com interruptores de **bolinha verde brilhante** para ativar ou desativar blocos em tempo real com preservação de estado visual.
- **Presets Rápidos em 1-Clique**: Perfis pré-definidos para *TV da Operação*, *Diretoria & Clientes* e *Escala & Presença*.
- **Módulos Disponíveis**: Presença & Absenteísmo PJ, Ritmo Diário (Pacing & Run-rate), Picos de Produção (Hora a Hora), KPIs Globais, Comparativo MoM (Mês a Mês), Pódio dos Campeões (Top 3), Ranking Geral (Leaderboard), Taxas de Liquidação, Ticket Médio e Distribuição por Carteiras.
- **Ferramentas de Apresentação**: **QR Code Instantâneo** no modal para abertura rápida via celular em reuniões e botões de **Download em Imagem PNG** e **Impressão em PDF Executivo**.
- **Privacidade & Compliance**: Ocultação seletiva de valores monetários brutos (Modo Percentual relativo), Modo Sigiloso (anonimização com Analista #1, #2...) e proteção com PIN numérico de 4 dígitos.
- **Governança RBAC**: Recurso acessível exclusivamente por **Super Admins**, **Gerentes**, **Coordenadores** e **Supervisores** (com escopo restrito ao seu respectivo time).

---

## 📈 Observabilidade com Grafana & Qualidade SonarCloud

### 📊 Telemetria & Monitoramento com Grafana Cloud
O sistema conta com exportação de métricas e integração via **Grafana Cloud** (`GRAFANA_URL` e `GRAFANA_API_TOKEN`):
- **Painéis de Produção**: Monitoramento de acordos criados por minuto, volume R$ recuperado e taxa de conversão da operação.
- **Saúde do Sistema**: Rastreamento de latência em chamadas de API, utilização do cache local (IndexedDB) e erros runtime.
- **Alertas Automatizados**: Notificação em tempo real caso haja oscilações bruscas na taxa de efetividade de pagamentos.

### 🛡️ Qualidade de Código & Segurança SonarCloud
O repositório mantém integração nativa com o **SonarCloud** (Projeto `josef10000_Traker`):
- **Security Rating A**: Varredura contínua contra vulnerabilidades de código, injeção de dados e exposição de dados sensíveis.
- **Zero Bugs & Code Smells**: Rigorosa validação de tipagem TypeScript e prevenção de chamadas assíncronas não aguardadas (*un-awaited promises*).
- **Security Rules Firestore em 4 Camadas**: Regras granulares por organização (`organizationId`), remetente/destinatário e validações em lote.

---

## 🚀 Arquitetura & Otimização de Engenharia

- **Code-Splitting Avançado com Chunking Manual**: O bundler Vite divide dinamicamente o código de produção em pacotes separados por módulo (`vendor-charts`, `vendor-firebase`, `vendor-excel`, `vendor-icons` e `vendor-react-core`), garantindo downloads em paralelo e renderizações instantâneas.
- **Validação com Custom Claims no Firestore**: As regras do Firestore checam preferencialmente as alegações customizadas de token (`request.auth.token.organizationId` / `role`), eliminando chamadas repetidas de `get()` e reduzindo o consumo/latência de leitura no banco.
- **Cache Gate (Economia no Firestore)**: A leitura de estatísticas e KPIs é validada por um portão de frescor no Firestore. Se não houver novas mutações, o sistema lê os dados diretamente do IndexedDB local com custo 0 de leitura na nuvem.
- **Paginação por Cursors**: Listagem de acordos via cursores nativos (`limit`, `startAfter`), reduzindo o consumo de memória e tráfego.
- **Componentização Desacoplada**: Lógicas de negócio em hooks puros (`useAgreements`, `useTeamMembers`, `useNetworkStatus`) e modais centralizados.

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
Crie o arquivo `.env.local` na raiz do projeto com suas credenciais:

```env
# Firebase
VITE_FIREBASE_API_KEY=sua_api_key
VITE_FIREBASE_AUTH_DOMAIN=seu_auth_domain
VITE_FIREBASE_PROJECT_ID=seu_project_id
VITE_FIREBASE_STORAGE_BUCKET=seu_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=seu_messaging_sender_id
VITE_FIREBASE_APP_ID=seu_app_id

# Observabilidade & Grafana Cloud
GRAFANA_URL=https://lankyquokka3421.grafana.net
GRAFANA_API_TOKEN=seu_token_grafana_cloud

# Cloudflare R2 (Upload & Retenção de Imagens)
VITE_R2_ACCOUNT_ID=seu_account_id
VITE_R2_BUCKET_NAME=seu_bucket_r2
VITE_R2_ACCESS_KEY_ID=sua_access_key_id
VITE_R2_SECRET_ACCESS_KEY=sua_secret_access_key
VITE_R2_PUBLIC_URL=https://sua-cdn.r2.dev
VITE_R2_UPLOAD_ENDPOINT=https://seu-upload-worker.r2.workers.dev
```

> **Regras Automáticas de Retenção/Expiração no Cloudflare R2**:
> - **Ambiente Sandbox / Testes (`sandbox-24h/`)**: Imagens e prints de tratativa expiram e são removidos automaticamente em **24 horas** (metadado `x-amz-meta-ttl: 86400`).
> - **Base de Conhecimento (`kb-1year/`)**: Imagens anexadas a manuais e roteiros expiram e são removidos automaticamente em **1 ano / 365 dias** (metadado `x-amz-meta-ttl: 31536000`).

### 3. Rodar em Desenvolvimento & Scripts
```bash
# Rodar ambiente local de desenvolvimento
npm run dev

# Executar checagem de tipos estáticos sem emitir arquivos
npm run lint

# Executar testes unitários e de integração com Vitest
npm run test

# Limpar diretório dist de build de forma segura e cross-platform (Windows/Linux/macOS)
npm run clean

# Gerar pacote de produção otimizado
npm run build
```

---

## 🛡️ CI/CD & Automação GitHub Actions

O repositório utiliza **GitHub Actions** para executar verificações automatizadas a cada push/pull request:
- **TypeScript Typecheck**: Compilação e checagem estática de tipos (`tsc --noEmit`).
- **Production Build Check**: Garante que o bundler Vite gere o pacote de produção sem falhas.
- **SonarCloud Analysis**: Análise automática de segurança, confiabilidade e métricas de manutenibilidade.
- **Segurança de Endpoints Serverless**: Varredura contra exposição de chaves privadas (`RESEND_API_KEY`) no bundle do cliente.
- **Tags de Restauração**: Restauração garantida via tag de versão (`backup-pre-refactor-20260807`).


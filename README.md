# Tracker SaaS — Plataforma Avançada de Gestão de Acordos e Recuperação de Crédito

[![React](https://img.shields.io/badge/React-20272F?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](https://firebase.google.com/)

O **Tracker SaaS** é uma solução corporativa completa de alta performance (Multi-Tenant) voltada para a gestão de cobrança, conciliação financeira e monitoramento em tempo real de acordos. Projetado para operações escaláveis de assessorias de cobrança, fintechs e departamentos financeiros, o sistema une segurança de dados, privacidade (100% aderente à LGPD) e alta eficiência de engenharia.

---

## 💎 Diferenciais de Negócio (SaaS Value)

* **🏢 Arquitetura Multi-Tenant Isolada**: Permite a operação simultânea de múltiplas organizações (empresas) com separação física e lógica completa no banco de dados. Os dados de acordos, presenças, conciliações e logs de auditoria são completamente isolados.
* **🛡️ Compliance LGPD Nativo (Audit Chain Criptográfica)**: Protege dados pessoais sensíveis através de mascaramento de CPF no formato `***.***.*89-01`, controle rígido de revelação temporária (10 segundos) e clipboard seguro. Toda ação crítica (visualização, exportação, exclusão) é registrada em uma **Cadeia de Auditoria Criptográfica** encadeada sequencialmente via hashes SHA-256 no Firestore (bloco anterior vinculado ao atual), garantindo a imutabilidade e rastreabilidade absoluta dos acessos para conformidade LGPD avançada (B2B/Enterprise).
* **🎯 Gestão de Metas e Performance Dinâmica**: Acompanhamento em tempo real das metas da organização e individuais com o cálculo automático de **Meta Diária Dinâmica** calibrada reativamente pelos dias úteis restantes no mês e valores já liquidados.
* **📊 Inteligência & Insights Avançados**: Gráficos analíticos de produtividade por turnos, funil de atingimento, projeções matemáticas de fim de mês e distribuição horária do time para identificar picos de produtividade.
* **👥 Gestão de Colaboradores & Clima comportamental**: Apontamento e monitoramento de presença diária (Presente, Atrasado, Falta) e controle de notas comportamentais privadas com histórico consolidado e relatórios executivos para RH/Supervisão.
* **📄 Relatórios PDF Corporativos Premium**: Sistema com CSS de impressão otimizado que transforma o painel operacional em um relatório executivo minimalista de alto contraste pronto para reuniões com CNPJ, rankings de operadores e parecer técnico.
* **🎨 Modo Visual Premium Switchable**: Possibilidade de alternar instantaneamente entre o **Modo Clássico** e o **Modo Premium** (com base em um estilo visual ultra-premium, glassmorphism rico com filetes de brilho interno, ícones em relevo metálico 3D e micro-gráficos exibidos na face frontal dos cartões). A escolha é persistida de forma reativa localmente no navegador e está acessível em todos os perfis e inclusive no Sandbox.

---

## 🛠️ Funcionalidades por Nível de Acesso (Hierarquia de Cargos)

A plataforma conta com 5 níveis de controle de permissões dinâmicos (Roles):

1. **👑 Super Admin (Dono da Infraestrutura)**:
   - Gerenciamento reativo de todas as organizações e controle de planos (`free`, `starter`, `pro`, `enterprise`, `custom`).
   - Simulação de cargos em ambiente de Testes Sandbox com provisionamento automático de dados de demonstração.
   - Ferramenta de exclusão em lote (chunking reativo de 400 em 400 documentos no Firestore para evitar limites do SDK).
2. **👔 Gerente (Manager - Gestor da Organização)**:
   - Visualização macro de todas as equipes da empresa e do ranking consolidado de performance.
   - Autonomia para criar e remover equipes dentro dos limites estabelecidos pelo plano.
   - Acesso exclusivo a relatórios corporativos consolidados de operadores.
   - Configurações avançadas e segurança administrativa (bloqueio automático de conciliações e alterações individuais de acordos).
3. **👥 Supervisor (Gestor de Equipe)**:
   - Acompanhamento de metas do seu time e conciliação de saldo (Tracker vs Salesforce/Teams).
   - Gestão de presença diária de agentes, adição de notas privadas e visualização de históricos comportamentais da equipe.
   - Criação, edição e exclusão de acordos da sua equipe.
4. **🎯 Monitor de Qualidade (Monitor - Auditoria de QA & PDI)**:
   - Avaliação e auditoria de operadores com base em competências editáveis da empresa.
   - Acesso exclusivo a painéis analíticos de radar de competências.
   - Autonomia para criar, monitorar e concluir PDIs focados para desenvolvimento comportamental.
5. **👤 Operador (Colaborador que Atende)**:
   - Registro e consulta de acordos individuais e visualização da meta diária pessoal.
   - Modo de conferência rápida (Checklist / Botão "Verificar") para focar na checagem de CPFs de clientes pendentes de pagamento.

---

## 🌟 Funcionalidades Avançadas de Cobrança e Inteligência (Fases 1 a 5)

Adicionamos recursos poderosos voltados para aumentar o índice de recuperação de crédito, monitoramento de qualidade e insights preditivos:

1. **📅 CRM Ativo (Agenda de Retornos)**:
   - Permite que operadores agendem contatos futuros com data/hora obrigatórias e anotações.
   - Apresenta o painel dinâmico **Agenda do Dia** exibindo compromissos em ordem cronológica com sinalização de atrasos.
   - Flexibilidade para os gestores configurarem no perfil quais equipes monitorar, visualizando agendas de múltiplos operadores.

2. **🔍 Prevenção de Colisão e Visão 360°**:
   - Barra de busca global no cabeçalho. Ao pesquisar um CPF, exibe instantaneamente a jornada completa daquele cliente (acordos quebrados, histórico de contatos e propostas).
   - Detecção ativa de CPFs com negociação ativa em andamento no banco de dados para evitar contatos duplicados por diferentes operadores.
   - Sistema de liberação supervisionada com log de auditoria no Firestore se o operador optar por forçar a criação de um novo acordo.

3. **📥 Balcão de Recuperação de Leads**:
   - Centraliza automaticamente em uma aba específica todos os acordos quebrados (`broken`) de todas as equipes.
   - Permite que qualquer operador assuma leads individualmente ou em lote (write batch atômico no Firestore).
   - Exportação em conformidade com a LGPD com logs de auditoria e termos de responsabilidade.

4. **🎯 Qualidade & PDIs (QA Integrado)**:
   - Formulário de avaliação de qualidade do operador baseado em competências configuráveis e editáveis da organização.
   - Geração de gráficos de radar interativos (usando Recharts) exibindo a média de performance.
   - Fluxo de criação de PDIs (Planos de Desenvolvimento Individual) focados em competências com vencimento automático.
   - Notas médias injetadas reativamente na visão de equipes dos gestores e no dashboard dos próprios operadores.

5. **📈 Inteligência Financeira & BI Avançado**:
   - **Colchão MRR (Receita Recorrente Mensal)**: Projeção de recebíveis parcelados futuros e previsibilidade de caixa.
   - **Curva de Dilação vs Quebra**: Gráfico de dispersão indicando o percentual de atraso nas promessas e taxa de inadimplência.
   - **Matriz de Risco**: Classificação de CPFs em categorias de risco de quebra com base no histórico comportamental.
   - **Calendário de Calor Macro de 31 dias**: Visão macro-sazonal exibindo os dias de maior arrecadação e probabilidade de pagamento.

---

## 🚀 Arquitetura Técnica & Performance

* **Paginação Nativa no Banco (Firestore Cursors)**: A listagem de acordos adota paginação real em banco utilizando cursores de documentos (`limit`, `startAfter`), reduzindo em mais de **70% o custo operacional** de leitura e tráfego na API do Firebase.
* **Roteamento Declarativo Seguro**: Gerenciamento de rotas e segurança de visualização de telas via URL real com `react-router-dom`, isolando o onboarding, login, configurações e visualizações operacionais.
* **Outbound Webhooks Seguros**: Disparo de requisições POST HTTPS no modelo de integração silenciosa (`no-cors`) para sincronização em tempo real de novos acordos ou acordos efetivados. CPFs são automaticamente higienizados no payload do webhook.
* **Modularidade e Componentização**: Lógica matemática e de comunicação externa encapsulada em hooks customizados React (`useAgreements`, `useTeamMembers`, `useDashboardStats`) e componentes com visual premium. Modais complexos foram extraídos e isolados no componente unificado `DashboardModals.tsx` para reduzir o acoplamento do painel principal (`Dashboard.tsx`), otimizando a legibilidade e manutenibilidade do código.

---

## 📂 Organização do Código

```bash
├── src
│   ├── components
│   │   ├── auth          # Login, Cadastro e Onboarding
│   │   ├── dashboard     # Subcomponentes decompostos do Painel (Header, Grid, Tabela, Insights)
│   │   ├── modals        # Modais administrativos e operacionais (Acordo, Meta, Conciliação, CSV)
│   │   └── ui            # Componentes visuais básicos reutilizáveis
│   ├── hooks             # Custom Hooks (useAgreements, useTeamMembers, useDashboardStats)
│   ├── lib               # Inicialização de bibliotecas externas (Firebase, Audit, Notes)
│   ├── utils             # Utilitários, máscaras, datas e controle de tours
│   ├── types.ts          # Definição de Tipos e Interfaces do TypeScript
│   └── App.tsx           # Ponto de entrada com Roteador e tela de carregamento Premium
```

---

## ⚡ Guia de Inicialização Rápida

### Pré-requisitos
- Node.js (v18+)
- Conta no Firebase (Auth e Firestore)

### Configuração
1. Clone o repositório:
   ```bash
   git clone https://github.com/josef10000/Noverde-registro.git
   cd Noverde-registro
   ```
2. Instale as dependências:
   ```bash
   npm install
   ```
3. Crie um arquivo `.env.local` na raiz e adicione suas credenciais do Firebase:
   ```env
   VITE_FIREBASE_API_KEY=sua_api_key
   VITE_FIREBASE_AUTH_DOMAIN=seu_auth_domain
   VITE_FIREBASE_PROJECT_ID=seu_project_id
   VITE_FIREBASE_STORAGE_BUCKET=seu_storage_bucket
   VITE_FIREBASE_MESSAGING_SENDER_ID=seu_sender_id
   VITE_FIREBASE_APP_ID=seu_app_id
   ```
4. Execute o servidor local de desenvolvimento:
   ```bash
   npm run dev
   ```

---

## 🛡️ Pipelines & CI/CD

O projeto conta com automação via GitHub Actions para assegurar a saúde do produto antes de cada deploy:
- **TypeScript Checking**: Validação estática de tipos (`tsc --noEmit`).
- **Production Build Testing**: Garante que o bundler do Vite compile o código para produção com 100% de sucesso.
- **Auditoria LGPD**: Validação estática de chaves e vazamentos de chaves privadas.



# RNV Gestão - Dashboard Operacional

Este é um dashboard avançado para gestão de acordos, desenvolvido com React, Tailwind CSS e Firebase.

## 🚀 Novidades na Versão Atual

- 🏢 **SaaS Multi-Tenant & Painel Super Admin Master (Fase 3)**:
  - **Isolamento de Tenants**: Separação física e lógica de múltiplas empresas/organizações. Usuários comuns só enxergam dados (acordos, equipes, configurações, conciliações) de sua própria organização.
  - **Hierarquia de Cargos (Roles) Expandida**: Controle rígido com 4 cargos: `super_admin` (acesso completo a tudo), `manager` (gerente da empresa, gerencia times e dados da org), `supervisor` (gestor de equipes), e `member` (operador).
  - **Painel de Super Admin**: Interface de administração dedicada para cadastrar empresas, ativar/inativar organizações reativamente, validar planos (`free`, `starter`, `pro`, `enterprise`, `custom`), configurar limites de usuários/equipes e realizar exclusões em lote.
  - **Ferramentas de Migração SaaS**: Script visual executável pelo Super Admin para portar com segurança dados legados de bancos antigos para a organização padrão 'rnv-gestao'.
  - **Validação de Limites de Plano**: Controle rígido de usuários (`maxUsers`) e equipes (`maxTeams`) configurados pelo plano da organização ativa, impedindo adições que excedam os limites.
- 🛡️ **Conformidade LGPD & Privacidade (Fase 1 & 2)**:
  - **Mascaramento de CPF**: Proteção de dados pessoais sensíveis com CPF mascarado por padrão em toda a aplicação (tabela, modais e histórico) no formato `***.***.*89-01`.
  - **Controle de Revelação**: Botão para revelar temporariamente (10s) o CPF completo com ícone de olho (👁️), reduzindo a exposição desnecessária de dados.
  - **Clipboard Seguro**: Exigência de confirmação do operador para copiar CPFs completos para a área de transferência.
  - **Exportação CSV Segura**: Relatórios exportados com CPFs mascarados por padrão. Opção de exportação de CPFs completos condicionada a aceite de termos de responsabilidade e log de auditoria.
  - **Termos de Uso e Política de Privacidade**: Exibição obrigatória de modal com termos de uso e aceite registrado no primeiro login do usuário.
  - **Direito ao Esquecimento (Art. 18)**: Funcionalidade para supervisores anonimizarem permanentemente dados de clientes (nome, CPF, telefone), mantendo apenas registros financeiros para fins estatísticos.
  - **Tokens de Convite Seguros**: Geração de tokens de convite para equipes criptograficamente seguros, com expiração automática de 48 horas e invalidação por uso único (geração dinâmica de novo token após a entrada).
  - **Rastreabilidade e Logs de Auditoria**: Registro automático em banco de dados (`audit_logs`) das ações críticas de privacidade (aceite de termos, cópia e revelação de CPF, exportação completa e anonimização).
- 📺 **Modo TV (Apresentação)**: Interface otimizada e em tela cheia para exibição de métricas em tempo real.
- 🎯 **Gestão de Metas & Performance**: Acompanhamento de produtividade financeira e progresso em relação à meta mensal.
- 🔍 **Conferência Diária**: Sistema de marcação de acordos conferidos para evitar retrabalho operational.
- 📊 **Dashboards Dinâmicos**: Visões personalizadas para operadores e supervisores com filtros avançados.
- 📅 **Histórico Mensal**: Seletor para visualizar dados de meses anteriores com reset automático mensal.
- 🧮 **Conciliação de Resultados, Efetividade & Histórico**: Ferramenta completa para alinhar o Dashboard com os dados oficiais do Microsoft Teams/Salesforce. Permite a conciliação do saldo com normalização automática, exclusão individual de ajustes através do histórico técnico do mês, **Conciliação da Taxa de Efetividade (%)** (exibindo a taxa do Tracker, o input oficial e a diferença reativa em pontos percentuais diretamente no card de Efetividade em uma elegante tag glassmorphic) e controle granular absoluto de exclusão (com botões dedicados para apagar isoladamente o saldo conciliado ou a efetividade oficial, além de inicialização inteligente com o saldo do tracker para evitar duplicações).
- 🎨 **Temas Dinâmicos Premium**: Personalização de interface com temas (Dark, Sky, Purple) utilizando glassmorphism e cores otimizadas para contraste. **O tema padrão de fallback foi definido para o Modo Dark** para operadores, gerentes e supervisores.
- 📈 **Meta Diária Dinâmica**: Cálculo automático de meta diária recalibrado diariamente com base no valor já recuperado e nos dias úteis restantes.
- ✅ **Lógica de Conferência Inteligente**: Acordos conferidos após a data de vencimento são automaticamente marcados como **Quebrados**, garantindo a integridade dos dados e foco nos pendentes.
- ✨ **Melhorias de UX**: Fechamento automático de modais e transições suaves entre visões de dashboard.
- 📤 **Melhorias de Produto & Integrações (Fase 5)**:
  - **Importação de Acordos em Lote**: Upload de planilha CSV com parser automático inteligente de colunas, compatibilidade com formatos brasileiros e salvamento otimizado em batches no Firestore associados ao time/organização.
  - **Webhooks de Integração**: Disparo automático de payloads JSON (com CPFs mascarados para conformidade com a LGPD) em eventos de criação (`agreement.created`) e liquidação (`agreement.paid`) configuráveis por Managers.
- **Relatórios PDF Premium (Fase 9)**: Layout executivo de impressão dedicado (`print-only`). Ao exportar o relatório (ou Ctrl+P), o sistema oculta a interface interativa e renderiza um documento administrativo A4 formal em fundo branco, com cabeçalho corporativo, dados de CNPJ, tabelas organizadas de KPIs, ranking dinâmico de equipes/operadores, demonstrativo analítico de acordos e bloco para parecer técnico/assinatura.
- ⚙️ **Refatoração & Testes Avançados (Fase 6)**:
  - **useDashboardStats Hook**: Migração de toda a lógica e fórmulas de agregação financeira e métricas matemáticas para um hook customizado React robusto e testável.
  - **Testes Automatizados**: Scaffold configurado para testes unitários com Vitest (`npm run test`) e testes de ponta a ponta com Playwright (`npm run test:e2e`).
  - **Firebase Env-Vars Initialization**: Inicialização flexível baseada em variáveis de ambiente com fallback dinâmico para a configuração local JSON.
- 🧪 **Restrições de Cargos & Ambiente Sandbox (Fase 8)**:
  - **Restrições de Gerente (`manager`)**: Proteção contra edições e conciliações individuais de acordos (ocultação de botões de escrita), exibindo apenas tags visuais de status. Permissão para visualização macro em cascata de equipes e importação em lote de CSV preservadas.
  - **Ambiente de Testes Sandbox**: Recurso exclusivo para o Super Admin simular em tempo real os papéis de Gerente, Supervisor ou Operador dentro da organização isolada de testes `sandbox-test`, provisionando automaticamente dados fictícios de equipes, usuários e acordos no Firestore.
- 🔗 **Convites Estruturados por Código & Autonomia de Times (Fase 10)**:
  - **Convites por Prefixo**: Fluxo de convites estruturados utilizando os prefixos distintos `MGR-` (Gerente) e `SUP-` (Supervisor) inseridos de forma transparente no mesmo campo de convite no onboarding.
  - **Onboarding Interativo do Supervisor**: O supervisor insere o token `SUP-` e visualiza reativamente a listagem de todas as equipes cadastradas na empresa, escolhendo interativamente quais equipes gerenciar.
  - **Diário de Convites de Equipes**: Exibição dos tokens de convite de operador (`inviteToken`) para cada time e botões para geração de novos convites diretamente na aba de equipes no perfil do gestor.
  - **Criação de Times Autônoma**: Gerentes e Supervisores têm autonomia para criar e excluir times no perfil (respeitando os limites do plano) sem alterar sua role no Firestore.
- 👥 **Gestão de Colaboradores & Diário de Ocorrências Privado (Fase 11)**:
  - **Alternador de Visão no Dashboard**: Botão exclusivo para gestores (Gerentes e Supervisores) alternarem a tela principal entre "Desempenho Financeiro" e "Gestão da Equipe".
  - **Quadro de Ocorrências**: Listagem de todos os operadores da equipe (ou de toda a empresa se Gerente) com sua respectiva performance simplificada (total de acordos e total recuperado) no mês ativo.
  - **Apontamentos Rápidos e Presença Diária**: Seletores rápidos para registrar o status diário de presença do colaborador (🟢 Presente, 🟡 Atrasado, 🔴 Falta) e campo de texto de envio rápido de notas privadas (ex: feedback, atestados, incidentes).
  - **Histórico Privado de Agente**: Gaveta ou modal com a timeline cronológica de todas as notas comportamentais do operador (visível apenas por gestores).
  - **Relatório Executivo Consolidado**: Modal executivo reunindo o balanço mensal de faltas/atrasos e o feed de todas as notas do período de todos os agentes da empresa para emissão de relatório PDF ou impressão formal A4.
- ⚙️ **Refatoração Arquitetural & Excelência de Engenharia (Fase 12)**:
  - **Decomposição do Dashboard.tsx**: Redução de mais de 1000 linhas de código do componente principal e separação de subcomponentes especializados (`DashboardHeader`, `StatsGrid`, `AdvancedInsights`, `AgreementsTable`, `TeamManagementTab`), melhorando radicalmente a legibilidade, testes e trabalho em equipe.
  - **Custom Hooks do Firestore**: Criação dos hooks `useAgreements` e `useTeamMembers` que gerenciam de forma isolada os acessos ao Firebase.
  - **Economia de Leituras do Firestore**: Adoção de paginação nativa no banco (Firestore cursors) e limites reativos na tabela de acordos do dashboard, diminuindo custos operacionais de banco de dados em mais de 70%.
  - **Roteamento Real Declarativo**: Implantação de roteamento robusto utilizando `react-router-dom` em `App.tsx` para as rotas `/`, `/login`, `/onboarding`, `/profile`, `/create-team` em substituição ao controle de abas client-side.
  - **Enxugamento de Bundle**: Remoção de pacotes desnecessários de backend legados (`express` e `@types/express`) do package.json.

## 📂 Estrutura do Projeto

- `src/components/auth`: Lógica e interface de login/cadastro e onboarding.
- `src/components/dashboard`: Subcomponentes modulares do painel principal (Header, Tabela, Grid, Insights).
- `src/components/modals`: Modais de cadastro de acordos, metas, histórico de CPFs e conciliação.
- `src/hooks`: Custom hooks de integração com Firebase e agregação estatística (`useAgreements`, `useTeamMembers`, `useDashboardStats`).
- `src/utils`: Funções utilitárias de formatação, máscaras e cálculos.

## 🛠️ Como Executar Localmente

**Pré-requisitos:** Node.js

1. Instale as dependências:
   `npm install`
2. Configure as variáveis de ambiente no arquivo `.env.local`.
3. Inicie o servidor de desenvolvimento:
   `npm run dev`

## 🛡️ CI/CD

O projeto conta com GitHub Actions que valida automaticamente:
- Verificação de tipos TypeScript (`tsc`).
- Sucesso do Build de produção.

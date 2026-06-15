

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
- 🎨 **Temas Dinâmicos Premium**: Personalização de interface com temas (Dark, Sky, Purple) utilizando glassmorphism e cores otimizadas para contraste.
- 📈 **Meta Diária Dinâmica**: Cálculo automático de meta diária recalibrado diariamente com base no valor já recuperado e nos dias úteis restantes.
- ✅ **Lógica de Conferência Inteligente**: Acordos conferidos após a data de vencimento são automaticamente marcados como **Quebrados**, garantindo a integridade dos dados e foco nos pendentes.
- ✨ **Melhorias de UX**: Fechamento automático de modais e transições suaves entre visões de dashboard.
- 📤 **Melhorias de Produto & Integrações (Fase 5)**:
  - **Importação de Acordos em Lote**: Upload de planilha CSV com parser automático inteligente de colunas, compatibilidade com formatos brasileiros e salvamento otimizado em batches no Firestore associados ao time/organização.
  - **Webhooks de Integração**: Disparo automático de payloads JSON (com CPFs mascarados para conformidade com a LGPD) em eventos de criação (`agreement.created`) e liquidação (`agreement.paid`) configuráveis por Managers.
  - **Relatórios PDF Premium**: Estilos de impressão CSS dedicados (`@media print` nativos) para exportar relatórios executivos estruturados em papel A4 com branding e dados organizacionais, omitindo botões de ação e campos de busca.
- ⚙️ **Refatoração & Testes Avançados (Fase 6)**:
  - **useDashboardStats Hook**: Migração de toda a lógica e fórmulas de agregação financeira e métricas matemáticas para um hook customizado React robusto e testável.
  - **Testes Automatizados**: Scaffold configurado para testes unitários com Vitest (`npm run test`) e testes de ponta a ponta com Playwright (`npm run test:e2e`).
  - **Firebase Env-Vars Initialization**: Inicialização flexível baseada em variáveis de ambiente com fallback dinâmico para a configuração local JSON.

## 📂 Estrutura do Projeto

- `src/components/auth`: Lógica e interface de login/cadastro.
- `src/components/dashboard`: Componentes do painel principal e gráficos.
- `src/components/modals`: Modais de cadastro, metas e histórico.
- `src/utils`: Funções utilitárias e máscaras.

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


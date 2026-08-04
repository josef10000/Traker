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
* **📊 Inteligência & Insights Avançados**: Gráficos analíticos de produtividade por turnos, funil de atingimento, projeções matemáticas de fim de mês, distribuição horária do time e **Filtros de Data Granulados para Cards e Gráficos** (Diário, Semanal, Mensal, Anual e Período Específico) disponíveis para todos os papéis. Tabelas operacionais e visão de equipes mantêm sempre a perspectiva mensal geral.
* **🗓️ Seletores de Mês e Ano 100% Customizados**: Dropdowns com identidade visual completa do sistema (Dark/Light Mode, Glassmorphism), sem qualquer elemento nativo do navegador — grid 3×4 de meses e scroll de anos 2020–2030 com entrada manual de ano customizado. Atualização reativa instantânea ao clicar.
* **⚡ Modo Comparação de Dados (Benchmarking Temporal)**: Funcionalidade de benchmarking que compara o período selecionado contra o **Período Anterior Imediato** (ontem, semana passada, mês anterior, ano anterior) ou o **Mesmo Período do Ano Passado (YoY)**. Badges de variação `▲+14.8%` / `▼-5.2%` aparecem nos cards indicadores com lógica de cor inteligente (verde=melhora, vermelho=piora), incluindo inversão para métricas negativas (ex: Valores Vencidos).
* **⚡ Ambiente Demo (Sandbox) Ultra-Performático**: Modo demonstração isolado em memória com loteamento por microtasks no sistema de eventos, garantindo transições de tela instantâneas sem travamentos no navegador.
* **👥 Gestão de Colaboradores & Clima comportamental**: Apontamento e monitoramento de presença diária automática (estado natural sem persistência no banco, gerado automaticamente para o dia corrente após as 10h da manhã), novos status operacionais (Saída Antecipada, Day Off, Férias), agendamento de eventos/avisos gerais pela coordenação, controle de notas comportamentais privadas com histórico consolidado e relatórios executivos para RH/Supervisão. Cada colaborador possui sua aba de "Minha Escala" no perfil pessoal.
* **📄 Relatórios PDF Corporativos Premium**: Sistema com CSS de impressão otimizado que transforma o painel operacional em um relatório executivo minimalista de alto contraste pronto para reuniões com CNPJ, rankings de operadores e parecer técnico.
* **🎨 Tema Corporativo Pastel & Design System Enterprise**: Interface minimalista e elegante inspirada no padrão corporativo B2B (estilo Linear/Salesforce). Substituição das cores neon saturadas e do fundo azul cyberpunk por uma paleta pastel refinada (`#0d1117` no escuro e `#f8fafc` no claro), com bordas finas neutras, botões desaturados e tabelas despoluídas com ganho de espaço vertical.
* **🔒 Fila Cega de Recuperação & Governança LGPD**: Mascaramento dinâmico de CPF (`***.456.789-**`) e valor (`R$ ***,**`) para operadores com CSS `select-none`. A sub-aba **Carteira Ativa** e os botões **Assumir Cliente / Lote** são exclusivos para Operadores (`role === 'member'`), pois cargos de gestão/supervisão não realizam atendimento direto (supervisores utilizam atribuição direta para sua equipe).
* **⚙️ Central de Configurações Universal & Governança de Canais**: Modal corporativo de configurações (`SettingsModal.tsx`) integrado ao cabeçalho. Para a Liderança (Supervisores, Gerentes, Coordenadores e Super Admins), libera o cadastro e gerenciamento de canais de atendimento (`VOZ`, `CHAT`, `WEBPHONE`, `OKTOR`, `SALESFORCE`, `WHATSAPP`, `QUITE DIGITAL`, etc.) e do catálogo de motivos de tabulação da empresa. Operadores, QA e Backoffice utilizam o modal para conciliação e preferências pessoais.
* **📊 BI & Analytics Estratégico em 5 Sub-Abas & Rastreamento de Descontos**: O painel analítico (`BiAnalyticsTab.tsx`) conta com sub-navegação em 5 visões especializadas: `📊 1. Visão Geral & Heatmaps`, `⚡ 2. Matriz por Canais de Contato`, `🛡️ 3. Quadrante QA vs. Performance (ROI de QA)`, `🔮 4. Maturação & Alerta Preditivo` e `🏷️ 5. Análise de Descontos`. Permite sinalizar a concessão de descontos no momento do registro do acordo com inferência automática de motivo (*Parcelamento*, *Parcelas Atrasadas*, *Parcela*, *Quitação*), fornecendo indicadores de taxa de concessão, efetividade de pagamento (com vs sem desconto), taxa de inadimplência/quebra e volume financeiro R$ recuperado.
* **🎨 Modais de Confirmação Customizados**: Substituição completa dos diálogos nativos do navegador (`window.confirm` / `window.alert`) pelo novo `CustomConfirmModal.tsx`, com suporte a Dark Mode, animações suaves e ícones Phosphor.
* **🏆 Módulo Unificado de Campanhas Multi-Métricas & PDIs**: Configurador avançado para sprints da operação ou metas individuais (PDIs) com suporte a **múltiplas metas simultâneas** (*R$ Recuperado*, *Qtd de Acordos*, *Acordos Pagos*, *Taxa de Efetividade %*, *Ticket Médio R$*) e **Regras de Conclusão Dinâmicas** (*Todas Exigidas*, *Qualquer Uma* ou *Média Ponderada*). Conta com exibição condicional temporizada no dashboard do operador (`startDate` $\le \text{hoje} \le$ `endDate`), cálculo isolado de métricas e comemoração automática com animações (`Celebration.tsx`).
* **🔒 Governança de Criação de Acordos**: Apenas Operadores e Supervisores (`role === 'member'` ou `role === 'supervisor'`) possuem autonomia para criar novos acordos. Demais cargos (Gerentes, Coordenadores e QA) possuem acesso analítico e relatórios.
* **🌓 Alternador de Temas Escuro & Claro Sólido**: Design corporativo limpo baseado em tokens dinâmicos para alternância suave de temas em todos os perfis.
* **⚙️ Personalização Dinâmica de Indicadores & Pesos por Perfil**: Modal dedicado (`IndicatorConfigModal.tsx`) para gerenciar livremente a quantidade (2 a 10+ indicadores), adicionar novas métricas customizadas, renomear rótulos e reajustar os pesos percentuais de cada Perfil Recomendado (Equilibrado 360°, Foco Faturamento, Foco QA, Foco Assiduidade) com botão de auto-normalização a 100% (Algoritmo Hamilton).
* **🎯 Cockpit de Metas por Equipes & Filtro de Período Efetivo**: O Cockpit de Metas & Projeções conta com um seletor dinâmico de equipes (`🏢 Todas as Equipes` vs `👥 Equipe Específica`), recalculando metas consolidadas, entregues R$, atingimento % e tabelas. O filtro de período (Hoje, Ontem, Semana, Mês, Personalizado) é 100% efetivo com comparações de datas locais imunes a distorções de fuso horário.
* **⏱️ Aba Jornada & Cockpit de Atividade Hora a Hora (Banco de Pausas 72m)**: Nova aba dedicada na Sidebar para supervisão e gestão. Monitora reativamente a produção hora a hora (08h às 19h) compilando passivamente acordos, atendimentos e consultas no sistema. Oferece tolerância inteligente por **Banco Geral de Pausas Cumulativas de 72 minutos por dia** (com fracionamento livre), **Timeline Interativa em Drawer (Raio-X por Operador)**, **Gráfico de Liquidez & Eficiência por Hora**, **Badge de Destaque de Consistência do Dia**, e **Alternador de Exibição na Matriz** entre o *Modo Detalhado (Nº de Ações)* e o *Modo Simplificado / Presença (Indicadores Visuais 🟢 Ativo / 🟡 Pausa Banco / 🔴 Pausa Excedida)*.
* **📌 Sidebar Lateral Retrátil em 5 Módulos Master**: Menu de navegação retrátil à esquerda organizado por domínios (1. Acordos & Operação, 2. Tabulação & Atendimento, 3. BI, Metas & Performance, 4. Gestão de Pessoas & Operação, 5. Qualidade & Governança), otimizando a navegação e reduzindo o consumo de espaço vertical. Integração de drawer deslizante com Central de Ajuda reativa contendo dicionário de KPIs.

---

## 🛠️ Funcionalidades por Nível de Acesso (Hierarquia de Cargos)

A plataforma conta com 5 níveis de controle de permissões dinâmicos (Roles):

1. **👑 Super Admin (Dono da Infraestrutura)**:
   - Gerenciamento reativo de todas as organizações e controle de planos (`free`, `starter`, `pro`, `enterprise`, `custom`).
   - Simulação de cargos em ambiente de Testes Sandbox com provisionamento automático de dados de demonstração.
   - Ferramenta de exclusão em lote (chunking reativo de 400 em 400 documentos no Firestore para evitar limites do SDK).
 2. **🧭 Coordenador (Coordinator - Gestor Geral da Operação)**:
   - Painel comparativo de performance consolidada de todas as equipes (Metas vs Recuperado) com drill-down detalhado por time, re-cálculo de metas individuais proporcionais, busca de colaboradores e paginação (5 por página).
   - Filtro de árvore em 3 níveis (Gerente -> Supervisor -> Equipe) para controle de performance.
   - Escala consolidada de presença interativa de todos os operadores da operação através de uma matriz horizontal mensal com cores e tooltips para novos status (Presença Automática, Atrasado, Falta, Saída Antecipada, Day Off e Férias).
   - Agendamento de eventos e avisos gerais no calendário (Ex: Presencial, Treinamento).
   - Central de Transferências para movimentar operadores entre equipes em tempo real.
   - Acesso a desligamentos (offboarding) de operadores e supervisores.
 3. **👔 Gerente (Manager - Gestor da Organização)**:
   - Visualização macro de todas as equipes da empresa e do ranking consolidado de performance, com busca de colaboradores e paginação na gestão de equipes.
   - Autonomia para criar e remover equipes dentro dos limites estabelecidos pelo plano.
   - Acesso exclusivo a relatórios corporativos consolidados de operadores.
   - Configurações avançadas e segurança administrativa (bloqueio automático de conciliações e alterações individuais de acordos).
 4. **👥 Supervisor (Gestor de Equipe)**:
   - Acompanhamento de metas do seu time e conciliação de saldo (Tracker vs Salesforce/Teams).
   - Gestão de presença diária de agentes, adição de notas privadas e visualização de históricos comportamentais da equipe.
   - Criação, edição e exclusão de acordos da sua equipe.
 5. **🎯 Monitor de Qualidade (Monitor - Auditoria de QA & PDI)**:
   - Avaliação e auditoria de operadores com base em competências editáveis da empresa.
   - Acesso exclusivo a painéis analíticos de radar de competências.
   - Autonomia para criar, monitorar e concluir PDIs focados para desenvolvimento comportamental.
 6. **👤 Operador (Colaborador que Atende)**:
   - Registro e consulta de acordos individuais e visualização da meta diária pessoal.
   - Modo de conferência rápida (Checklist / Botão "Verificar") para focar na checagem de CPFs de clientes pendentes de pagamento.
  7. **📊 Back Office (Tratador / Auditor de Planilhas)**:
    - Acesso exclusivo a painéis de tratamento de planilhas locais para processar e higienizar dados de clientes.
    - **Higienização de Dados & Diagnóstico de CPFs**: Botão para remover CPFs duplicados da carga em 1 clique mantendo o primeiro registro, detector e filtro de CPFs inválidos/incompletos e filtro por clientes com anotações/prints.
    - **Ações em Massa (Bulk Actions)**: Seleção flexível por checkboxes customizados (14px), highlight de linha selecionada, atalhos de lotes (+10, +50, +100, Todos) e barra flutuante para atualização atômica em lote de status.
    - **Cards de Métricas da Carga**: Percentual de progresso em tempo real, barra visual de progresso e contagem total de anexos/notas.
    - **Interface Enxuta e Focada**: Sem exposição de valores financeiros, relatórios de vendas ou telas de configurações.

---

## 🌙 Design System & Modo Escuro Único (Dark Mode Only)
- O sistema é padronizado exclusivamente em **Modo Escuro (Dark Mode)** de alto desempenho com estética Glassmorphism, removendo seleções e botões de alternância para garantir máxima consistência visual em todas as telas e cargos.

## 🔗 Isolamento Rígido de Links de Demonstração por Cargo
- Links específicos enviados para testes de cargos (ex: `/demo?role=backoffice`, `/demo?role=member`) mantêm o isolamento estrito.
- Ao clicar em **"Encerrar Demonstração"**, o sistema retorna exclusivamente para a página de início contendo apenas o card do cargo correspondente ao link recebido, sem expor os outros cargos.

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
   - **Escopo Contextual por Papel & Filtros Dinâmicos**: Transparência total no painel de BI. Operadores visualizam exclusivamente o escopo de seus resultados individuais, Supervisores acompanham a performance das suas equipes (com filtro por time e operador específico), e Coordenadores/Gerentes/Super Admins possuem visão global executiva. O painel inclui um banner explicativo em destaque (`📍 Escopo de Análise`) indicando o papel e filtro ativo.
   - **🔮 Forecast & Tendências Preditivas Estatísticas (Sub-aba 6)**: Módulo de projeções para o mês N+1 baseado em Run Rate ponderado e curva de sazonalidade de pagamentos. Inclui desmembramento por modalidade de acordo (Quitação, Parcelamento, Parcela Atrasada), taxa de efetividade de atendimentos por operador na visão, colchão agendado em camada secundária, curva de liquidez dos 31 dias e janelas nobres de horário (0h-23h).
   - **Análise de Políticas de Desconto (Sub-aba 5)**: Rastreamento automático e inferência de motivo de descontos concedidos em acordos (Parcelamento, Parcelas Atrasadas, Desconto na Parcela, Quitação), comparando a taxa de efetividade e quebra com vs sem desconto.
   - **Colchão MRR (Receita Recorrente Mensal)**: Projeção de recebíveis parcelados futuros e previsibilidade de caixa.
   - **Curva de Dilação vs Quebra**: Gráfico de dispersão indicando o percentual de atraso nas promessas e taxa de inadimplência.
   - **Matriz de Risco**: Classificação de CPFs em categorias de risco de quebra com base no histórico comportamental.
   - **Calendário de Calor Macro de 31 dias**: Visão macro-sazonal exibindo os dias de maior arrecadação e probabilidade de pagamento.

6. **📞 Suporte, Central de Chamados & Cancelamento Bilateral (Fase 6 - HubCRM)**:
   - **Integração Automática Bilateral**: Fluxo de webhook em `/api/crm-webhook` que recebe e sincroniza de forma atômica os tokens do HubCRM (`crmOrgId`, `crmClientId`, `crmPublicToken`) ao vincular o SaaS de Cobrança ao card do cliente no CRM.
   - **Central de Ajuda**: Aba exclusiva de suporte com formulários de chamados técnicos e comerciais segmentados por categoria e prioridade.
   - **Travamento de Conversas**: Chat de réplicas interativo integrado diretamente à API do CRM que é travado permanentemente quando o chamado assume o status `concluido` (Resolvido).
   - **Permissões Administrativas**: O acesso à central de ajuda e à abertura de chamados é permitido apenas a Gerentes e Supervisores (Operadores e Monitores não visualizam a opção).
   - **Cancelamento de Assinatura Automático**: Gerentes podem cancelar a assinatura diretamente pela central do SaaS. O sistema faz a chamada correspondente ao HubCRM, obtém a data limite de acesso e configura o bloqueio de acesso 100% automatizado da organização para o dia seguinte da expiração.

7. **📊 Tratamento & Mapeamento de Planilhas (Back Office)**:
   - **Upload Local via SheetJS**: Carrega e processa planilhas dinâmicas (.xlsx, .xls, .csv) diretamente no navegador, economizando tráfego de dados e sem peso de storage físico.
   - **Mapeador Inteligente de Colunas**: Associa campos do sistema (Nome, CPF, Valor, Vencimento) aos cabeçalhos e guarda quaisquer colunas remanescentes na propriedade `customFields` para tags dinâmicas.
   - **Gaveta Lateral de Notas**: Histórico completo de anotações sobre cada cliente tratador com assinatura e data.
   - **Exportação Consolidada**: Download da planilha atualizada com status (Pendente, Tratado, Ignorado) e as notas comportamentais agregadas.

8. **🧪 Sandbox Volátil com Seletor de Hierarquia (Simulação Completa)**:
   - **Simulação da Árvore Organizacional**: Permite que o Super Admin simule instantaneamente qualquer um dos cargos e usuários de uma hierarquia corporativa complexa e fictícia (composta por 2 gerentes, 3 supervisores subordinados, 6 equipes e 15 operadores).
   - **Controle Visual Dinâmico**: Barra de controle flutuante superior no Dashboard com dropdown para trocar de visão no mesmo instante. Os layouts e painéis operacionais reagem de forma responsiva para refletir a permissão e o escopo de atuação do usuário simulado.
   - **Isolamento de KPIs (Filtro Dinâmico)**: Os cards de métricas e KPIs reagem dinamicamente à seleção de equipe ou de um supervisor específico. Ao focar em um time ou supervisor, as estatísticas consolidam apenas os dados daquele escopo selecionado, mantendo a fidelidade operacional mesmo sob dados simulados em memória.
   - **Painel de Reatribuição de Times**: Permite testar a reatribuição de operadores entre times (visão do supervisor) e a troca de equipes supervisionadas por cada supervisor (visão do gerente) em tempo real por meio de uma seção interativa no perfil do usuário, sem salvar no banco de dados.
   - **Volatilidade Total de Dados (Sandbox Híbrido)**: Todas as edições do Sandbox (adicionar acordo, conciliar saldo, mudar metas, registrar QA ou lançar notas comportamentais) utilizam o `SandboxService` local para salvar as alterações apenas em memória de sessão temporária, protegendo o banco Firestore de quaisquer escritas de teste.
   - **Mecanismo de Auto-Descarte**: O estado da simulação é 100% resetado para os dados originais de fábrica sempre que o usuário muda de perfil ou clica em encerrar a simulação, prevenindo qualquer retenção de rascunhos de testes.

 9. **👥 Papel de Coordenador & Controle de Frequência Rigoroso**:
    - **Cargo de Coordenador (`coordinator`)**: Cargo operacional estratégico posicionado entre a Gerência e a Supervisão. O coordenador possui visão macro completa (visualiza todas as equipes, supervisores e BI analítico), porém sem acesso a modificações de webhooks, metas corporativas oficiais ou exclusões de banco.
    - **Regra de Presença Automática**: Por padrão, no início de cada período/dia, todos os operadores têm a presença marcada automaticamente como **Presente** (`present`).
    - **Restrição de Marcação**: Apenas os papéis com permissão gestora (**Coordenador**, **Gerente** e **Supervisor**) visualizam as opções de marcar falta (`absent`) ou atraso (`late`) para os membros de seus respectivos times. Outros perfis operacionais ou externos visualizam apenas o estado estático de frequência, sem botões de alteração.

 10. **💰 Fechamento de Prestação de Contas PJ & Notificações Centrais (Aba de Coordenação Unificada)**:
    - **Aba de Coordenação Centralizada**: Reuniu de forma integrada as abas de *Performance de Equipes*, *Frequência Consolidada*, *Fechamento PJ*, *Equipes & Membros*, *Organograma Hierárquico* e *Convites PJ* sob um menu de sub-abas dinâmico e responsivo na interface principal.
    - **Cálculo Proporcional de Mensalidade**: Desconto diário proporcional de faltas não abonadas no mês selecionado.
    - **Liberação & Aprovação Automática de Notas**: Caso o colaborador (Operador, Back Office, Supervisor ou Monitor/QA) tenha presença integral no mês (nenhuma falta não abonada ou pendente), a nota PJ é liberada e pré-aprovada automaticamente no primeiro dia do vencimento para aceite do agente, eliminando a dependência de liberação manual da coordenação.
    - **Abono de Faltas Individual**: O Coordenador pode visualizar as faltas do colaborador no período e abonar faltas justificadas individualmente antes de liberar o fechamento.
    - **Configuração de Data de Corte**: Habilidade de definir o dia do fechamento (de 1 a 28) por organização, fazendo com que faltas registradas após essa data acumulem para o fechamento do mês seguinte.
    - **Sino de Notificações Unificado**: Centraliza avisos de solicitações de transferência, emissões de nota e contestações em tempo real para gerentes/coordenadores e pagamentos liberados para operadores.

---

## 🚀 Arquitetura Técnica & Performance

* **Paginação Nativa no Banco (Firestore Cursors)**: A listagem de acordos adota paginação real em banco utilizando cursores de documentos (`limit`, `startAfter`), reduzindo em mais de **70% o custo operacional** de leitura e tráfego na API do Firebase.
* **Otimização de Leituras e Custos de Banco (Cache Gate & Local Cache)**: Para operações em grande escala (~60 operadores simultâneos), o sistema implementa um mecanismo de **Cache Gate** híbrido client-side/server-side. A leitura de estatísticas e KPIs mensais é validada contra um "portão de frescor" centralizado no Firestore (1 única leitura ao carregar). Se não houver novos registros (nenhuma mutação no banco), os dados brutos são extraídos do cache persistente local (IndexedDB) sem custos de leitura no Firestore Server. Modificações de dados marcam o portão de frescor como "stale" de forma assíncrona, forçando a recomputação e atualização do cache local na próxima carga. Isso reduz as leituras diárias em mais de **95%**, permitindo a operação de dezenas de agentes com o plano gratuito (Spark) do Firebase.
* **Roteamento Declarativo Seguro**: Gerenciamento de rotas e segurança de visualização de telas via URL real com `react-router-dom`, isolando o onboarding, login, configurações e visualizações operacionais.
* **Outbound Webhooks Seguros**: Disparo de requisições POST HTTPS no modelo de integração silenciosa (`no-cors`) para sincronização em tempo real de novos acordos ou acordos efetivados. CPFs são automaticamente higienizados no payload do webhook.
* **Modularidade e Componentização**: Lógica matemática e de comunicação externa encapsulada em hooks customizados React (`useAgreements`, `useTeamMembers`, `useDashboardStats`) e componentes com visual premium. Modais complexos foram extraídos e isolados no componente unificado `DashboardModals.tsx` para reduzir o acoplamento do painel principal (`Dashboard.tsx`). Adicionalmente, as lógicas de negócio e BI foram extraídas para camadas puras de serviço (`metrics.ts` e `qaService.ts`), cobertas por testes unitários exaustivos (Vitest), e os componentes do painel de qualidade (`QaDashboard.tsx`) foram decompostos em subcomponentes isolados (`QaOverview.tsx`, `QaEvaluationsList.tsx`, `PdiManager.tsx`, `CompetenceManager.tsx`, `QaModals.tsx`) para alta coesão e legibilidade.

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
   git clone https://github.com/josef10000/Traker.git
   cd Traker
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

## 🔐 Segurança do Chat Interno (Firestore Rules)

O chat interno (`internal_messages`) conta com **regras de segurança Firestore em 4 camadas**:

1. **Isolamento por Organização**: Mensagens são isoladas por `organizationId` — nenhuma organização acessa dados de outra.
2. **Restrição a Participantes**: Apenas o remetente (`senderId`) ou o destinatário (`receiverId`) pode ler cada mensagem individual.
3. **Validação de Criação**: O campo `senderId` é obrigatoriamente `request.auth.uid` (impede falsificação de identidade), com validação de campos obrigatórios e limite de 4.000 caracteres.
4. **Controle de Atualização**: O remetente pode editar o texto; o destinatário pode **apenas** marcar como lido (`read: true`) sem alterar nenhum outro campo. Exclusão física restrita a Super Admins.

Coleções preparatórias com segurança pré-configurada:
- `chat_channels`: Canais de equipe com leitura restrita a membros e criação por supervisores+.
- `chat_typing`: Documentos efêmeros para indicadores de digitação.

---

## 🛡️ Pipelines & CI/CD

O projeto conta com automação via GitHub Actions para assegurar a saúde do produto antes de cada deploy:
- **TypeScript Checking**: Validação estática de tipos (`tsc --noEmit`).
- **Production Build Testing**: Garante que o bundler do Vite compile o código para produção com 100% de sucesso.
- **SonarCloud Integration**: Análise estática contínua de segurança (Security Rating A), bugs e vulnerabilidades integrada via Análise Automática do SonarCloud (Organização `josef10000`, Projeto `josef10000_Traker`).
- **Auditoria LGPD**: Validação estática de chaves e vazamentos de chaves privadas.

---

## 🔧 Integração com Google Stitch & IA Agent Skills

O ambiente está configurado com a biblioteca de Agent Skills do **Google Stitch** (`google-labs-code/stitch-skills`). As skills foram instaladas globalmente no ambiente do usuário, permitindo o uso integrado com agentes de codificação como o Antigravity.

As seguintes habilidades do Stitch estão disponíveis:
* **`stitch::react-components`**: Conversão de designs do Stitch em componentes modulares Vite + React.
* **`stitch::code-to-design`**: Migração e upload de código React/Vite existente de volta para designs do Stitch.
* **`stitch::extract-design-md`**: Engenharia reversa para extração de sistemas de design (`DESIGN.md`) diretamente do código fonte.
* **`stitch::extract-static-html`**: Extração de HTML estático auto-contido a partir do app.
* **`stitch::generate-design`**: Geração e edição de telas via prompts de linguagem natural usando a API do Stitch.
* **`stitch::manage-design-system`**: Gerenciamento de design systems do Stitch e seus tokens.
* **`stitch::upload-to-stitch`**: Upload de imagens, mockups e assets locais para o Stitch.
* **`taste-design`**: Geração de diretrizes `DESIGN.md` premium para forçar padrões avançados de UX/UI.

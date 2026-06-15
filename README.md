

# RNV Gestão - Dashboard Operacional

Este é um dashboard avançado para gestão de acordos, desenvolvido com React, Tailwind CSS e Firebase.

## 🚀 Novidades na Versão Atual

- 🛡️ **Conformidade LGPD & Privacidade (Fase 1)**:
  - **Mascaramento de CPF**: Proteção de dados pessoais sensíveis com CPF mascarado por padrão em toda a aplicação (tabela, modais e histórico) no formato `***.***.*89-01`.
  - **Controle de Revelação**: Botão para revelar temporariamente (10s) o CPF completo com ícone de olho (👁️), reduzindo a exposição desnecessária de dados.
  - **Clipboard Seguro**: Exigência de confirmação do operador para copiar CPFs completos para a área de transferência.
  - **Exportação CSV Segura**: Relatórios exportados com CPFs mascarados por padrão. Opção de exportação de CPFs completos condicionada a aceite de termos de responsabilidade e log de auditoria.
  - **Termos de Uso e Política de Privacidade**: Exibição obrigatória de modal com termos de uso e aceite registrado no primeiro login do usuário.
  - **Direito ao Esquecimento (Art. 18)**: Funcionalidade para supervisores anonimizarem permanentemente dados de clientes (nome, CPF, telefone), mantendo apenas registros financeiros para fins estatísticos.
  - **Rastreabilidade e Logs de Auditoria**: Registro automático em banco de dados (`audit_logs`) das ações críticas de privacidade (aceite de termos, cópia e revelação de CPF, exportação completa e anonimização).
- 📺 **Modo TV (Apresentação)**: Interface otimizada e em tela cheia para exibição de métricas em tempo real.
- 🎯 **Gestão de Metas & Performance**: Acompanhamento de produtividade financeira e progresso em relação à meta mensal.
- 🔍 **Conferência Diária**: Sistema de marcação de acordos conferidos para evitar retrabalho operacional.
- 📊 **Dashboards Dinâmicos**: Visões personalizadas para operadores e supervisores com filtros avançados.
- 📅 **Histórico Mensal**: Seletor para visualizar dados de meses anteriores com reset automático mensal.
- 🧮 **Conciliação de Resultados, Efetividade & Histórico**: Ferramenta completa para alinhar o Dashboard com os dados oficiais do Microsoft Teams/Salesforce. Permite a conciliação do saldo com normalização automática, exclusão individual de ajustes através do histórico técnico do mês, **Conciliação da Taxa de Efetividade (%)** (exibindo a taxa do Tracker, o input oficial e a diferença reativa em pontos percentuais diretamente no card de Efetividade em uma elegante tag glassmorphic) e controle granular absoluto de exclusão (com botões dedicados para apagar isoladamente o saldo conciliado ou a efetividade oficial, além de inicialização inteligente com o saldo do tracker para evitar duplicações).
- 🎨 **Temas Dinâmicos Premium**: Personalização de interface com temas (Dark, Sky, Purple) utilizando glassmorphism e cores otimizadas para contraste.
- 📈 **Meta Diária Dinâmica**: Cálculo automático de meta diária recalibrado diariamente com base no valor já recuperado e nos dias úteis restantes.
- ✅ **Lógica de Conferência Inteligente**: Acordos conferidos após a data de vencimento são automaticamente marcados como **Quebrados**, garantindo a integridade dos dados e foco nos pendentes.
- ✨ **Melhorias de UX**: Fechamento automático de modais e transições suaves entre visões de dashboard.

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




# RNV Gestão - Dashboard Operacional

Este é um dashboard avançado para gestão de acordos, desenvolvido com React, Tailwind CSS e Firebase.

## 🚀 Novidades na Versão Atual

- 📺 **Modo TV (Apresentação)**: Interface otimizada e em tela cheia para exibição de métricas em tempo real.
- 🎯 **Gestão de Metas & Performance**: Acompanhamento de produtividade financeira e progresso em relação à meta mensal.
- 🔍 **Conferência Diária**: Sistema de marcação de acordos conferidos para evitar retrabalho operacional.
- 📊 **Dashboards Dinâmicos**: Visões personalizadas para operadores e supervisores com filtros avançados.
- 📅 **Histórico Mensal**: Seletor para visualizar dados de meses anteriores com reset automático mensal.
- 🧮 **Conciliação de Resultados**: Ferramenta para alinhar o Dashboard com os dados oficiais enviados via Microsoft Teams, incluindo normalização de saldo automática.
- 🎨 **Temas Dinâmicos Premium**: Personalização de interface com temas (Dark, Sky, Purple) utilizando glassmorphism e cores otimizadas para contraste.
- 📈 **Meta Diária & Ritmo**: Cálculo automático de meta diária baseado em dias úteis e indicadores visuais de performance (Verde/Vermelho) na visão de equipe.
- ✨ **Melhorias de UX**: Fechamento automático de modais após submissão bem-sucedida para um fluxo de trabalho mais ágil.

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


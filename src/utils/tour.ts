import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import { UserRole } from "../types";

export const startTour = (role: UserRole, onComplete: () => void) => {
  const steps = [];

  // 1. Passo comum de boas-vindas
  steps.push({
    element: '#user-profile-menu',
    popover: {
      title: 'Seu Perfil & Configurações',
      description: 'Aqui você visualiza suas informações de acesso, muda o tema (claro/escuro) e gerencia suas configurações de perfil.',
      side: 'bottom',
      align: 'end'
    }
  });

  // 2. Personalização das etapas dependendo do cargo (Role)
  if (role === 'manager' || role === 'coordinator') {
    // Gestor / Direção
    steps.push(
      {
        element: '#stats-grid',
        popover: {
          title: 'Visão Geral de Faturamento',
          description: 'Acompanhe as métricas de faturamento total, ticket médio e performance agregada de todas as equipes.',
          side: 'bottom'
        }
      },
      {
        element: '#team-performance-module',
        popover: {
          title: 'Módulo de Performance das Equipes',
          description: 'Veja o ranking geral das equipes, produtividade diária e compare os resultados operacionais de forma unificada.',
          side: 'top'
        }
      },
      {
        element: '#performance-chart',
        popover: {
          title: 'Meta Corporativa',
          description: 'Monitore o avanço do faturamento de toda a organização em relação à meta global estabelecida para o mês.',
          side: 'top'
        }
      }
    );
  } else if (role === 'supervisor') {
    // Supervisor de Equipe
    steps.push(
      {
        element: '#team-selector',
        popover: {
          title: 'Seletor de Equipes',
          description: 'Filtre e gerencie os resultados de times específicos que estão sob sua supervisão direta.',
          side: 'bottom'
        }
      },
      {
        element: '#stats-grid',
        popover: {
          title: 'Faturamento da Equipe',
          description: 'Monitore quanto a sua equipe faturou hoje e qual é a projeção acumulada para o fechamento.',
          side: 'bottom'
        }
      },
      {
        element: '#team-performance-module',
        popover: {
          title: 'Produtividade & Ranking do Time',
          description: 'Acompanhe o ranking individual de performance e metas de efetividade de cada operador da sua equipe.',
          side: 'top'
        }
      },
      {
        element: '#performance-chart',
        popover: {
          title: 'Evolução da Meta do Time',
          description: 'Veja de forma visual se sua equipe está no ritmo correto para bater a meta mensal.',
          side: 'top'
        }
      }
    );
  } else if (role === 'monitor') {
    // Monitor / Qualidade (QA)
    steps.push(
      {
        element: '#stats-grid',
        popover: {
          title: 'Métricas para Qualidade',
          description: 'Visualize os números de acordos gerais fechados para direcionar suas escutas e monitorias de qualidade.',
          side: 'bottom'
        }
      },
      {
        element: '#team-performance-module',
        popover: {
          title: 'Efetividade dos Operadores',
          description: 'Acompanhe a lista de operadores para identificar quem precisa de feedbacks, treinamentos ou novos PDIs.',
          side: 'top'
        }
      }
    );
  } else if (role === 'backoffice') {
    // Backoffice / Administrativo
    steps.push(
      {
        element: '#stats-grid',
        popover: {
          title: 'Status de Conciliação',
          description: 'Veja os volumes financeiros do dia para garantir que os pagamentos batem exatamente com o faturado.',
          side: 'bottom'
        }
      }
    );
  } else {
    // Operador / Member normal
    steps.push(
      {
        element: '#stats-grid',
        popover: {
          title: 'Suas Métricas de Hoje',
          description: 'Acompanhe o seu faturamento pessoal do dia, acordos fechados e sua projeção individual de ganhos.',
          side: 'bottom'
        }
      },
      {
        element: '#overdue-card',
        popover: {
          title: 'Seus Acordos Vencidos',
          description: 'Atenção redobrada aqui! Entre em contato imediato com os clientes cujos acordos já venceram.',
          side: 'bottom'
        }
      },
      {
        element: '#performance-chart',
        popover: {
          title: 'Sua Meta Individual',
          description: 'Acompanhe seu avanço em relação à sua meta individual de faturamento estipulada para o mês.',
          side: 'top'
        }
      }
    );
  }

  // 3. Registrar Acordos (etapa comum para operadores e supervisores)
  if (role === 'member' || role === 'supervisor') {
    steps.push({
      element: '#new-agreement-btn',
      popover: {
        title: 'Registrar Novo Acordo',
        description: 'Sempre que fechar uma nova negociação, clique aqui para registrá-la no sistema e computar no seu faturamento.',
        side: 'left'
      }
    });
  }

  const driverObj = driver({
    showProgress: true,
    steps: steps as any,
    overlayColor: 'rgba(2, 6, 23, 0.8)',
    nextBtnText: 'Próximo',
    prevBtnText: 'Anterior',
    doneBtnText: 'Entendi!',
    onDeselected: (element, step, { state }) => {
      if (state.activeIndex === steps.length - 1) {
        onComplete();
      }
    },
    onDestroyed: () => {
      onComplete();
    }
  });

  driverObj.drive();
};

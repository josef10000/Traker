# MindVault - Seu Segundo Cérebro & Sistema Operacional de Vida

**MindVault** é uma plataforma de clareza mental e desenvolvimento pessoal que une o melhor do **Notion** (bancos de dados relacionais, tabelas de livros, fichas de treinos, rastreadores de hábitos e projetos) com o melhor do **Obsidian** (grafo neural de conhecimento, links bidirecionais `[[nota]]`, suporte a Markdown e velocidade).

---

## 🌟 Recursos Principais (Versão Alfa)

1. **Página de Login Interativo com Showcase da Ferramenta**:
   - Apresentação visual e explicativa dos 4 pilares do sistema integrada diretamente na tela de acesso.
2. **Painel de Clareza de Vida (Life OS)**:
   - Medidores de equilíbrio para as 5 áreas vitais (Saúde, Conhecimento, Carreira, Finanças e Desenvolvimento Pessoal).
   - Gerenciador de Metas do Ano com barra de progresso visual.
3. **Vault de Conhecimento com Grafo Neural (Estilo Obsidian)**:
   - Editor em Markdown fluido.
   - Reconhecimento automático de links bidirecionais `[[Nota Conectada]]`.
   - Visualização interativa em Grafo Tridimensional conectando nós de ideias.
4. **Bancos de Dados Relacionais (Estilo Notion)**:
   - **Livros & Biblioteca**: Status de leitura, páginas, avaliações em estrelas e fichamento.
   - **Treinos & Exercícios**: Fichas de hipertrofia/força (A/B/C) com data de execução.
   - **Rastreador de Hábitos**: Check-in diário e contador de sequência (*streak*).
5. **Modo Foco & Diário de Clareza**:
   - Timer Pomodoro integrado (25min Foco / 5min Descanso).
   - Diário de reflexão e descarrego mental (*Brain Dump*).
6. **Ecossistema Extensível de Plugins (MindVault Market)**:
   - Arquitetura preparada para o desenvolvimento de extensões customizadas e plugins da comunidade.

---

## 🛠️ Stack Tecnológica & Arquitetura

- **Frontend**: Next.js 15+ (App Router), React 19, TypeScript.
- **Estilização**: TailwindCSS + Efeitos de Glassmorphism & Dark Theme com Lucide Icons.
- **Backend & Cloud Services**: Firebase (Auth, Cloud Firestore NoSQL, Firebase Storage).
- **Hospedagem & CI/CD**: Vercel + GitHub Actions.

---

## 🚀 Como Rodar o Projeto Localmente

### Pré-requisitos
- Node.js (v26.3.0+)
- npm (v11.16.0+)

### Passos:
1. Instale as dependências:
   ```bash
   npm install
   ```
2. Execute o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```
3. Abra `http://localhost:3000` no seu navegador.

---

## 🔒 Variáveis de Ambiente (.env.local)

Para integrar com seu projeto Firebase no console:
```env
NEXT_PUBLIC_FIREBASE_API_KEY=sua-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=seu-projeto.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=seu-projeto-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=seu-projeto.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=seu-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=seu-app-id
```

---

## 📜 Licença

Desenvolvido para máxima clareza mental e evolução pessoal.

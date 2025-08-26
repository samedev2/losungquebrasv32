# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

## Acompanhamento Quebras Losung - Sistema de Rastreamento Temporal

Este projeto inclui um sistema completo de rastreamento temporal para operações logísticas com as seguintes funcionalidades:

### Funcionalidades Principais

1. **Controle de Status com Timestamps**
   - Rastreamento automático de tempo de permanência em cada status
   - Registro obrigatório do operador responsável por cada mudança
   - Timestamps automáticos para entrada e saída de cada status

2. **Status Disponíveis**
   - **AGUARDANDO TÉCNICO** - Status inicial com contador de tempo
   - **AGUARDANDO MECÂNICO** - Status inicial alternativo
   - **MANUTENÇÃO / SEM PREVISÃO** - Status intermediário
   - **TRANSBORDO** (3 subcategorias):
     - Troca de cavalo
     - Transbordo em andamento  
     - Transbordo finalizado
   - **REINÍCIO DE VIAGEM** - Status final
   - **FINALIZADO** - Conclusão do processo

3. **Timeline Visual**
   - Visualização cronológica de todas as mudanças de status
   - Indicação do operador responsável por cada mudança
   - Duração de permanência em cada status
   - Status atual destacado com animações

4. **Relatórios e Análises**
   - Tempo total do processo
   - Breakdown detalhado por status
   - Identificação de gargalos temporais
   - Cálculo de tempo médio por etapa
   - Percentual de tempo gasto em cada status

5. **Controles de Segurança**
   - Validação de transições de status permitidas
   - Registro obrigatório do nome do operador
   - Histórico completo de mudanças

### Como Usar o Sistema de Rastreamento

1. **Acessar o Rastreamento**
   - Na tabela de registros, clique no ícone de atividade (⚡) na coluna "Ações"
   - Isso abrirá o dashboard de rastreamento temporal

2. **Alterar Status**
   - No dashboard de rastreamento, clique em "Alterar Status"
   - Selecione o novo status (apenas transições válidas são permitidas)
   - Digite o nome do operador responsável (obrigatório)
   - Adicione observações se necessário
   - Clique em "Aplicar Status"

3. **Visualizar Timeline**
   - A aba "Timeline de Status" mostra o histórico cronológico
   - Cada entrada mostra: status, operador, timestamps, duração e observações
   - O status atual é destacado com animação

4. **Analisar Resumo**
   - A aba "Resumo do Processo" fornece análises detalhadas
   - Visualize tempo total, progresso, breakdown por status
   - Identifique gargalos e otimize processos

### Estrutura do Banco de Dados

O sistema utiliza uma tabela adicional `status_timestamps` que registra:
- ID do registro relacionado
- Status aplicado
- Nome do operador responsável
- Timestamp de entrada no status
- Timestamp de saída do status (quando aplicável)
- Duração em segundos
- Observações opcionais

### Benefícios

- **Rastreabilidade Completa**: Histórico detalhado de todas as mudanças
- **Análise de Performance**: Identificação de gargalos e otimizações
- **Responsabilização**: Registro de quem fez cada mudança
- **Relatórios Precisos**: Dados exatos para tomada de decisões
- **Interface Intuitiva**: Fácil de usar e visualmente atrativa

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

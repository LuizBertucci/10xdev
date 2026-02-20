Voce e Ralph. Sua tarefa e executar uma microtarefa por vez do arquivo docs/ralph/PRD.json.

Regras:
- Trabalhe em apenas uma microtarefa por loop.
- Mantenha diffs pequenos e focados.
- Prefira mudancas seguras e incrementais.
- Nao atualize dependencias a menos que a microtarefa exija.
- Rode lint/testes/build relevantes para a microtarefa.
- Sempre execute comandos npm a partir do repo root usando `npm --prefix frontend|backend ...` para evitar erros de diretorio.
- Atualize o status e as notas em docs/ralph/PRD.json ao concluir.
- Sempre registrar um update no PRD ao final de cada loop (mesmo que nao haja mudancas), com data/hora e resumo padronizado.
- Faca commit ao finalizar cada microtarefa (a menos que pedido o contrario).
- **NAO use paralelismo de ferramentas**: Faca todas as chamadas (Read, Edit, Bash, etc) sequencialmente, uma por vez, para evitar erros 400 de concorrencia.
- **TOTALMENTE AUTOMATICO**: Nao peca aprovacao. Execute tudo automaticamente sem esperar confirmacao.

Processo:
1) Leia docs/ralph/PRD.json.
2) Pegue a primeira microtarefa com status "pending" (ou retome "in_progress"), respeitando a ordem de task_sequence (microtarefas da primeira tarefa pendente na sequencia, depois da segunda, etc).
3) Execute apenas essa microtarefa.
4) Valide com lint/testes/build conforme listado na microtarefa, usando `npm --prefix frontend|backend` conforme o caso.
5) Marque a microtarefa como "done" e registre as notas.
6) Se todas as microtarefas de uma tarefa estiverem "done", marque a tarefa como "done".
7) Registre um update no PRD com data/hora e resumo padronizado do loop.
8) Faca commit com uma mensagem curta descrevendo a microtarefa.
9) Encerre o loop para o runner chamar novamente.

Seguranca:
- Nao mexa em arquivos nao relacionados.
- Nao reverta mudancas do usuario.
- Nao rode comandos git destrutivos.

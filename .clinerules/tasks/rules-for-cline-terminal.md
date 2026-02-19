# Workflow Rules

## Build and Validation Process

To ensure the development server is not interrupted and to prevent build cache issues, the following workflow must be followed after a feature is implemented or a bug is fixed:

1.  **Request to Build:** Cline will not run any build or server commands directly. Instead, Cline must ask the user to perform the build by saying:

    > "Please run the frontend build and let me know the result."

2.  **User Action:** The user will then run the appropriate build command in their dedicated terminal (e.g., `npm run dev` inside the `frontend` directory).

3.  **User Feedback:** The user will inform Cline of the outcome:
    *   If the build is successful, the user will say: "Done"
    *   If the build fails, the user will provide the error message.

4.  **Completion:** Cline will only mark the task as complete after receiving confirmation of a successful build from the user.

## Development Server Rules

- **Never Start Servers:** Cline must never run commands like `npm run dev`, `npm start`, or any command that starts a development server.
- **Respect Running Processes:** The user maintains dedicated terminal tabs for running servers. Cline should not interfere with these processes.
- **Build Only When Requested:** Cline should only suggest builds when necessary for validation, and always request the user to perform them.

## Testing and Validation

- **No Automatic Testing:** Cline will not run test commands or validation scripts without explicit user request.
- **Request User Validation:** When a feature is complete, Cline should ask the user to test the functionality in their running development environment.
- **Wait for Confirmation:** Cline must wait for user confirmation before considering any task complete.

---

## MCP Installation Rules

- **Instalação de Servidores MCP:**
  1.  **Método de Instalação (npx):** Servidores MCP devem ser instalados via `npx` (ex: `npx -y @modelcontextprotocol/server-memory`). Não é necessário criar um diretório prévio para o servidor, a menos que um `MEMORY_FILE_PATH` personalizado seja especificado.
  2.  **Ler o arquivo de configurações MCP existente:** Ler o conteúdo atual de `C:\Users\Janete\AppData\Roaming\Cursor\User\globalStorage\saoudrizwan.claude-dev\settings\cline_mcp_settings.json` para preservar quaisquer configurações de servidor MCP existentes.
  3.  **Construir a configuração do novo servidor MCP:** Criar o bloco JSON para o novo servidor, incluindo `command`, `args`, `disabled: false` e `autoApprove: []`.
  4.  **Atualizar o arquivo `cline_mcp_settings.json`:** Mesclar a nova configuração com o conteúdo existente e sobrescrever o arquivo.
  5.  **Verificar a instalação e demonstrar as capacidades:** Após a atualização do arquivo, o sistema deve reconhecer o novo servidor MCP. Usar uma das ferramentas do servidor para demonstrar seu funcionamento.

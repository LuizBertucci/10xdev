<!-- 95435804-3540-4159-a345-cbfa06527ea8 2c506587-dddb-417e-a523-8bf3e1f6c2bb -->
# Fix Add Member Functionality Plan

The goal is to fix the buggy "Add Member" functionality in the Project Details page. The user wants to search for a user by email, see the results, select the user, and then add them to the project.

## Backend Changes

1.  **Create User Model (`backend/src/models/UserModel.ts`)**

    -   Implement a `search` method to query the `public.users` table by email or name using `ilike`.
    -   Ensure it returns necessary user details (id, email, name, avatar_url).

2.  **Create User Controller (`backend/src/controllers/UserController.ts`)**

    -   Implement a `search` method that handles the request, calls `UserModel.search`, and returns the results.

3.  **Create User Routes (`backend/src/routes/userRoutes.ts`)**

    -   Define the route `GET /search` mapping to `UserController.search`.

4.  **Update Main Routes (`backend/src/routes/index.ts`)**

    -   Mount the user routes under `/api/users`.

## Frontend Changes

1.  **Create `frontend/services/userService.ts`**

    -   Add a method `searchUsers(query: string)` to call the new backend endpoint.

2.  **Update `frontend/pages/ProjectDetail.tsx`**

    -   Modify the "Add Member" dialog.
    -   Replace the simple email input with a search interface (input + search button or debounce).
    -   Display a list of found users.
    -   Allow selecting a user from the list.
    -   Update the "Add" button to call `projectService.addMember` with the selected user's ID.

### To-dos

- [ ] Create backend/src/models/UserModel.ts with search functionality
- [ ] Create backend/src/controllers/UserController.ts
- [ ] Create backend/src/routes/userRoutes.ts and update index.ts
- [ ] Create frontend/services/userService.ts or update projectService.ts
- [ ] Update frontend/pages/ProjectDetail.tsx with search and select UI
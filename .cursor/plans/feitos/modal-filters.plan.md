---
name: ""
overview: ""
todos: []
isProject: false
---

# **Code Filtering Feature Tasks**

## **1. Backend: Metadata Endpoint**

- Create `getFilters` method in
**CardFeatureModel.ts** to query unique `tech`, `language`, and `tags` using Supabase.
- Create `getFilters` method in
**CardFeatureController.ts** to handle the HTTP request.
- Add `GET /api/card-features/filters` route in
**cardFeatureRoutes.ts**.
- Test the new endpoint to ensure it returns the correct payload format
**({ techs: string[], languages: string[], tags: string[] })**.

## **2. Frontend: Filter Validation & Service**

- Check
**frontend/services/cardFeatureService.ts** to ensure `tags` and `language` are properly passed in the
**getAll** request params.
- Add `getFilters()` method to `cardFeatureService.ts` to fetch the metadata.

## **3. Frontend: CodeFiltersMenu Component**

- Create `frontend/components/FiltersModal.tsx`.
- Fetch filter metadata on mount (or use React Query / local state).
- Implement UI for selecting multiple tags, single tech, single/multiple language.
- Add apply/clear logic that updates the parent component's state.

## **4. Frontend: Integration in Codes Page**

- Import and place `FiltersModal` in
**frontend/pages/Codes.tsx**, **above the first card** (after tabs, before card list).
- Pass `selectedTech`, `selectedLanguage`, `selectedTags`, and their setters from the page state to the modal.
- Ensure fetching works correctly and updates the code list.


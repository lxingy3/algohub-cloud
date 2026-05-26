# AlgoHub Learning Guide

A beginner-friendly guide to understanding the AlgoHub project structure, concepts, and how everything fits together.

---

## Table of Contents

1. [What is AlgoHub?](#what-is-algohub)
2. [Project Structure](#project-structure)
3. [Key Concepts](#key-concepts)
4. [How Data Flows](#how-data-flows)
5. [Pages & Routing](#pages--routing)
6. [Components Deep Dive](#components-deep-dive)
7. [State Management](#state-management)
8. [Running the Project](#running-the-project)
9. [Next Steps for Learners](#next-steps-for-learners)

---

## What is AlgoHub?

AlgoHub is a **public algorithm registry** — a web app that helps citizens discover and understand algorithms used in government and public services. Think of it as a transparent catalog of automated decision-making systems.

**Key features:**
- Browse algorithm profiles (what they do, who uses them, impact level)
- Read community stories and news about algorithms
- Add new algorithms to the registry
- Share your own story about an algorithm experience
- Comment and discuss on stories

This version runs **without Base44** — it uses React, static data, and browser localStorage instead of a cloud backend.

---

## Project Structure

```
AlgoHub_no_base44/
├── index.html          # Entry HTML
├── package.json        # Dependencies & scripts
├── vite.config.js      # Vite build config
├── tailwind.config.js  # Tailwind CSS config
├── src/
│   ├── main.jsx        # React entry point
│   ├── App.jsx         # Root component, routing, providers
│   ├── Layout.jsx      # Shared navigation & layout
│   ├── index.css       # Global styles
│   │
│   ├── pages/          # One file = one page/route
│   │   ├── Home.jsx
│   │   ├── Algorithms.jsx
│   │   ├── Stories.jsx
│   │   ├── NewsInsights.jsx
│   │   ├── About.jsx
│   │   ├── AddAlgorithm.jsx
│   │   └── ShareStory.jsx
│   │
│   ├── components/     # Reusable UI pieces
│   │   ├── ui/         # Low-level primitives (Button, Input, etc.)
│   │   ├── data/       # Static data (algorithms, stories)
│   │   ├── AlgorithmCard.jsx
│   │   ├── StoryCard.jsx
│   │   └── ThreadedComments.jsx
│   │
│   ├── lib/            # Utilities & shared logic
│   │   ├── AuthContext.jsx   # Auth state (simplified, no login)
│   │   ├── localData.js      # localStorage CRUD for comments, algorithms
│   │   ├── query-client.js   # React Query config
│   │   ├── PageNotFound.jsx
│   │   └── utils.js
│   │
│   ├── utils/          # Helper functions
│   │   └── index.ts    # createPageUrl, etc.
│   │
│   └── pages.config.js # Page → route mapping
```

---

## Key Concepts

### 1. **React + Vite**

- **React**: A library for building UIs with components.
- **Vite**: A fast build tool that bundles your code and serves it during development.

### 2. **Component-Based UI**

Everything you see is built from components:

- **Pages** (e.g., `Home.jsx`) = full screens
- **Components** (e.g., `AlgorithmCard.jsx`) = smaller, reusable pieces
- **UI primitives** (`components/ui/`) = buttons, inputs, dialogs, etc.

### 3. **Routing**

- URLs map to pages: `/` → Home, `/Algorithms` → Algorithms, etc.
- Handled by **React Router** in `App.jsx`.
- `pages.config.js` defines which component goes with which route.

### 4. **Data Sources**

| Data        | Source                    | Persistence      |
|------------|---------------------------|------------------|
| Algorithms | `algorithmsData.jsx` + localStorage | Static + local  |
| Stories     | `storiesData.jsx`         | Static           |
| Comments   | `localData.js` → localStorage | Browser only  |
| New algorithms | User form → `localData.js` | localStorage |

### 5. **React Query (TanStack Query)**

Used for **server-like state** (even though we use localStorage):

- **Queries**: Fetch and cache data (e.g., comments for a story)
- **Mutations**: Update data (e.g., add a comment, add an algorithm)
- **Invalidation**: Refresh data after a mutation

---

## How Data Flows

### Viewing algorithms

1. User visits `/Algorithms`
2. `Algorithms.jsx` calls `getAlgorithms(algorithmsData)` from `localData.js`
3. `getAlgorithms` merges static data + any algorithms saved in localStorage
4. Data is rendered via `AlgorithmCard` components

### Adding a comment

1. User types in the comment box and clicks "Post Comment"
2. `ThreadedComments.jsx` runs `commentMutation.mutate({ story_id, content, ... })`
3. `addComment()` in `localData.js` saves to localStorage
4. React Query invalidates the `['comments', storyId]` query
5. Comments re-fetch and the UI updates

### Adding an algorithm

1. User fills the form on `/AddAlgorithm` and submits
2. `addAlgorithm()` in `localData.js` saves to localStorage
3. React Query invalidates `['algorithms']`
4. Any page using algorithms will show the new one on next load

---

## Pages & Routing

| Route          | Page          | Description                          |
|----------------|---------------|--------------------------------------|
| `/`            | Home          | Hero, search, algorithm previews     |
| `/Algorithms`  | Algorithms    | Full algorithm registry + filters    |
| `/Stories`     | Stories       | Community stories                    |
| `/NewsInsights`| NewsInsights  | News & research articles             |
| `/About`       | About         | Project mission & principles        |
| `/AddAlgorithm`| AddAlgorithm  | Form to add a new algorithm          |
| `/ShareStory`  | ShareStory    | Form to share your story             |

Routes are defined in `App.jsx` and `pages.config.js`.

---

## Components Deep Dive

### Layout.jsx

- Wraps every page
- Renders the top navigation bar
- Uses `createPageUrl()` to build links (e.g., `createPageUrl('Algorithms')` → `/Algorithms`)

### AlgorithmCard.jsx

- Displays one algorithm: name, status, use case, description, impact level
- Clickable; opens a detail dialog on the parent page

### StoryCard.jsx

- Displays one story: title, summary, date, views, comments count
- Clickable; opens the full story in a dialog

### ThreadedComments.jsx

- Shows comments for a story
- Supports replies (nested comments)
- Handles likes and new comments via `localData.js`

### localData.js

The "database" for this app:

- `getComments(storyId)` — get comments for a story
- `addComment(data)` — add a comment
- `updateComment(id, updates)` — update (e.g., likes)
- `getAlgorithms(static)` — merge static + local algorithms
- `addAlgorithm(data)` — save a new algorithm
- `getStoryLikes(storyId)` / `updateStoryLikes(...)` — like counts

All data is stored in `localStorage` under keys like `algohub_comments`, `algohub_algorithms`.

---

## State Management

1. **Local state** (`useState`): Form inputs, which dialog is open, etc.
2. **React Query**: Cached data (comments, algorithms) and mutations
3. **AuthContext**: User/auth state — in this version it’s always “logged in” with no real auth
4. **localStorage**: Persistence across page refreshes

---

## Running the Project

```bash
cd AlgoHub_no_base44
npm install
npm run dev
```

Open **http://localhost:5173** in your browser.

**Other commands:**
- `npm run build` — production build
- `npm run preview` — preview production build
- `npm run lint` — run ESLint

---

## Next Steps for Learners

1. **Change static data**  
   Edit `src/components/data/algorithmsData.jsx` or `storiesData.jsx` and see the updates.

2. **Add a new page**  
   Create `src/pages/MyPage.jsx`, add it to `pages.config.js`, and add a nav link in `Layout.jsx`.

3. **Inspect localStorage**  
   Open DevTools → Application → Local Storage and look at `algohub_*` keys after adding comments or algorithms.

4. **Trace a mutation**  
   Add a comment, then follow the flow: `ThreadedComments` → `commentMutation` → `addComment` → `localStorage`.

5. **Replace localStorage with an API**  
   Swap `localData.js` functions for `fetch()` calls to a backend and keep the same React Query usage.

6. **Add real authentication**  
   Integrate Firebase, Supabase, or Auth0 and replace the simplified `AuthContext`.

---

## Glossary

- **Component**: A reusable piece of UI (function that returns JSX)
- **Hook**: A function like `useState` or `useQuery` that adds behavior to components
- **Props**: Data passed from parent to child component
- **Query**: A request for data (React Query)
- **Mutation**: An operation that changes data (React Query)
- **localStorage**: Browser storage that persists across sessions

---

*Happy learning!*

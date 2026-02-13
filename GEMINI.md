# GEMINI Project Analysis

This file provides a comprehensive analysis of the project to be used as instructional context for future interactions with the Gemini CLI agent.

## Project Overview

This is a Vue.js 3 project for a mobile Progressive Web App (PWA) called **LIQUIDO**. LIQUIDO is a platform for liquid democracy, allowing users to vote on proposals by ranking their preferences. This frontend communicates with a GraphQL backend via HTTP requests.

### Key Technologies

*   **Framework:** Vue.js 3
*   **Build Tool:** Vite
*   **Routing:** Vue Router
*   **State Management:** A simple reactive store (`src/services/store.js`)
*   **HTTP Client:** Axios (for GraphQL communication)
*   **Styling:** Bootstrap and custom CSS
*   **Unit Testing:** Vitest
*   **E2E Testing:** Cypress

## Building and Running

### Development

To run the development server:

```bash
npm start
```

This will start the Vite dev server, which is configured in `vite.config.js` to run on HTTPS and proxy API requests to the backend.

### Building for Production

To build the application for production:

```bash
npm run build
```

This will create a `dist` directory with the optimized production build.

### Testing

*   **Unit Tests:**

    ```bash
    npm run test:unit
    ```

*   **End-to-End Tests:**

    ```bash
    npm test
    ```

    There are also scripts for running Cypress in development mode:

    ```bash
    npm run test:e2e:dev
    ```

## Development Conventions

*   The project uses ESLint for linting and Prettier for code formatting.
*   The application's entry point is `src/main.js`.
*   Routing is defined in `src/services/router.js`.
*   A simple reactive store in `src/services/store.js` is used for global state management.
*   Vue frontend components are located in the `src/components` 
*   Application pages are located in the `src/views` directory.
*   The GraphQL Client is in the `src/services/liquido-graphql-client.js` file.
*   The project uses a `config` directory to manage environment-specific configurations.
*   The `GEMINI.md` file exists to provide context to the Gemini CLI agent.

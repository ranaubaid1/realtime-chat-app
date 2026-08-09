Frontend Development Notes (Vite + React)

The frontend of this project is built on Vite's React template, providing a minimal, fast development setup with Hot Module Replacement (HMR) and pre-configured ESLint rules.

Available Plugins

Two official Vite plugins are supported for React Fast Refresh:

Plugin	Compiler Used
@vitejs/plugin-react	Oxc
@vitejs/plugin-react-swc	SWC
React Compiler

The React Compiler is not enabled in this setup due to its current impact on development and build performance. To enable it, refer to the official installation guide.

Expanding ESLint Configuration

For production-grade applications, it is recommended to adopt TypeScript along with type-aware ESLint rules for stronger reliability and maintainability. Refer to the TypeScript template for guidance on integrating TypeScript and typescript-eslint into this project.
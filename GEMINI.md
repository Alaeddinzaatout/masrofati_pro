# Project: Masrofati

Masrofati is a React Native mobile application built with the Expo framework and Expo Router. It functions as an expense management system with integrated AI-powered features for financial tracking, reporting, and smart analysis.

## Tech Stack
- **Framework:** Expo
- **Language:** TypeScript
- **Routing:** Expo Router
- **UI:** React Native Paper, React Native SVG, React Native Chart Kit
- **Backend/Services:** Firebase, Cerebras Cloud SDK
- **State/Storage:** Async Storage, React Native Gesture Handler, React Native Reanimated

## Building and Running
The following scripts are defined in `package.json`:

- **`npm start`**: Starts the Expo development server.
- **`npm run android`**: Runs the app on an Android emulator or device.
- **`npm run ios`**: Runs the app on an iOS simulator or device.
- **`npm run web`**: Runs the app in a web browser.

## Project Structure
- `app/`: Contains the Expo Router file-based routing structure.
- `assets/`: Static assets (fonts, images).
- `constants/`: Configuration constants (e.g., color palettes).
- `src/`: Core business logic, services, and utilities.
  - `src/services/`: AI service managers, purchasing engine, reporting tools, and predictive analytics.
  - `src/firebase/`: Firebase configuration and initialization.
  - `src/utils/`: Helper functions for image optimization, search, and validation.

## Development Conventions
- **Routing:** Follows the Expo Router convention (file-based).
- **TypeScript:** Strict type checking is enabled. Ensure all new components and services are correctly typed.
- **Components:** Functional components using React hooks are preferred.
- **State Management:** Leverage React Native Paper and standard hooks; for complex state, follow existing patterns in `src/services/`.
- **Testing:** Add unit tests in corresponding test files (if applicable) for new logic added to `src/services/`.

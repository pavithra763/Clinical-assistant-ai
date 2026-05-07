# Deployment Guide: Clinical Conversation Assistant

This document provides step-by-step instructions for deploying and maintaining the Clinical Conversation Assistant application.

## 1. Prerequisites

Before starting the deployment, ensure you have the following installed:
- **Node.js (v18 or later)**
- **npm (v9 or later)**
- **Google Gemini API Key**: Obtain a key from the [Google AI Studio Console](https://aistudio.google.com/).

## 2. Environment Configuration

The application requires the `GEMINI_API_KEY` to function. 

1. Create a `.env` file in the root directory:
   ```bash
   cp .env.example .env
   ```
2. Open `.env` and add your API key:
   ```env
   GEMINI_API_KEY=your_actual_key_here
   ```

## 3. Local Installation

```bash
# Install dependencies
npm install

# Start the development server
npm run dev
```

The application will be accessible at `http://localhost:3000`.

## 4. Building for Production

To create an optimized production build:

```bash
# Run types check and generate the dist/ folder
npm run build
```

The output will be generated in the `dist/` directory.

## 5. Deployment Options

### Standard Static Hosting (Vercel, Netlify, Cloudflare Pages)
Since this is a Vite-based SPA, you can deploy the contents of the `dist/` folder to any static site hosting service.
- **Root Directory**: Project root
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Environment Variables**: Add `GEMINI_API_KEY` to your hosting provider's dashboard.

### Docker Deployment
You can use a simple Nginx-based Dockerfile to serve the application:

```dockerfile
# Build Stage
FROM node:18-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Production Stage
FROM nginx:stable-alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

## 6. Post-Deployment Verification

1. **Verify AI Connection**: Open the app and attempt to start a recording. If the AI service fails, check the browser console and verify the `GEMINI_API_KEY`.
2. **Persistence Check**: The application uses `localStorage` for state persistence and theme preferences. Ensure your browser is not in "Incognito" mode if you want preferences to persist across sessions.
3. **Responsive Design**: Test the application on tablet and mobile devices to ensure the UI adapts correctly.

## 7. Troubleshooting

- **Build Errors**: Ensure all dependencies are correctly installed. Delete `node_modules` and `package-lock.json` and run `npm install` again if issues persist.
- **Microphone Permissions**: The application requires browser microphone access. Ensure HTTPS is used in production as most browsers block microphone access on non-secure connections.
- **Rate Limits**: The Gemini API has rate limits based on your plan. Monitor usage in the Google Cloud Console if transcription or summarization becomes sluggish.

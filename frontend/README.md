# Frontend MSPR Serverless

Application React 19 pour l'authentification sécurisée avec authentification à deux facteurs (2FA).

## 🚀 Technologies

- **React 19** - Bibliothèque UI moderne
- **TypeScript** - Typage statique
- **Vite** - Build tool rapide
- **Tailwind CSS** - Framework CSS utilitaire
- **React Router** - Navigation

## 📦 Installation

```bash
cd frontend
npm install
```

## 🏃 Démarrage

```bash
npm run dev
```

L'application sera accessible sur `http://localhost:3000`

## 🏗️ Build

```bash
npm run build
```

Les fichiers de production seront générés dans le dossier `dist/`

## 📁 Structure du Projet

```
frontend/
├── src/
│   ├── components/     # Composants réutilisables
│   │   ├── Alert.tsx
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Input.tsx
│   │   ├── Layout.tsx
│   │   └── QRCode.tsx
│   ├── pages/          # Pages de l'application
│   │   ├── AuthUser.tsx
│   │   ├── Generate2FA.tsx
│   │   └── GeneratePassword.tsx
│   ├── services/       # Services API
│   │   └── api.ts
│   ├── types/          # Types TypeScript
│   │   └── index.ts
│   ├── config/         # Configuration
│   │   └── constants.ts
│   ├── App.tsx         # Composant principal
│   ├── main.tsx        # Point d'entrée
│   └── index.css       # Styles globaux
├── package.json
├── vite.config.ts
├── tailwind.config.js
└── tsconfig.json
```

## 🎨 Fonctionnalités

### 1. Génération de Mot de Passe
- Création/mise à jour d'utilisateur
- Génération automatique de mot de passe sécurisé
- QR code pour sauvegarde facile

### 2. Activation 2FA
- Génération de code QR pour Google Authenticator
- Clé d'entrée manuelle
- Support des applications TOTP

### 3. Authentification
- Vérification du mot de passe
- Validation du code 2FA
- Gestion des erreurs et expiration de compte

## ♿ Accessibilité

L'application respecte les standards d'accessibilité :
- Labels ARIA appropriés
- Navigation au clavier
- Contraste de couleurs suffisant
- Messages d'erreur clairs
- Support des lecteurs d'écran

## 📱 Responsive Design

L'interface s'adapte à tous les écrans :
- Mobile (< 640px)
- Tablette (640px - 1024px)
- Desktop (> 1024px)

## 🔧 Configuration

L'URL de l'API peut être modifiée dans `src/config/constants.ts` :

```typescript
export const API_BASE_URL = 'https://openfaas.91.99.16.71.nip.io/function';
```

## 📝 Scripts Disponibles

- `npm run dev` - Démarre le serveur de développement
- `npm run build` - Compile l'application pour la production
- `npm run preview` - Prévisualise le build de production
- `npm run lint` - Vérifie le code avec ESLint


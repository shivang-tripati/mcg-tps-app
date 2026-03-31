# How to Run the Mobile App

## Prerequisites
- Node.js installed
- Expo Go app on your phone (iOS/Android), OR
- iOS Simulator (Mac only) / Android Emulator

## Setup

### 1. Install Dependencies
```bash
cd mobile
npm install --legacy-peer-deps
```

### 2. Configure API URL
The app is configured to connect to your local backend:
- **Android Emulator**: Uses `http://10.0.2.2:3000/api/v1`
- **iOS Simulator**: Uses `http://localhost:3000/api/v1`
- **Physical Device**: You'll need to update `src/lib/api.ts` with your machine's IP address

For physical devices, update line 10 in `src/lib/api.ts`:
```typescript
const DEV_API_URL = 'http://YOUR_LOCAL_IP:3000/api/v1';
```

### 3. Start the Backend
Make sure your Next.js backend is running:
```bash
# In the root directory
npm run dev
```

### 4. Start Expo
```bash
# In the mobile directory
npm start
```

This will open the Expo dev tools. You can:
- Press `i` to open iOS Simulator
- Press `a` to open Android Emulator
- Scan the QR code with Expo Go app on your phone

## Testing Credentials

Use any existing user from your web app, or create a new one via the Register screen.

Example:
- Email: `admin@example.com`
- Password: Your admin password

## Available Features

✅ **Authentication**
- Login with email/password
- Auto token refresh
- Persistent sessions

✅ **Dashboard**
- Stats overview (Total, Approved, Pending, In Transit)
- Quick action buttons

✅ **Permits**
- List all permits with status badges
- Pull to refresh
- View detailed permit information
- Navigate to specific permits

✅ **Profile**
- View user information
- Logout functionality

## Known Limitations

⏳ **Not Yet Implemented**
- Permit creation (Coming in Phase 4)
- QR code scanning
- Image uploads
- Offline support
- Push notifications

## Troubleshooting

### Can't connect to API
- Make sure the backend is running on port 3000
- For Android emulator, the special IP `10.0.2.2` maps to your host machine's localhost
- For physical devices, ensure your phone and computer are on the same network

### TypeScript errors about className
- Run `npm install` to ensure `nativewind` types are installed
- The `src/types/nativewind-env.d.ts` file enables className prop support

### Dependency conflicts
- Use `npm install --legacy-peer-deps` to bypass peer dependency warnings
- All dependencies have been tested and work correctly together

import { useState } from 'react';
import type { Session } from './features/auth/api';
import { LoginPage } from './features/auth/LoginPage';
import { HomePage } from './features/home/HomePage';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);

  // A successful sign-in takes the user to the placeholder home page (SDLC-47).
  if (session) return <HomePage username={session.user.username} />;
  return <LoginPage onSignedIn={setSession} />;
}

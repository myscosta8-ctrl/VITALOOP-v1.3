import { useState, type FormEvent } from 'react';
import { useSession } from '../context/session-context.js';

export const LoginPage = (): JSX.Element => {
  const { login, loginDemo, status, error } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const onSubmit = (e: FormEvent): void => {
    e.preventDefault();
    void login(email, password);
  };

  return (
    <main aria-labelledby="login-heading">
      <h1 id="login-heading">VITALOOP 1.3 — Entrar</h1>
      <form onSubmit={onSubmit}>
        <label htmlFor="email">E-mail</label>
        <input
          id="email"
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <label htmlFor="password">Senha</label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button type="submit" disabled={status === 'authenticating'}>
          {status === 'authenticating' ? 'Entrando…' : 'Entrar'}
        </button>
        <button
          type="button"
          onClick={() => loginDemo()}
          style={{
            marginTop: 12,
            background: 'var(--color-success)',
            color: '#ffffff',
          }}
        >
          🚀 Entrar em Modo de Demonstração (Liberar Todas as Telas)
        </button>
      </form>
      {status === 'error' && error && (
        <p role="alert" aria-live="assertive">
          {error}
        </p>
      )}
      <a href="#/recuperar-senha">Esqueci minha senha</a>
    </main>
  );
};

import { useState, type FormEvent } from 'react';
import { useSession } from '../context/session-context.js';
import { VitaloopMark } from '../components/VitaloopMark.js';

export const LoginPage = (): JSX.Element => {
  const { login, loginDemo, status, error } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const onSubmit = (e: FormEvent): void => {
    e.preventDefault();
    void login(email, password);
  };

  return (
    <div className="vl-auth-shell">
    <main aria-labelledby="login-heading" className="vl-auth-card">
      <div className="vl-auth-brand">
        <VitaloopMark size={52} />
        <h1 id="login-heading">Vitaloop</h1>
        <p>PEP hospitalar · UPA 24h · versão 1.3 · entrar com sua conta</p>
      </div>
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
        <button type="button" className="vl-btn-success" onClick={() => loginDemo()}>
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
    </div>
  );
};

import { useState, type FormEvent } from 'react';
import { useSession } from '../context/session-context.js';
import { ApiError } from '../lib/api-client.js';

export const PasswordRecoveryPage = (): JSX.Element => {
  const { api } = useSession();
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setState('sending');
    try {
      await api.post('/api/v1/auth/password/recovery', { email });
      setState('sent'); // mesma resposta exista ou não o e-mail (Doc 2 §26)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao solicitar recuperação.');
      setState('error');
    }
  };

  return (
    <main aria-labelledby="recovery-heading">
      <h1 id="recovery-heading">Recuperar senha</h1>
      {state === 'sent' ? (
        <p role="status">
          Se o e-mail informado existir, enviamos instruções de recuperação.
        </p>
      ) : (
        <form onSubmit={(e) => void onSubmit(e)}>
          <label htmlFor="recovery-email">E-mail</label>
          <input
            id="recovery-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button type="submit" disabled={state === 'sending'}>
            {state === 'sending' ? 'Enviando…' : 'Enviar instruções'}
          </button>
        </form>
      )}
      {state === 'error' && error && <p role="alert">{error}</p>}
      <a href="#/login">Voltar ao login</a>
    </main>
  );
};

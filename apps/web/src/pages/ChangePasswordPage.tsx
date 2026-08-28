import { useState, type FormEvent } from 'react';
import { useSession } from '../context/session-context.js';
import { ApiError } from '../lib/api-client.js';

export const ChangePasswordPage = (): JSX.Element => {
  const { api, identity } = useSession();
  const [newPassword, setNewPassword] = useState('');
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  if (!identity) {
    return <p role="alert">Autenticação necessária para alterar a senha.</p>;
  }

  const onSubmit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setState('saving');
    try {
      await api.post('/api/v1/auth/password/change', { newPassword });
      setState('saved');
      setNewPassword('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao alterar senha.');
      setState('error');
    }
  };

  return (
    <main aria-labelledby="change-password-heading">
      <h1 id="change-password-heading">Alterar senha</h1>
      <form onSubmit={(e) => void onSubmit(e)}>
        <label htmlFor="new-password">Nova senha</label>
        <input
          id="new-password"
          type="password"
          minLength={8}
          required
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
        <button type="submit" disabled={state === 'saving'}>
          {state === 'saving' ? 'Salvando…' : 'Alterar senha'}
        </button>
      </form>
      {state === 'saved' && (
        <p role="status">Senha alterada. Outras sessões foram encerradas por segurança.</p>
      )}
      {state === 'error' && error && <p role="alert">{error}</p>}
    </main>
  );
};

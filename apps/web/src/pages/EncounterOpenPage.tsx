import React, { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card.js';
import { Button } from '../components/ui/button.js';
import { ReceptionIntakeForm } from '../components/ReceptionIntakeForm.js';

export const EncounterOpenPage: React.FC = () => {
  const [opened, setOpened] = React.useState(false);

  useEffect(() => {
    if (opened) {
      window.location.hash = '#/pronto-atendimento';
    }
  }, [opened]);

  return (
    <main className="mx-auto max-w-2xl py-5">
      <Card>
        <CardHeader>
          <CardTitle>Recepção — Abertura de Atendimento (UPA 24h)</CardTitle>
        </CardHeader>
        <CardContent>
          <ReceptionIntakeForm onSuccess={() => setOpened(true)} />
          <div className="vl-modal-actions">
            <Button asChild variant="ghost">
              <a href="#/pronto-atendimento">Voltar para o Pronto Atendimento</a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
};

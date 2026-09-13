import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card.js';
import { Button } from '../components/ui/button.js';
import { EncounterOpenForm } from '../components/EncounterOpenForm.js';

export const EncounterOpenPage: React.FC = () => {
  return (
    <main className="mx-auto max-w-2xl py-5">
      <Card>
        <CardHeader>
          <CardTitle>Abertura de Atendimento (UPA 24h)</CardTitle>
        </CardHeader>
        <CardContent>
          <EncounterOpenForm />
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

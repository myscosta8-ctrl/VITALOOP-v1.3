import React, { useState } from 'react';
import { NursingRecordData } from '../lib/nursing-api';

interface NursingRecordsViewProps {
  records: NursingRecordData[];
  onAddRecord: (type: 'admission' | 'evolution' | 'annotation', content: string) => Promise<void>;
  disabled?: boolean;
}

export const NursingRecordsView: React.FC<NursingRecordsViewProps> = ({ records, onAddRecord, disabled = false }) => {
  const [recordType, setRecordType] = useState<'admission' | 'evolution' | 'annotation'>('annotation');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    if (recordType === 'admission' && content.trim().length < 10) {
      setError('A admissão de enfermagem exige um histórico/motivo de no mínimo 10 caracteres.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await onAddRecord(recordType, content);
      setContent('');
    } catch (err) {
      const e = err as Error;
      setError(e?.message || 'Erro ao registrar anotação de enfermagem.');
    } finally {
      setLoading(false);
    }
  };

  const getRecordBadge = (type: string) => {
    switch (type) {
      case 'admission':
        return <span className="bg-purple-100 text-purple-800 text-xs px-2 py-0.5 rounded font-semibold">Admissão</span>;
      case 'evolution':
        return <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded font-semibold">Evolução</span>;
      default:
        return <span className="bg-gray-100 text-gray-800 text-xs px-2 py-0.5 rounded font-semibold">Anotação</span>;
    }
  };

  return (
    <div className="bg-white p-4 rounded border border-gray-200 shadow-sm space-y-4">
      <h3 className="text-lg font-bold text-gray-900 border-b pb-2">Registros e Anotações de Enfermagem (NUR-001..003)</h3>

      {error && <div className="p-3 bg-red-50 text-red-700 text-sm rounded border border-red-200">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex gap-4">
          <label className="text-sm font-medium text-gray-700">Tipo de Registro:</label>
          <label className="inline-flex items-center text-sm">
            <input
              type="radio"
              name="recordType"
              value="annotation"
              checked={recordType === 'annotation'}
              onChange={() => setRecordType('annotation')}
              disabled={disabled}
              className="mr-1"
            />
            Anotação
          </label>
          <label className="inline-flex items-center text-sm">
            <input
              type="radio"
              name="recordType"
              value="evolution"
              checked={recordType === 'evolution'}
              onChange={() => setRecordType('evolution')}
              disabled={disabled}
              className="mr-1"
            />
            Evolução (Enfermeiro)
          </label>
          <label className="inline-flex items-center text-sm">
            <input
              type="radio"
              name="recordType"
              value="admission"
              checked={recordType === 'admission'}
              onChange={() => setRecordType('admission')}
              disabled={disabled}
              className="mr-1"
            />
            Admissão no Setor
          </label>
        </div>

        <textarea
          rows={3}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          disabled={disabled || loading}
          placeholder="Descreva as observações, queixas do paciente, repouso, sinais vitais ou evolução da enfermagem..."
          className="w-full p-2 border rounded focus:ring-1 focus:ring-blue-500 text-sm"
        />

        <button
          type="submit"
          disabled={disabled || loading || !content.trim()}
          className="px-4 py-2 bg-emerald-600 text-white rounded text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
        >
          {loading ? 'Gravando...' : 'Salvar Registro de Enfermagem'}
        </button>
      </form>

      <div className="mt-6 space-y-3">
        <h4 className="font-semibold text-sm text-gray-700 border-b pb-1">Histórico de Enfermagem</h4>
        {records.length === 0 ? (
          <p className="text-sm text-gray-500 italic">Nenhum registro de enfermagem até o momento.</p>
        ) : (
          records.map((r) => (
            <div key={r.id} className="p-3 bg-gray-50 border rounded text-sm space-y-1">
              <div className="flex justify-between items-center text-xs text-gray-500">
                <div className="flex items-center gap-2">
                  {getRecordBadge(r.recordType)}
                  <span>Por: {r.professionalId}</span>
                </div>
                <span>{new Date(r.createdAt).toLocaleString('pt-BR')}</span>
              </div>
              <p className="text-gray-800 whitespace-pre-wrap">{r.content}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

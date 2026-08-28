import React, { useCallback, useEffect, useState } from 'react';
import { useSession } from '../context/session-context.js';
import { createPrescriptionsApi, type MedicationItem } from '../lib/prescriptions-api.js';

interface Props {
  onSelect: (item: MedicationItem) => void;
  selectedItem: MedicationItem | null;
  onClear?: () => void;
}

export const MedicationSearchInput: React.FC<Props> = ({ onSelect, selectedItem, onClear }) => {
  const { api } = useSession();
  const prescriptionsApi = createPrescriptionsApi(api);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<readonly MedicationItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const performSearch = useCallback(
    async (searchTerm: string) => {
      setLoading(true);
      try {
        const items = await prescriptionsApi.searchMedications(searchTerm);
        setResults(items);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    [api],
  );

  useEffect(() => {
    if (!selectedItem) {
      const timer = setTimeout(() => {
        performSearch(query);
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [query, selectedItem, performSearch]);

  if (selectedItem) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', backgroundColor: '#f0fdf4', border: '1px solid #16a34a', borderRadius: 4 }}>
        <span style={{ fontWeight: 'bold', color: '#15803d' }}>[{selectedItem.code}]</span>
        <span style={{ color: '#0f172a' }}>{selectedItem.name}</span>
        {selectedItem.pharmaceuticalForm && <span style={{ fontSize: 12, color: '#64748b' }}>({selectedItem.pharmaceuticalForm})</span>}
        <button
          type="button"
          onClick={() => {
            if (onClear) onClear();
            setQuery('');
          }}
          style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#ef4444', fontWeight: 'bold', cursor: 'pointer' }}
        >
          Trocar
        </button>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative' }}>
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => {
          setIsOpen(true);
          performSearch(query);
        }}
        placeholder="Digite o nome ou princípio ativo do medicamento (ex: Dipirona, Paracetamol)..."
        style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc' }}
      />

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            maxHeight: 220,
            overflowY: 'auto',
            backgroundColor: '#fff',
            border: '1px solid #ccc',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            zIndex: 100,
            borderRadius: '0 0 4px 4px',
          }}
        >
          {loading ? (
            <div style={{ padding: 10, fontSize: 13, color: '#64748b' }}>Buscando medicamentos...</div>
          ) : results.length === 0 ? (
            <div style={{ padding: 10, fontSize: 13, color: '#64748b' }}>Nenhum medicamento encontrado.</div>
          ) : (
            results.map((item) => (
              <div
                key={item.id}
                onClick={() => {
                  onSelect(item);
                  setIsOpen(false);
                }}
                style={{
                  padding: '8px 12px',
                  cursor: 'pointer',
                  borderBottom: '1px solid #f1f5f9',
                  fontSize: 13,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f1f5f9')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#fff')}
              >
                <strong style={{ color: '#16a34a' }}>{item.name}</strong>
                {item.pharmaceuticalForm && <span style={{ color: '#64748b', marginLeft: 6 }}>({item.pharmaceuticalForm})</span>}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

import React, { useCallback, useEffect, useState } from 'react';
import { useSession } from '../context/session-context.js';
import { createDiagnosesApi, type CidItem } from '../lib/diagnoses-api.js';

interface Props {
  onSelect: (item: CidItem) => void;
  selectedItem: CidItem | null;
  onClear?: () => void;
}

export const CidSearchInput: React.FC<Props> = ({ onSelect, selectedItem, onClear }) => {
  const { api } = useSession();
  const diagnosesApi = createDiagnosesApi(api);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<readonly CidItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const performSearch = useCallback(
    async (searchTerm: string) => {
      setLoading(true);
      try {
        const items = await diagnosesApi.searchCid(searchTerm);
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
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', backgroundColor: '#e0f2fe', border: '1px solid #0284c7', borderRadius: 4 }}>
        <span style={{ fontWeight: 'bold', color: '#0369a1' }}>[{selectedItem.code}]</span>
        <span style={{ color: '#0f172a' }}>{selectedItem.description}</span>
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
        placeholder="Digite o código (ex: J18.9) ou descrição da doença..."
        style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc' }}
      />

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            maxHeight: 200,
            overflowY: 'auto',
            backgroundColor: '#fff',
            border: '1px solid #ccc',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            zIndex: 100,
            borderRadius: '0 0 4px 4px',
          }}
        >
          {loading ? (
            <div style={{ padding: 10, fontSize: 13, color: '#64748b' }}>Buscando no catálogo CID-10...</div>
          ) : results.length === 0 ? (
            <div style={{ padding: 10, fontSize: 13, color: '#64748b' }}>Nenhum CID encontrado.</div>
          ) : (
            results.map((item) => (
              <div
                key={item.code}
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
                <strong style={{ color: '#2563eb' }}>{item.code}</strong> - {item.description}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

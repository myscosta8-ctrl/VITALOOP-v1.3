import React, { useState } from 'react';
import { issueClinicalDocument, revokeClinicalDocument } from '../lib/document-api.js';

interface ClinicalDocumentModalProps {
  encounterId: string;
  onSuccess?: () => void;
}

export const ClinicalDocumentModal: React.FC<ClinicalDocumentModalProps> = ({ encounterId, onSuccess }) => {
  const [docType, setDocType] = useState<'medical_certificate' | 'attendance_declaration' | 'companion_certificate'>('medical_certificate');
  const [title, setTitle] = useState('Atestado Médico de Afastamento');
  const [content, setContent] = useState('Atesto que o paciente necessita de afastamento por motivo de saúde.');
  const [daysOff, setDaysOff] = useState(3);
  const [includeCid, setIncludeCid] = useState(false);
  const [cidCode, setCidCode] = useState('J06.9');
  const [companionName, setCompanionName] = useState('');
  const [msg, setMsg] = useState('');
  const [createdDocId, setCreatedDocId] = useState('');
  const [revokeReason, setRevokeReason] = useState('');

  const handleIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await issueClinicalDocument(encounterId, {
        documentType: docType,
        title,
        content,
        daysOff: docType === 'medical_certificate' ? Number(daysOff) : undefined,
        includeCid: docType === 'medical_certificate' ? includeCid : undefined,
        cidCode: docType === 'medical_certificate' && includeCid ? cidCode : undefined,
        companionName: docType === 'companion_certificate' ? companionName : undefined,
      });
      setCreatedDocId(res.data.id);
      setMsg(`Documento emitido com sucesso! Hash: ${res.data.integrityHash?.slice(0, 8)}...`);
      if (onSuccess) onSuccess();
    } catch (err: unknown) {
      setMsg((err as Error).message);
    }
  };

  const handleRevoke = async () => {
    try {
      await revokeClinicalDocument(createdDocId, revokeReason || 'Cancelamento por solicitação do emitente');
      setMsg('Documento revogado com sucesso.');
    } catch (err: unknown) {
      setMsg((err as Error).message);
    }
  };

  return (
    <div data-testid="clinical-document-modal">
      <h3>Emissão de Documentos Clínicos (Atestados / Declarações)</h3>
      {msg && <p data-testid="doc-msg">{msg}</p>}

      <form onSubmit={handleIssue} data-testid="issue-doc-form">
        <label>
          Tipo de Documento:
          <select
            value={docType}
            onChange={(e) => {
              const t = e.target.value as typeof docType;
              setDocType(t);
              if (t === 'medical_certificate') setTitle('Atestado Médico de Afastamento');
              if (t === 'attendance_declaration') setTitle('Declaração de Comparecimento');
              if (t === 'companion_certificate') setTitle('Atestado de Acompanhante');
            }}
          >
            <option value="medical_certificate">Atestado Médico (DOC-001)</option>
            <option value="attendance_declaration">Declaração de Comparecimento (DOC-002)</option>
            <option value="companion_certificate">Atestado de Acompanhante (DOC-003)</option>
          </select>
        </label>

        <label>
          Título:
          <input value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>

        <label>
          Conteúdo:
          <textarea value={content} onChange={(e) => setContent(e.target.value)} />
        </label>

        {docType === 'medical_certificate' && (
          <>
            <label>
              Dias de Afastamento:
              <input type="number" value={daysOff} onChange={(e) => setDaysOff(Number(e.target.value))} />
            </label>
            <label>
              <input type="checkbox" checked={includeCid} onChange={(e) => setIncludeCid(e.target.checked)} />
              Incluir CID-10 (com consentimento do paciente)
            </label>
            {includeCid && (
              <input placeholder="Código CID" value={cidCode} onChange={(e) => setCidCode(e.target.value)} />
            )}
          </>
        )}

        {docType === 'companion_certificate' && (
          <label>
            Nome do Acompanhante:
            <input value={companionName} onChange={(e) => setCompanionName(e.target.value)} />
          </label>
        )}

        <button type="submit" data-testid="issue-btn">Emitir Documento</button>
      </form>

      {createdDocId && (
        <div data-testid="revoke-section">
          <h4>Revogação / Cancelamento (DOC-008)</h4>
          <input
            placeholder="Motivo da Revogação (min 10 chars)"
            value={revokeReason}
            onChange={(e) => setRevokeReason(e.target.value)}
          />
          <button type="button" onClick={handleRevoke} data-testid="revoke-btn">Revogar Documento</button>
        </div>
      )}
    </div>
  );
};

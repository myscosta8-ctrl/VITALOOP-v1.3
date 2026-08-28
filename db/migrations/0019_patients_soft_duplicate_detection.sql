-- =====================================================================
-- VITALOOP 1.3 — Migration 0019 (Fase 2, Etapa 1/6)
-- Correção de design encontrada via teste real: CPF/CNS possuíam UNIQUE
-- rígido no banco, tornando IMPOSSÍVEL o cenário de "conflito" (mesmo
-- CPF/CNS, nome diferente) que app.detect_patient_duplicates() foi
-- desenhada para detectar — a segunda inserção sempre era rejeitada antes
-- da função de duplicidade rodar.
--
-- Isso contradiz Doc 1 §11 ("confirmação antes de criar provável
-- duplicado" — implica fluxo de CONFIRMAÇÃO, não bloqueio silencioso do
-- banco) e a instrução explícita da Etapa 1/6 da Fase 2: distinguir
-- "correspondência forte / possível duplicidade / conflito de identidade"
-- e NUNCA fazer merge automático — um bloqueio rígido de banco é, na
-- prática, uma forma de decisão automática (impede o cadastro sem revisão
-- humana), o oposto do que foi pedido.
--
-- Correção: substitui os índices UNIQUE por índices normais (mantém
-- performance de busca), preservando os CHECK de formato. A prevenção de
-- duplicidade passa a ser inteiramente responsabilidade de
-- app.detect_patient_duplicates() + confirmação humana na API/frontend.
--
-- Aditiva; não edita 0001-0018.
-- =====================================================================

drop index app.patients_cpf_uk;
drop index app.patients_cns_uk;

create index patients_cpf_idx on app.patients(cpf) where cpf is not null;
create index patients_cns_idx on app.patients(cns) where cns is not null;

comment on column app.patients.cpf is 'Armazenado normalizado (somente dígitos). Ausência é permitida — Doc 1 §11. NÃO é UNIQUE no banco: duplicidade é detectada por app.detect_patient_duplicates() e exige confirmação humana (Doc 1 §11), não bloqueio automático.';
comment on column app.patients.cns is 'Armazenado normalizado (somente dígitos, 15 dígitos). NÃO é UNIQUE no banco — mesmo motivo do CPF.';

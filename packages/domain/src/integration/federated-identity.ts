import { AppError, ErrorCategory } from '@vitaloop/shared';

export interface IdpConfigInput {
  providerType: 'oidc' | 'oauth2' | 'saml2';
  providerName: string;
  clientId: string;
}

export function validateIdentityProviderConfig(input: IdpConfigInput): void {
  if (!input.providerName || input.providerName.trim().length < 3) {
    throw new AppError({
      category: ErrorCategory.VALIDATION,
      code: 'INVALID_IDP_NAME',
      message: 'Nome do Provedor de Identidade Corporativo inválido.',
    });
  }

  if (!input.clientId || input.clientId.trim().length < 4) {
    throw new AppError({
      category: ErrorCategory.VALIDATION,
      code: 'INVALID_CLIENT_ID',
      message: 'Client ID do Provedor de Identidade é obrigatório.',
    });
  }
}

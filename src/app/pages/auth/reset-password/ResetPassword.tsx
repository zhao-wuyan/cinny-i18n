import { Box, Text } from 'folds';
import React, { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getLoginPath, withSearchParam } from '../../pathUtils';
import { useAuthServer } from '../../../hooks/useAuthServer';
import { PasswordResetForm } from './PasswordResetForm';
import { ResetPasswordPathSearchParams } from '../../paths';

const useResetPasswordSearchParams = (
  searchParams: URLSearchParams
): ResetPasswordPathSearchParams =>
  useMemo(
    () => ({
      email: searchParams.get('email') ?? undefined,
    }),
    [searchParams]
  );

export function ResetPassword() {
  const { t } = useTranslation();
  const server = useAuthServer();
  const [searchParams] = useSearchParams();
  const addAccount = searchParams.get('addAccount') === '1';
  const resetPasswordSearchParams = useResetPasswordSearchParams(searchParams);

  return (
    <Box direction="Column" gap="500">
      <Text size="H2" priority="400">
        {t('pages:auth.reset-password.reset_password')}
      </Text>
      <PasswordResetForm defaultEmail={resetPasswordSearchParams.email} />
      <span data-spacing-node />

      <Text align="Center">
        {t('pages:auth.reset-password.remember_your_password')}{' '}
        <Link
          to={
            addAccount ? withSearchParam(getLoginPath(server), { addAccount: '1' }) : getLoginPath(server)
          }
        >
          {t('pages:auth.reset-password.login')}
        </Link>
      </Text>
    </Box>
  );
}

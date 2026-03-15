import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Button,
  Chip,
  config,
  Dialog,
  Header,
  Icon,
  IconButton,
  Icons,
  Overlay,
  OverlayBackdrop,
  OverlayCenter,
  Text,
} from 'folds';
import FocusTrap from 'focus-trap-react';
import { useNavigate } from 'react-router-dom';
import { SequenceCard } from '../../../components/sequence-card';
import { SequenceCardStyle } from '../styles.css';
import { SettingTile } from '../../../components/setting-tile';
import { stopPropagation } from '../../../utils/keyboard';
import { useClientConfig } from '../../../hooks/useClientConfig';
import { getHomePath, getLoginPath, getOriginBaseUrl, withOriginBaseUrl, withSearchParam } from '../../../pages/pathUtils';
import {
  Session,
  getActiveSessionId,
  getSessionId,
  getSessions,
  removeSession,
  setActiveSessionId,
} from '../../../state/sessions';

export function AccountSwitcher() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { hashRouter } = useClientConfig();
  const [removeTarget, setRemoveTarget] = useState<Session>();

  const [sessions, setSessions] = useState(() => getSessions());
  const activeSessionId = getActiveSessionId();

  const homeUrl = useMemo(
    () => withOriginBaseUrl(getOriginBaseUrl(hashRouter), getHomePath()),
    [hashRouter]
  );

  const refreshSessions = useCallback(() => {
    setSessions(getSessions());
  }, []);

  const handleAddAccount = () => {
    navigate(withSearchParam(getLoginPath(), { addAccount: '1' }));
  };

  const handleSwitchAccount = (session: Session) => {
    setActiveSessionId(getSessionId(session));
    // 切换账号时，先落到安全路由（避免把旧 roomId/spaceId 残留到新账号），再触发完整 reload。
    window.location.replace(homeUrl);
  };

  const handleRemoveAccount = (session: Session) => {
    setRemoveTarget(session);
  };

  const handleConfirmRemove = () => {
    if (!removeTarget) return;
    const sessionId = getSessionId(removeTarget);
    const wasActive = activeSessionId === sessionId;
    removeSession(sessionId);
    setRemoveTarget(undefined);

    if (wasActive) {
      window.location.replace(homeUrl);
      return;
    }

    refreshSessions();
  };

  const rows = useMemo(() => {
    if (sessions.length === 0) return [];
    return sessions.map((session) => {
      const sessionId = getSessionId(session);
      const current = activeSessionId === sessionId;
      return {
        session,
        sessionId,
        current,
      };
    });
  }, [sessions, activeSessionId]);

  return (
    <Box direction="Column" gap="100">
      <Text size="L400">{t('features:settings.account.account_switcher')}</Text>
      <SequenceCard
        className={SequenceCardStyle}
        variant="SurfaceVariant"
        direction="Column"
        gap="400"
      >
        {rows.map(({ session, sessionId, current }) => (
          <SettingTile
            key={sessionId}
            title={session.userId}
            description={session.baseUrl}
            after={
              <Box gap="200" alignItems="Center">
                {current ? (
                  <Chip variant="Secondary" radii="Pill">
                    <Text size="T200">{t('features:settings.account.current')}</Text>
                  </Chip>
                ) : (
                  <Button
                    size="300"
                    variant="Secondary"
                    fill="Soft"
                    radii="300"
                    outlined
                    onClick={() => handleSwitchAccount(session)}
                  >
                    <Text size="B300">{t('features:settings.account.switch')}</Text>
                  </Button>
                )}
                <Button
                  size="300"
                  variant="Critical"
                  fill="None"
                  radii="300"
                  outlined
                  onClick={() => handleRemoveAccount(session)}
                >
                  <Text size="B300">{t('components:remove')}</Text>
                </Button>
              </Box>
            }
          />
        ))}

        <SettingTile
          title={t('features:settings.account.add_account')}
          description={t('features:settings.account.add_account_desc')}
          after={
            <Button
              size="300"
              variant="Secondary"
              fill="Soft"
              radii="300"
              outlined
              onClick={handleAddAccount}
            >
              <Text size="B300">{t('features:settings.account.add_account')}</Text>
            </Button>
          }
        />
      </SequenceCard>

      {removeTarget && (
        <Overlay open backdrop={<OverlayBackdrop />}>
          <OverlayCenter>
            <FocusTrap
              focusTrapOptions={{
                initialFocus: false,
                onDeactivate: () => setRemoveTarget(undefined),
                clickOutsideDeactivates: true,
                escapeDeactivates: stopPropagation,
              }}
            >
              <Dialog variant="Surface">
                <Header
                  style={{
                    padding: `0 ${config.space.S200} 0 ${config.space.S400}`,
                    borderBottomWidth: config.borderWidth.B300,
                  }}
                  variant="Surface"
                  size="500"
                >
                  <Box grow="Yes">
                    <Text size="H4">{t('features:settings.account.remove_account')}</Text>
                  </Box>
                  <IconButton size="300" onClick={() => setRemoveTarget(undefined)} radii="300">
                    <Icon src={Icons.Cross} />
                  </IconButton>
                </Header>
                <Box style={{ padding: config.space.S400 }} direction="Column" gap="400">
                  <Text priority="400">
                    {t('features:settings.account.remove_account_confirm', {
                      userId: removeTarget.userId,
                    })}
                  </Text>
                  <Box direction="Column" gap="200">
                    <Button variant="Critical" onClick={handleConfirmRemove}>
                      <Text size="B400">{t('components:remove')}</Text>
                    </Button>
                    <Button
                      variant="Secondary"
                      fill="Soft"
                      onClick={() => setRemoveTarget(undefined)}
                    >
                      <Text size="B400">{t('components:cancel')}</Text>
                    </Button>
                  </Box>
                </Box>
              </Dialog>
            </FocusTrap>
          </OverlayCenter>
        </Overlay>
      )}
    </Box>
  );
}

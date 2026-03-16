import React, { MouseEventHandler, useCallback, useEffect, useState } from 'react';
import { Box, Header, Icon, Icons, Menu, MenuItem, PopOut, RectCords, Text, config, toRem } from 'folds';
import FocusTrap from 'focus-trap-react';
import { useTranslation } from 'react-i18next';
import { SidebarAvatar, SidebarItem, SidebarItemTooltip } from '../../../components/sidebar';
import { stopPropagation } from '../../../utils/keyboard';
import { getOriginBaseUrl, withOriginBaseUrl, withSearchParam } from '../../pathUtils';
import {
  Session,
  getActiveSessionId,
  getSessionId,
  getSessions,
  MATRIX_SESSIONS_UPDATED_EVENT,
  setActiveSessionId,
} from '../../../state/sessions';

const stripUrlScheme = (url: string): string => url.replace(/^https?:\/\//, '');

export function AccountSwitchTab() {
  const { t } = useTranslation();

  const [sessions, setSessions] = useState(() => getSessions());
  const activeSessionId = getActiveSessionId();

  const [menuAnchor, setMenuAnchor] = useState<RectCords>();
  const open = !!menuAnchor;

  const refreshSessions = useCallback(() => {
    setSessions(getSessions());
  }, []);

  useEffect(() => {
    const handleSessionsUpdated = () => refreshSessions();
    window.addEventListener(MATRIX_SESSIONS_UPDATED_EVENT, handleSessionsUpdated);
    window.addEventListener('storage', handleSessionsUpdated);
    return () => {
      window.removeEventListener(MATRIX_SESSIONS_UPDATED_EVENT, handleSessionsUpdated);
      window.removeEventListener('storage', handleSessionsUpdated);
    };
  }, [refreshSessions]);

  useEffect(() => {
    if (sessions.length <= 1 && open) setMenuAnchor(undefined);
  }, [sessions.length, open]);

  if (sessions.length <= 1) return null;

  const handleToggle: MouseEventHandler<HTMLButtonElement> = (evt) => {
    const cords = evt.currentTarget.getBoundingClientRect();
    setMenuAnchor((currentState) => {
      if (currentState) return undefined;
      refreshSessions();
      return cords;
    });
  };

  const handleSwitchAccount = (session: Session) => {
    setActiveSessionId(getSessionId(session));
    const safeRootUrl = withOriginBaseUrl(getOriginBaseUrl(), '/');
    const safeReloadUrl = withSearchParam(safeRootUrl, { reload: Date.now().toString() });
    window.location.replace(safeReloadUrl);
  };

  return (
    <SidebarItem active={open}>
      <SidebarItemTooltip tooltip={t('pages:client.sidebar.switch_account')}>
        {(triggerRef) => (
          <SidebarAvatar as="button" ref={triggerRef} outlined onClick={handleToggle} aria-pressed={open}>
            <Icon src={Icons.ArrowUpDown} filled={open} />
          </SidebarAvatar>
        )}
      </SidebarItemTooltip>
      {menuAnchor && (
        <PopOut
          anchor={menuAnchor}
          position="Right"
          align="Start"
          content={
            <FocusTrap
              focusTrapOptions={{
                initialFocus: false,
                returnFocusOnDeactivate: false,
                onDeactivate: () => setMenuAnchor(undefined),
                clickOutsideDeactivates: true,
                isKeyForward: (evt: KeyboardEvent) => evt.key === 'ArrowDown',
                isKeyBackward: (evt: KeyboardEvent) => evt.key === 'ArrowUp',
                escapeDeactivates: stopPropagation,
              }}
            >
              <Menu style={{ maxWidth: toRem(340), width: '100vw' }}>
                <Header
                  size="300"
                  style={{
                    padding: `0 ${config.space.S200}`,
                    borderBottomWidth: config.borderWidth.B300,
                  }}
                >
                  <Text size="L400">{t('pages:client.sidebar.switch_account')}</Text>
                </Header>
                <Box direction="Column" gap="100" style={{ padding: config.space.S100 }}>
                  {sessions.map((session) => {
                    const sessionId = getSessionId(session);
                    const current = activeSessionId === sessionId;
                    return (
                      <MenuItem
                        key={sessionId}
                        size="300"
                        radii="300"
                        aria-pressed={current}
                        disabled={current}
                        onClick={() => handleSwitchAccount(session)}
                        after={current ? <Icon size="100" src={Icons.Check} /> : undefined}
                        style={{
                          height: 'auto',
                          padding: `${config.space.S200} ${config.space.S200}`,
                        }}
                      >
                        <Box direction="Column" gap="0" grow="Yes">
                          <Text as="span" size="T300" truncate title={session.userId}>
                            {session.userId}
                          </Text>
                          <Text as="span" size="T200" priority="300" truncate title={session.baseUrl}>
                            {stripUrlScheme(session.baseUrl)}
                          </Text>
                        </Box>
                      </MenuItem>
                    );
                  })}
                </Box>
              </Menu>
            </FocusTrap>
          }
        />
      )}
    </SidebarItem>
  );
}

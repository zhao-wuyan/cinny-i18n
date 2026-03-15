import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Text,
  IconButton,
  Icon,
  Icons,
  Scroll,
  Button,
  config,
  toRem,
  Overlay,
  OverlayBackdrop,
  OverlayCenter,
  Dialog,
  Header,
} from 'folds';
import FocusTrap from 'focus-trap-react';
import { Page, PageContent, PageHeader } from '../../../components/page';
import { SequenceCard } from '../../../components/sequence-card';
import { SequenceCardStyle } from '../styles.css';
import { SettingTile } from '../../../components/setting-tile';
import CinnySVG from '../../../../../public/res/svg/cinny.svg';
import { clearCacheAndReload, clearLoginData } from '../../../../client/initMatrix';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { stopPropagation } from '../../../utils/keyboard';

type AboutProps = {
  requestClose: () => void;
};
export function About({ requestClose }: AboutProps) {
  const { t } = useTranslation();
  const mx = useMatrixClient();
  const [resetOpen, setResetOpen] = useState(false);

  return (
    <Page>
      <PageHeader outlined={false}>
        <Box grow="Yes" gap="200">
          <Box grow="Yes" alignItems="Center" gap="200">
            <Text size="H3" truncate>
              {t('features:settings.about.about')}
            </Text>
          </Box>
          <Box shrink="No">
            <IconButton onClick={requestClose} variant="Surface">
              <Icon src={Icons.Cross} />
            </IconButton>
          </Box>
        </Box>
      </PageHeader>
      <Box grow="Yes">
        <Scroll hideTrack visibility="Hover">
          <PageContent>
            <Box direction="Column" gap="700">
              <Box gap="400">
                <Box shrink="No">
                  <img
                    style={{ width: toRem(60), height: toRem(60) }}
                    src={CinnySVG}
                    alt="Cinny logo"
                  />
                </Box>
                <Box direction="Column" gap="300">
                  <Box direction="Column" gap="100">
                    <Box gap="100" alignItems="End">
                      <Text size="H3">Cinny</Text>
                      <Text size="T200">v4.11.1</Text>
                    </Box>
                    <Text>{t('features:settings.about.yet_another_matrix')}</Text>
                  </Box>

                  <Box gap="200" wrap="Wrap">
                    <Button
                      as="a"
                      href="https://github.com/cinnyapp/cinny"
                      rel="noreferrer noopener"
                      target="_blank"
                      variant="Secondary"
                      fill="Soft"
                      size="300"
                      radii="300"
                      before={<Icon src={Icons.Code} size="100" filled />}
                    >
                      <Text size="B300">{t('features:settings.about.source_code')}</Text>
                    </Button>
                    <Button
                      as="a"
                      href="https://cinny.in/#sponsor"
                      rel="noreferrer noopener"
                      target="_blank"
                      variant="Critical"
                      fill="Soft"
                      size="300"
                      radii="300"
                      before={<Icon src={Icons.Heart} size="100" filled />}
                    >
                      <Text size="B300">{t('features:settings.about.support')}</Text>
                    </Button>
                  </Box>
                </Box>
              </Box>
              <Box direction="Column" gap="100">
                <Text size="L400">{t('features:settings.about.options')}</Text>
                <SequenceCard
                  className={SequenceCardStyle}
                  variant="SurfaceVariant"
                  direction="Column"
                  gap="400"
                >
                  <SettingTile
                    title={t('features:settings.about.clear_cache_reload')}
                    description={t('features:settings.about.clear_all_your_locally_stored')}
                    after={
                      <Button
                        onClick={() => clearCacheAndReload(mx)}
                        variant="Secondary"
                        fill="Soft"
                        size="300"
                        radii="300"
                        outlined
                      >
                        <Text size="B300">{t('features:settings.about.clear_cache')}</Text>
                      </Button>
                    }
                  />
                  <SettingTile
                    title={t('features:settings.about.reset_app')}
                    description={t('features:settings.about.reset_app_desc')}
                    after={
                      <Button
                        onClick={() => setResetOpen(true)}
                        variant="Critical"
                        fill="None"
                        size="300"
                        radii="300"
                        outlined
                      >
                        <Text size="B300">{t('components:reset')}</Text>
                      </Button>
                    }
                  />
                </SequenceCard>
              </Box>
              <Box direction="Column" gap="100">
                <Text size="L400">{t('features:settings.about.credits')}</Text>
                <SequenceCard
                  className={SequenceCardStyle}
                  variant="SurfaceVariant"
                  direction="Column"
                  gap="400"
                >
                  <Box
                    as="ul"
                    direction="Column"
                    gap="200"
                    style={{
                      margin: 0,
                      paddingLeft: config.space.S400,
                    }}
                  >
                    <li>
                      <Text
                        size="T300"
                        dangerouslySetInnerHTML={{ __html: t('features:settings.about.the_matrix_js_sdk') }}
                      />
                    </li>
                    <li>
                      <Text
                        size="T300"
                        dangerouslySetInnerHTML={{ __html: t('features:settings.about.the_twemoji_colr') }}
                      />
                    </li>
                    <li>
                      <Text
                        size="T300"
                        dangerouslySetInnerHTML={{ __html: t('features:settings.about.the_twemoji') }}
                      />
                    </li>
                    <li>
                      <Text
                        size="T300"
                        dangerouslySetInnerHTML={{ __html: t('features:settings.about.the_material_sound') }}
                      />
                    </li>
                  </Box>
                </SequenceCard>
              </Box>
            </Box>
          </PageContent>
        </Scroll>
      </Box>
      {resetOpen && (
        <Overlay open backdrop={<OverlayBackdrop />}>
          <OverlayCenter>
            <FocusTrap
              focusTrapOptions={{
                initialFocus: false,
                onDeactivate: () => setResetOpen(false),
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
                    <Text size="H4">{t('features:settings.about.reset_app')}</Text>
                  </Box>
                  <IconButton size="300" onClick={() => setResetOpen(false)} radii="300">
                    <Icon src={Icons.Cross} />
                  </IconButton>
                </Header>
                <Box style={{ padding: config.space.S400 }} direction="Column" gap="400">
                  <Text priority="400">{t('features:settings.about.reset_app_confirm')}</Text>
                  <Box direction="Column" gap="200">
                    <Button variant="Critical" onClick={() => clearLoginData()}>
                      <Text size="B400">{t('components:reset')}</Text>
                    </Button>
                    <Button
                      variant="Secondary"
                      fill="Soft"
                      onClick={() => setResetOpen(false)}
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
    </Page>
  );
}

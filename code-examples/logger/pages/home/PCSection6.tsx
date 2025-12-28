import { AnimateStack, rally } from '@ix/interaction';
import { colors } from '@tds/colors';
import { Button, List, Tab, Txt } from '@tds/desktop';
import { Asset } from '@tds/mobile';
import { Spacing } from '@tossteam/emotion-utils';
import { AnimationOnImpression } from 'components/AnimationOnImpression';
import Link from 'next/link';
import { homeLogger, LABEL, SECTION_TYPE } from 'pages/home/logger';
import type { ComponentProps } from 'react';
import { IMAGE, LINK, TEXT } from './constants';

export function PCSection6() {
  return (
    <div css={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: 845 }}>
      <Spacing size={100} />
      <AnimationOnImpression areaThreshold={0} timeThreshold={0}>
        {(play) => (
          <AnimateStack delay={0.8} motion={rally.slide({ type: 'in', direction: 'up', speed: 'slow' })} play={play}>
            <Txt typography="h4" style={{ textAlign: 'center' }}>
              요즘 사장님들이 사용하시는
              <br />
              인기있는 단말기
            </Txt>
            <Spacing size={40} />

            <Tab defaultValue="1" size="large" fit={true}>
              <Tab.List>
                <Tab.Item rightAddon={<Tab.ItemBadge theme="blue">판매 1위</Tab.ItemBadge>} value="1">
                  프론트
                </Tab.Item>
                <Tab.ItemSeparator />
                <Tab.Item value="2">태블릿 세트</Tab.Item>
                <Tab.ItemSeparator />
                <Tab.Item
                  value="3"
                  rightAddon={
                    <Tab.ItemBadge theme="yellow" variant="weak">
                      NEW
                    </Tab.ItemBadge>
                  }
                >
                  로봇 바텐더
                </Tab.Item>
              </Tab.List>
              <Tab.Content value="1" css={{ width: 680 }}>
                <Spacing size={60} />
                <div css={{ display: 'flex', gap: 60 }}>
                  <Asset.Image
                    frameShape={Asset.frameShape.CleanW250}
                    backgroundColor="transparent"
                    src={IMAGE.FRONT}
                    aria-hidden={true}
                    style={{ aspectRatio: '125/207' }}
                  />

                  <div css={{ display: 'flex', flexDirection: 'column' }}>
                    <Txt typography="h5" color={colors.grey800} fontWeight="semibold">
                      {TEXT.FRONT.TITLE} <span style={{ color: colors.blue500 }}>{TEXT.FRONT.HIGHLIGHT}</span>
                    </Txt>
                    <Spacing size={20} />
                    <List size="xlarge">
                      <ListItem title={TEXT.FRONT.FEATURES[0]} />
                      <ListItem title={TEXT.FRONT.FEATURES[1]} />
                      <ListItem title={TEXT.FRONT.FEATURES[2]} />
                      <ListItem title={TEXT.FRONT.FEATURES[3]} />
                      <ListItem title={TEXT.FRONT.FEATURES[4]} />
                    </List>
                    <Spacing size={32} />
                    <MoreButton
                      {...LINK.더_알아보기}
                      onClick={() => {
                        homeLogger.logClick({
                          section_type: SECTION_TYPE.더_알아보기,
                          label: LABEL.더_알아보기_프론트,
                        });
                      }}
                    />
                  </div>
                </div>
              </Tab.Content>
              <Tab.Content value="2" css={{ width: 680 }}>
                <Spacing size={60} />
                <div css={{ display: 'flex', gap: 60 }}>
                  <Asset.Image
                    frameShape={Asset.frameShape.CleanW250}
                    backgroundColor="transparent"
                    src={IMAGE.TERMINAL}
                    aria-hidden={true}
                    style={{ aspectRatio: '50/37' }}
                  />

                  <div css={{ display: 'flex', flexDirection: 'column' }}>
                    <Txt typography="h5" color={colors.grey800} fontWeight="semibold">
                      시작하는 사장님을 위한
                      <span style={{ color: colors.blue500 }}> 태블릿 세트</span>
                    </Txt>
                    <Spacing size={20} />
                    <List size="xlarge">
                      <ListItem title={TEXT.TABLET_SET.FEATURES[0]} />
                      <ListItem title={TEXT.TABLET_SET.FEATURES[1]} />
                      <ListItem title={TEXT.TABLET_SET.FEATURES[2]} />
                      <ListItem title={TEXT.TABLET_SET.FEATURES[3]} />
                    </List>
                    <Spacing size={32} />
                    <MoreButton
                      {...LINK.더_알아보기}
                      onClick={() => {
                        homeLogger.logClick({
                          section_type: SECTION_TYPE.더_알아보기,
                          label: LABEL.더_알아보기_태블릿_세트,
                        });
                      }}
                    />
                  </div>
                </div>
              </Tab.Content>
              <Tab.Content value="3" css={{ width: 680 }}>
                <Spacing size={60} />
                <div css={{ display: 'flex', gap: 60 }}>
                  <Asset.Image
                    frameShape={Asset.frameShape.CleanW250}
                    backgroundColor="transparent"
                    src={IMAGE.ROBOT}
                    aria-hidden={true}
                    style={{ aspectRatio: '125/207' }}
                  />

                  <div css={{ display: 'flex', flexDirection: 'column' }}>
                    <Txt typography="h5" color={colors.grey800} fontWeight="semibold">
                      No.1 솔루션
                      <span style={{ color: colors.blue500 }}> 리피즈 로봇 바텐더</span>
                    </Txt>
                    <Spacing size={20} />
                    <List size="xlarge">
                      <ListItem title={TEXT.ROBOT_BARISTA.FEATURES[0]} />
                      <ListItem title={TEXT.ROBOT_BARISTA.FEATURES[1]} />
                      <ListItem title={TEXT.ROBOT_BARISTA.FEATURES[2]} />
                      <ListItem title={TEXT.ROBOT_BARISTA.FEATURES[3]} />
                    </List>
                    <Spacing size={32} />
                    <MoreButton
                      {...LINK.더_알아보기}
                      onClick={() => {
                        homeLogger.logClick({
                          section_type: SECTION_TYPE.더_알아보기,
                          label: LABEL.더_알아보기_로봇_바텐더,
                        });
                      }}
                    />
                  </div>
                </div>
              </Tab.Content>
            </Tab>
          </AnimateStack>
        )}
      </AnimationOnImpression>
      <Spacing size={63} />
    </div>
  );
}

function ListItem({ title }: { title: string }) {
  return (
    <List.Item
      leftAddon={
        <List.AddonRoot>
          <List.ItemIcon name="icon-check" />
        </List.AddonRoot>
      }
      style={{
        paddingTop: 8,
        paddingBottom: 8,
        paddingLeft: 4,
        paddingRight: 4,
      }}
    >
      <List.ItemColumn>
        <List.ItemTitle color={colors.greyOpacity700} fontWeight="medium">
          {title}
        </List.ItemTitle>
      </List.ItemColumn>
    </List.Item>
  );
}

function MoreButton({ ...props }: ComponentProps<typeof Link>) {
  return (
    <Link {...props}>
      <Button
        size="xxlarge"
        fit={true}
        shape="round"
        variant="weak"
        theme="blue"
        rightAddon={<Button.Icon name="icon-arrow-right-sidebar-mono" />}
        css={{ width: 'fit-content' }}
      >
        더 알아보기
      </Button>
    </Link>
  );
}

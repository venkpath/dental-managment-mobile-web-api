import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const ACTIVE = '#4361EE';
const INACTIVE = '#94a3b8';

type TabConfig = {
  routeName: string;
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  iconFocused: React.ComponentProps<typeof Ionicons>['name'];
  /** WhatsApp uses brand green when active */
  brandColor?: string;
};

const TABS: TabConfig[] = [
  { routeName: 'Dashboard', label: 'Home', icon: 'home-outline', iconFocused: 'home' },
  { routeName: 'Patients', label: 'Patients', icon: 'people-outline', iconFocused: 'people' },
  { routeName: 'Appointments', label: 'Schedule', icon: 'calendar-outline', iconFocused: 'calendar' },
  { routeName: 'WhatsApp', label: 'Inbox', icon: 'chatbubbles-outline', iconFocused: 'chatbubbles', brandColor: '#25D366' },
  { routeName: 'Billing', label: 'More', icon: 'grid-outline', iconFocused: 'grid' },
];

export default function MainTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, 8);

  return (
    <View style={[s.bar, { paddingBottom: bottomPad }]}>
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const config = TABS.find((t) => t.routeName === route.name) ?? {
          routeName: route.name,
          label: route.name,
          icon: 'ellipse-outline' as const,
          iconFocused: 'ellipse' as const,
        };
        const color = focused
          ? (config.brandColor && route.name === 'WhatsApp' ? config.brandColor : ACTIVE)
          : INACTIVE;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (event.defaultPrevented) return;
          if (route.name === 'Billing') {
            navigation.navigate('Billing', { screen: 'MoreMenu' });
            return;
          }
          if (!focused) {
            navigation.navigate(route.name);
          }
        };

        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            style={s.tab}
            accessibilityRole="button"
            accessibilityState={focused ? { selected: true } : {}}
            accessibilityLabel={config.label}
          >
            <Ionicons
              name={focused ? config.iconFocused : config.icon}
              size={22}
              color={color}
            />
            <Text
              style={[s.label, { color }, focused && s.labelFocused]}
              numberOfLines={1}
              allowFontScaling={false}
            >
              {config.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 8,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 12,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 2,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 3,
    maxWidth: 72,
    textAlign: 'center',
  },
  labelFocused: {
    fontWeight: '700',
  },
});

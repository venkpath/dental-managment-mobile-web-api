import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { useAuthStore } from '../store/auth.store';

const DEFAULT_LOGO = require('../../assets/only_logo.png');

type Props = {
  size?: number;
};

/**
 * Clinic logo in drawer / headers: uploaded clinic image when set,
 * otherwise the Smart Dental Desk app mark (not a generic placeholder icon).
 */
export default function ClinicBrandMark({ size = 36 }: Props) {
  const clinicLogoUrl = useAuthStore((s) => s.clinicLogoUrl);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [clinicLogoUrl]);

  const showClinicLogo = !!clinicLogoUrl && !failed;

  return (
    <View style={[styles.wrap, { width: size, height: size, borderRadius: size * 0.28 }]}>
      {showClinicLogo ? (
        <Image
          source={{ uri: clinicLogoUrl }}
          style={{ width: size, height: size, borderRadius: size * 0.28 }}
          resizeMode="cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <Image
          source={DEFAULT_LOGO}
          style={{ width: size * 0.72, height: size * 0.72 }}
          resizeMode="contain"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});

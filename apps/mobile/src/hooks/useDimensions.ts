import { useState, useEffect } from 'react';
import { Dimensions, ScaledSize } from 'react-native';

interface DimensionsInfo {
  width: number;
  height: number;
  isLandscape: boolean;
  isTablet: boolean;
}

export function useDimensions(): DimensionsInfo {
  const [dims, setDims] = useState(() => {
    const { width, height } = Dimensions.get('window');
    return {
      width,
      height,
      isLandscape: width > height,
      isTablet: Math.min(width, height) >= 600,
    };
  });

  useEffect(() => {
    const handler = ({ window }: { window: ScaledSize }) => {
      setDims({
        width: window.width,
        height: window.height,
        isLandscape: window.width > window.height,
        isTablet: Math.min(window.width, window.height) >= 600,
      });
    };

    const subscription = Dimensions.addEventListener('change', handler);
    return () => subscription.remove();
  }, []);

  return dims;
}

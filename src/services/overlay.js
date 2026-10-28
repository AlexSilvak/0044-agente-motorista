import { registerPlugin } from '@capacitor/core';

const GigUOverlay = registerPlugin('GigUOverlay');

export async function toggleGigUOverlay(enable) {
  try {
    const { granted } = await GigUOverlay.checkPermission();
    
    if (!granted) {
      await GigUOverlay.requestPermission();
      return false;
    }

    if (enable) {
      await GigUOverlay.startOverlay();
    } else {
      await GigUOverlay.stopOverlay();
    }
    return true;
  } catch (err) {
    console.error("Erro ao alternar sobreposição:", err);
    return false;
  }
}
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '@/components/AppScreen';
import { LoadingScreen } from '@/components/LoadingScreen';
import { PageHeader } from '@/components/PageHeader';
import { PrimaryButton } from '@/components/PrimaryButton';
import { SurfaceCard } from '@/components/SurfaceCard';
import { useApp } from '@/context/AppProvider';
import { usePurchases } from '@/context/PurchaseProvider';
import { spacing } from '@/constants/theme';
import { useThemePreferences } from '@/context/ThemeProvider';
import { SHOP_CATALOG, getShopItemStatus } from '@/lib/shop';
import { createCommonStyles } from '@/styles/commonStyles';
import { ShopProductId } from '@/types/models';

export default function ShopScreen() {
  const { profile, shopInventory } = useApp();
  const { mode, products, purchaseItem, ready, restorePurchases } = usePurchases();
  const { theme } = useThemePreferences();
  const commonStyles = createCommonStyles(theme.colors);
  const [busyItem, setBusyItem] = useState<ShopProductId | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);

  if (!profile || !shopInventory) {
    return <LoadingScreen message="Loading the shop..." />;
  }

  async function handlePurchase(productId: ShopProductId) {
    setBusyItem(productId);
    const result = await purchaseItem(productId);
    setFeedback(result.message);
    setBusyItem(null);
  }

  async function handleRestorePurchases() {
    setRestoring(true);
    const result = await restorePurchases();
    setFeedback(result.message);
    setRestoring(false);
  }

  return (
    <AppScreen scrollable contentContainerStyle={commonStyles.pageStack}>
      <PageHeader
        eyebrow="Boosts"
        title="Shop"
        subtitle="Pick up streak saves and future boosts in one place. Real billing is ready for development builds, with a safe preview path in Expo Go."
      />

      <SurfaceCard style={commonStyles.noticeCard}>
        <Text style={commonStyles.noticeEyebrow}>{mode === 'revenuecat' ? 'Store connected' : 'Preview mode'}</Text>
        <Text style={commonStyles.noticeMessage}>
          {mode === 'revenuecat'
            ? 'Live store products can load here once RevenueCat and your app-store products are configured.'
            : 'Purchases use a mock flow until RevenueCat keys and native store setup are ready.'}
        </Text>
      </SurfaceCard>

      {feedback ? (
        <SurfaceCard>
          <Text style={commonStyles.cardCopy}>{feedback}</Text>
        </SurfaceCard>
      ) : null}

      <View style={commonStyles.compactSection}>
        {SHOP_CATALOG.map((item) => {
          const status = getShopItemStatus(item.id, shopInventory);
          const storeProduct = products[item.id];
          const priceLabel = storeProduct?.priceString ?? item.placeholderPrice;

          return (
            <SurfaceCard
              key={item.id}
              style={[
                styles.shopCard,
                status.disabled
                  ? {
                      backgroundColor: theme.colors.surfaceAlt,
                      opacity: 0.72,
                    }
                  : null,
              ]}
            >
              <View style={commonStyles.rowBetween}>
                <View style={commonStyles.listRowMeta}>
                  <Text style={commonStyles.cardTitle}>{item.title}</Text>
                  <Text style={commonStyles.cardCopy}>{item.description}</Text>
                </View>
                <Text style={[commonStyles.settingTitle, { color: theme.colors.primary }]}>{priceLabel}</Text>
              </View>

              <View style={styles.statusRow}>
                <View style={[commonStyles.badgePill, { backgroundColor: theme.colors.surfaceRaised }]}>
                  <Text style={commonStyles.badgeText}>{status.availabilityLabel}</Text>
                </View>
                <Text style={commonStyles.smallMuted}>{status.statusMessage}</Text>
              </View>

              <PrimaryButton
                disabled={status.disabled || busyItem === item.id || !ready}
                label={
                  busyItem === item.id
                    ? 'Working...'
                    : status.disabled
                      ? status.availabilityLabel
                      : item.id === 'premium_placeholder'
                        ? 'Unlock'
                        : 'Get boost'
                }
                onPress={() => handlePurchase(item.id)}
                variant={status.disabled ? 'secondary' : 'primary'}
              />
            </SurfaceCard>
          );
        })}
      </View>

      <PrimaryButton label={restoring ? 'Restoring...' : 'Restore purchases'} onPress={handleRestorePurchases} variant="secondary" disabled={restoring} />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  shopCard: {
    gap: spacing.md,
  },
  statusRow: {
    gap: spacing.sm,
  },
});

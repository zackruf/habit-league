import Purchases, { CustomerInfo, PurchasesStoreProduct } from 'react-native-purchases';
import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';

import { useApp } from '@/context/AppProvider';
import { PREMIUM_PLACEHOLDER_ENTITLEMENT, SHOP_PRODUCT_IDS, grantShopItem, syncPremiumPlaceholderOwnership } from '@/lib/shop';
import { ShopProductId } from '@/types/models';

type PurchaseResult = {
  ok: boolean;
  message: string;
};

type PurchaseContextValue = {
  ready: boolean;
  mode: 'mock' | 'revenuecat';
  products: Partial<Record<ShopProductId, PurchasesStoreProduct>>;
  purchaseItem: (productId: ShopProductId) => Promise<PurchaseResult>;
  restorePurchases: () => Promise<PurchaseResult>;
};

const PurchaseContext = createContext<PurchaseContextValue | undefined>(undefined);

export function PurchaseProvider({ children }: PropsWithChildren) {
  const { profile, saveProfile, session, shopInventory } = useApp();
  const [ready, setReady] = useState(false);
  const [mode, setMode] = useState<'mock' | 'revenuecat'>('mock');
  const [products, setProducts] = useState<Partial<Record<ShopProductId, PurchasesStoreProduct>>>({});

  const apiKey =
    Platform.OS === 'android'
      ? process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY
      : Platform.OS === 'ios'
        ? process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY
        : null;

  const applyCustomerInfo = useCallback(
    async (customerInfo: CustomerInfo) => {
      if (!profile || !shopInventory) {
        return;
      }

      const premiumOwned = Boolean(customerInfo.entitlements.active[PREMIUM_PLACEHOLDER_ENTITLEMENT]);
      const nextInventory = syncPremiumPlaceholderOwnership(shopInventory, premiumOwned);

      if (nextInventory.premiumPlaceholderOwned !== shopInventory.premiumPlaceholderOwned) {
        await saveProfile({ shopInventory: nextInventory });
      }
    },
    [profile, saveProfile, shopInventory]
  );

  useEffect(() => {
    let active = true;

    async function bootstrapRevenueCat() {
      if (!session || !profile || !apiKey || Platform.OS === 'web') {
        if (active) {
          setMode('mock');
          setProducts({});
          setReady(true);
        }
        return;
      }

      try {
        setReady(false);
        const configured = await Purchases.isConfigured();
        if (!configured) {
          Purchases.configure({ apiKey, appUserID: session.uid });
        } else {
          await Purchases.logIn(session.uid);
        }

        const storeProducts = await Purchases.getProducts(Object.values(SHOP_PRODUCT_IDS), Purchases.PRODUCT_CATEGORY.NON_SUBSCRIPTION);
        const mappedProducts = Object.entries(SHOP_PRODUCT_IDS).reduce<Partial<Record<ShopProductId, PurchasesStoreProduct>>>((next, [productId, storeId]) => {
          const found = storeProducts.find((product) => product.identifier === storeId);
          if (found) {
            next[productId as ShopProductId] = found;
          }
          return next;
        }, {});

        const customerInfo = await Purchases.getCustomerInfo();
        await applyCustomerInfo(customerInfo);

        if (active) {
          setProducts(mappedProducts);
          setMode('revenuecat');
          setReady(true);
        }
      } catch {
        if (active) {
          setMode('mock');
          setProducts({});
          setReady(true);
        }
      }
    }

    bootstrapRevenueCat();

    return () => {
      active = false;
    };
  }, [apiKey, applyCustomerInfo, profile, session]);

  const purchaseItem = useCallback(
    async (productId: ShopProductId) => {
      if (!profile || !shopInventory) {
        return { ok: false, message: 'No active profile.' };
      }

      if (mode !== 'revenuecat' || !products[productId]) {
        const nextInventory = grantShopItem(shopInventory, productId);
        await saveProfile({ shopInventory: nextInventory });
        return { ok: true, message: 'Preview purchase applied.' };
      }

      try {
        const result = await Purchases.purchaseStoreProduct(products[productId]!);
        await saveProfile({ shopInventory: grantShopItem(shopInventory, productId) });
        await applyCustomerInfo(result.customerInfo);
        return { ok: true, message: 'Purchase completed.' };
      } catch (error) {
        const cancelled = typeof error === 'object' && error !== null && 'userCancelled' in error && Boolean(error.userCancelled);
        return { ok: false, message: cancelled ? 'Purchase canceled.' : 'Purchase failed. Please try again.' };
      }
    },
    [applyCustomerInfo, mode, products, profile, saveProfile, shopInventory]
  );

  const restorePurchases = useCallback(async () => {
    if (mode !== 'revenuecat') {
      return { ok: true, message: 'Preview mode has no real store purchases to restore yet.' };
    }

    try {
      const customerInfo = await Purchases.restorePurchases();
      await applyCustomerInfo(customerInfo);
      return { ok: true, message: 'Purchases restored.' };
    } catch {
      return { ok: false, message: 'Could not restore purchases right now.' };
    }
  }, [applyCustomerInfo, mode]);

  const value = useMemo<PurchaseContextValue>(
    () => ({
      ready,
      mode,
      products,
      purchaseItem,
      restorePurchases,
    }),
    [mode, products, purchaseItem, ready, restorePurchases]
  );

  return <PurchaseContext.Provider value={value}>{children}</PurchaseContext.Provider>;
}

export function usePurchases() {
  const context = useContext(PurchaseContext);

  if (!context) {
    throw new Error('usePurchases must be used inside PurchaseProvider');
  }

  return context;
}

import { ShopInventory, ShopProductId } from '@/types/models';

export const SHOP_PRODUCT_IDS: Record<ShopProductId, string> = {
  restore_streak: 'boost_restore_streak',
  streak_freeze: 'boost_streak_freeze',
  premium_placeholder: 'premium_placeholder_unlock',
};

export const PREMIUM_PLACEHOLDER_ENTITLEMENT = 'premium_placeholder_access';

export const SHOP_CATALOG: Array<{
  id: ShopProductId;
  title: string;
  description: string;
  placeholderPrice: string;
}> = [
  {
    id: 'restore_streak',
    title: 'Restore streak',
    description: 'Save a broken streak with one second-chance restore.',
    placeholderPrice: '$1.99',
  },
  {
    id: 'streak_freeze',
    title: 'Streak freeze',
    description: 'Hold one miss without losing momentum on a future day.',
    placeholderPrice: '$0.99',
  },
  {
    id: 'premium_placeholder',
    title: 'Premium placeholder',
    description: 'Future premium unlock placeholder for member perks and extras.',
    placeholderPrice: '$4.99',
  },
];

const RESTORE_COOLDOWN_DAYS = 7;
const FREEZE_COOLDOWN_DAYS = 7;

export function getDefaultShopInventory(): ShopInventory {
  return {
    streakRestoreCredits: 0,
    streakRestoreCooldownUntil: null,
    streakFreezeCredits: 0,
    streakFreezeCooldownUntil: null,
    premiumPlaceholderOwned: false,
  };
}

export function normalizeShopInventory(shopInventory?: Partial<ShopInventory> | null): ShopInventory {
  return {
    ...getDefaultShopInventory(),
    ...shopInventory,
  };
}

export function grantShopItem(shopInventory: ShopInventory, productId: ShopProductId, now = new Date()) {
  const inventory = normalizeShopInventory(shopInventory);

  if (productId === 'restore_streak') {
    if (inventory.streakRestoreCredits > 0 || isFutureDate(inventory.streakRestoreCooldownUntil, now)) {
      return inventory;
    }

    return {
      ...inventory,
      streakRestoreCredits: 1,
    };
  }

  if (productId === 'streak_freeze') {
    if (inventory.streakFreezeCredits > 0 || isFutureDate(inventory.streakFreezeCooldownUntil, now)) {
      return inventory;
    }

    return {
      ...inventory,
      streakFreezeCredits: 1,
    };
  }

  return {
    ...inventory,
    premiumPlaceholderOwned: true,
  };
}

export function consumeRestoreStreak(shopInventory: ShopInventory, now = new Date()) {
  const inventory = normalizeShopInventory(shopInventory);
  return {
    ...inventory,
    streakRestoreCredits: Math.max(0, inventory.streakRestoreCredits - 1),
    streakRestoreCooldownUntil: addDaysToNow(now, RESTORE_COOLDOWN_DAYS),
  };
}

export function syncPremiumPlaceholderOwnership(shopInventory: ShopInventory, owned: boolean) {
  return {
    ...normalizeShopInventory(shopInventory),
    premiumPlaceholderOwned: owned || normalizeShopInventory(shopInventory).premiumPlaceholderOwned,
  };
}

export function getShopItemStatus(productId: ShopProductId, shopInventory: ShopInventory, now = new Date()) {
  const inventory = normalizeShopInventory(shopInventory);

  if (productId === 'restore_streak') {
    if (inventory.streakRestoreCredits > 0) {
      return {
        disabled: true,
        availabilityLabel: 'Ready to use',
        statusMessage: 'Use it from a streak restore card when a streak breaks.',
      };
    }

    if (isFutureDate(inventory.streakRestoreCooldownUntil, now)) {
      return {
        disabled: true,
        availabilityLabel: 'Cooldown active',
        statusMessage: formatCooldownMessage(inventory.streakRestoreCooldownUntil),
      };
    }

    return {
      disabled: false,
      availabilityLabel: 'Available now',
      statusMessage: 'Buy one restore credit to save a streak later.',
    };
  }

  if (productId === 'streak_freeze') {
    if (inventory.streakFreezeCredits > 0) {
      return {
        disabled: true,
        availabilityLabel: 'Held in inventory',
        statusMessage: 'Ready for a future miss once freeze logic goes live.',
      };
    }

    if (isFutureDate(inventory.streakFreezeCooldownUntil, now)) {
      return {
        disabled: true,
        availabilityLabel: 'Cooldown active',
        statusMessage: formatCooldownMessage(inventory.streakFreezeCooldownUntil),
      };
    }

    return {
      disabled: false,
      availabilityLabel: 'Available now',
      statusMessage: 'Preview purchase for a future freeze flow.',
    };
  }

  if (inventory.premiumPlaceholderOwned) {
    return {
      disabled: true,
      availabilityLabel: 'Unlocked',
      statusMessage: 'Restore purchases will preserve this unlock later on.',
    };
  }

  return {
    disabled: false,
    availabilityLabel: 'Available now',
    statusMessage: 'One-time unlock placeholder for future premium perks.',
  };
}

function isFutureDate(value: string | null, now: Date) {
  return Boolean(value && new Date(value).getTime() > now.getTime());
}

function addDaysToNow(now: Date, days: number) {
  const next = new Date(now);
  next.setDate(next.getDate() + days);
  return next.toISOString();
}

function formatCooldownMessage(value: string | null) {
  if (!value) {
    return 'Cooldown active';
  }

  const cooldownDate = new Date(value);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (cooldownDate.toDateString() === tomorrow.toDateString()) {
    return 'Available tomorrow';
  }

  return 'Already used this week';
}

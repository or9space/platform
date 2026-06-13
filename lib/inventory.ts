export const INVENTORY_CATEGORIES = [
  "WEAPON",
  "ARMOR",
  "SHIP_COMPONENT",
  "CONSUMABLE",
  "AMMO",
  "ATTACHMENT",
  "CONTAINER",
  "MISC",
] as const;

export const INVENTORY_KINDS = ["UNIQUE", "FUNGIBLE"] as const;

export const HOLDING_STATES = ["ACTIVE", "LOST", "DESTROYED", "RETIRED"] as const;

export type InventoryCategory = (typeof INVENTORY_CATEGORIES)[number];
export type InventoryKind = (typeof INVENTORY_KINDS)[number];
export type HoldingState = (typeof HOLDING_STATES)[number];

export const CATEGORY_LABELS: Record<InventoryCategory, string> = {
  WEAPON: "Weapon",
  ARMOR: "Armor",
  SHIP_COMPONENT: "Ship Component",
  CONSUMABLE: "Consumable",
  AMMO: "Ammo",
  ATTACHMENT: "Attachment",
  CONTAINER: "Container",
  MISC: "Misc",
};

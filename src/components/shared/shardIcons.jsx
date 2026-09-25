// Shared image URLs for Avatar Shard and Gear Part icons
// Used across events, upgrades, shop, and inventory to replace old emojis

export const AVATAR_SHARD_ICON_URL = "https://media.base44.com/images/public/699169456a354d6cb7082777/c5ea853fc_avatarshard1.png";
export const GEAR_PART_ICON_URL = "https://media.base44.com/images/public/699169456a354d6cb7082777/c2b4a0d83_gearparts1.png";

// Helper: given a reward object { id }, return the image URL if it's a shard/part, else null
export function getRewardImageUrl(rewardId) {
  if (rewardId === 'shard' || rewardId === 'avatar_shard') return AVATAR_SHARD_ICON_URL;
  if (rewardId === 'gear_shard') return GEAR_PART_ICON_URL;
  return null;
}

// Reusable small inline icon components
export function AvatarShardIcon({ size = 18, className = "" }) {
  return <img src={AVATAR_SHARD_ICON_URL} alt="Avatar Shard" className={`object-contain inline-block ${className}`} style={{ width: size, height: size }} />;
}

export function GearPartIcon({ size = 18, className = "" }) {
  return <img src={GEAR_PART_ICON_URL} alt="Gear Part" className={`object-contain inline-block ${className}`} style={{ width: size, height: size }} />;
}
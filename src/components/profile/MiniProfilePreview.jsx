import React from "react";
import { getAvatarUrl } from "./avatarUtils";
import AvatarWithScene from "@/components/avatar/AvatarWithScene";

/**
 * Mini portrait preview — reflects draft avatar + scene choices in real time.
 * Frame, profile image, level, username, and TP are intentionally omitted here
 * (they belong in the center preview area, not on the avatar card).
 */
export default function MiniProfilePreview({
  playerData,
  draftAvatar,
  draftScene,
  draftUsername,
  draftProfileImage,
  draftFrameId,
}) {
  const avatarSrc = getAvatarUrl(draftAvatar);

  return (
    <div className="w-[72px] shrink-0">
      {/* Extended avatar + scene card */}
      <div className="rounded-lg overflow-hidden border border-slate-700 bg-slate-900" style={{ aspectRatio: '3/5' }}>
        <AvatarWithScene
          avatarSrc={avatarSrc}
          sceneId={draftScene}
          className="w-full h-full"
          avatarClassName="opacity-90"
        />
      </div>
    </div>
  );
}
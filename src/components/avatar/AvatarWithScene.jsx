import React from "react";
import { getSceneById } from "../store/scenesData";

export default function AvatarWithScene({ 
  avatarSrc, 
  sceneId, 
  className = "", 
  avatarClassName = "",
  containerStyle = {},
  avatarStyle = {}
}) {
  const scene = getSceneById(sceneId);
  const sceneUrl = scene?.imageUrl;

  return (
    <div 
      className={`relative overflow-hidden ${className}`}
      style={containerStyle}
    >
      {/* Scene background */}
      {sceneUrl && (
        <div 
          className="absolute inset-0 w-full h-full"
          style={{
            backgroundImage: `url(${sceneUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat'
          }}
        />
      )}
      
      {/* Avatar on top */}
      <div className="relative w-full h-full flex items-center justify-center">
        {typeof avatarSrc === 'string' && avatarSrc.startsWith('http') ? (
          <img
            src={avatarSrc}
            alt="Avatar"
            className={avatarClassName}
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              width: 'auto',
              height: '100%',
              objectFit: 'contain',
              objectPosition: 'center',
              ...avatarStyle
            }}
          />
        ) : (
          <div style={{ fontSize: 'clamp(3rem, 12vw, 6rem)', ...avatarStyle }}>
            {avatarSrc || '🧑‍💼'}
          </div>
        )}
      </div>
    </div>
  );
}
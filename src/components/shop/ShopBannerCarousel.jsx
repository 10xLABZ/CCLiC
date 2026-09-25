import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const BANNERS = [
  { url: "https://media.base44.com/images/public/699169456a354d6cb7082777/912d291cb_avatarsbanner01.jpg", tab: "avatars" },
  { url: "https://media.base44.com/images/public/699169456a354d6cb7082777/4f631b080_vehiclesbanner01.jpg", tab: "vehicles" },
  { url: "https://media.base44.com/images/public/699169456a354d6cb7082777/b90f8446e_vipbanner01.jpg", tab: "vip" },
  { url: "https://media.base44.com/images/public/699169456a354d6cb7082777/8b4b911fe_weaponsbanner01.jpg", tab: "weapons" },
];

export default function ShopBannerCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % BANNERS.length);
    }, 2500);
    return () => clearInterval(timer);
  }, []);

  const handleClick = () => {
    navigate(`/ShopPage?tab=${BANNERS[currentIndex].tab}`);
    // Also dispatch a custom event so the ShopPage can react if already on the page
    window.dispatchEvent(new CustomEvent("shop_banner_click", { detail: { tab: BANNERS[currentIndex].tab } }));
  };

  return (
    <div className="relative rounded-lg overflow-hidden cursor-pointer" onClick={handleClick}>
      <div className="relative h-24 overflow-hidden">
        {BANNERS.map((slide, i) => (
          <img
            key={i}
            src={slide.url}
            alt="Shop Banner"
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
              i === currentIndex ? "opacity-100" : "opacity-0"
            }`}
          />
        ))}
      </div>
      {/* Pagination dots */}
      <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-1">
        {BANNERS.map((_, i) => (
          <button
            key={i}
            onClick={(e) => { e.stopPropagation(); setCurrentIndex(i); }}
            className={`w-1.5 h-1.5 rounded-full transition-all ${
              i === currentIndex ? "bg-white w-3" : "bg-white/40"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
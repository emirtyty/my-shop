'use client';

import React, { useState } from 'react';
import useSounds from '../hooks/useSounds';
import useBrandColors from '../hooks/useBrandColors';

interface ShareButtonProps {
  product: {
    id: string;
    name: string;
    price: number;
    image_url: string;
    description?: string;
  };
  className?: string;
}

const ShareButton: React.FC<ShareButtonProps> = ({ product, className = "" }) => {
  const [showShareMenu, setShowShareMenu] = useState(false);
  const { colors } = useBrandColors();
  const { click, success } = useSounds();

  const shareData = {
    title: product.name,
    text: `${product.name} - ${product.price}₽`,
    url: `${window.location.origin}/product/${product.id}`,
    image: product.image_url
  };

  const handleShare = async (platform: string) => {
    click();
    
    let shareUrl = '';
    
    switch (platform) {
      case 'telegram':
        shareUrl = `https://t.me/share/url?url=${encodeURIComponent(shareData.url)}&text=${encodeURIComponent(shareData.text)}`;
        break;
      case 'whatsapp':
        shareUrl = `https://wa.me/?text=${encodeURIComponent(`${shareData.text} ${shareData.url}`)}`;
        break;
      case 'vk':
        shareUrl = `https://vk.com/share.php?url=${encodeURIComponent(shareData.url)}&title=${encodeURIComponent(shareData.title)}&image=${encodeURIComponent(shareData.image)}`;
        break;
      case 'copy':
        try {
          await navigator.clipboard.writeText(shareData.url);
          success();
          alert('Ссылка скопирована!');
        } catch (error) {
          console.error('Failed to copy:', error);
        }
        return;
      case 'native':
        try {
          if (navigator.share) {
            await navigator.share({
              title: shareData.title,
              text: shareData.text,
              url: shareData.url
            });
            success();
          }
        } catch (error) {
          console.error('Native share failed:', error);
        }
        return;
    }
    
    if (shareUrl) {
      window.open(shareUrl, '_blank', 'width=600,height=400');
      success();
    }
    
    setShowShareMenu(false);
  };

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => {
          setShowShareMenu(!showShareMenu);
          click();
        }}
        className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 shadow-lg"
        style={{
          backgroundColor: colors.accent,
          color: 'white'
        }}
        title="Поделиться"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
        </svg>
      </button>

      {/* Выпадающее меню */}
      {showShareMenu && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowShareMenu(false)}
          />
          
          {/* Menu */}
          <div className="absolute bottom-full right-0 mb-2 w-48 bg-white rounded-2xl shadow-2xl border overflow-hidden z-50"
            style={{
              backgroundColor: 'var(--bg-primary)',
              borderColor: 'var(--border-primary)'
            }}
          >
            {/* Native Share */}
            {navigator.share && (
              <button
                onClick={() => handleShare('native')}
                className="w-full px-4 py-3 text-left hover:bg-opacity-5 transition-colors duration-200 flex items-center gap-3"
                style={{
                  color: 'var(--text-primary)',
                  backgroundColor: 'transparent'
                }}
              >
                <span className="text-lg">📱</span>
                <span className="text-sm">Поделиться</span>
              </button>
            )}
            
            {/* Telegram */}
            <button
              onClick={() => handleShare('telegram')}
              className="w-full px-4 py-3 text-left hover:bg-opacity-5 transition-colors duration-200 flex items-center gap-3"
              style={{
                color: 'var(--text-primary)',
                backgroundColor: 'transparent'
              }}
            >
              <span className="text-lg">📱</span>
              <span className="text-sm">Telegram</span>
            </button>
            
            {/* WhatsApp */}
            <button
              onClick={() => handleShare('whatsapp')}
              className="w-full px-4 py-3 text-left hover:bg-opacity-5 transition-colors duration-200 flex items-center gap-3"
              style={{
                color: 'var(--text-primary)',
                backgroundColor: 'transparent'
              }}
            >
              <span className="text-lg">💬</span>
              <span className="text-sm">WhatsApp</span>
            </button>
            
            {/* VK */}
            <button
              onClick={() => handleShare('vk')}
              className="w-full px-4 py-3 text-left hover:bg-opacity-5 transition-colors duration-200 flex items-center gap-3"
              style={{
                color: 'var(--text-primary)',
                backgroundColor: 'transparent'
              }}
            >
              <span className="text-lg">💬</span>
              <span className="text-sm">VK</span>
            </button>
            
            {/* Copy Link */}
            <button
              onClick={() => handleShare('copy')}
              className="w-full px-4 py-3 text-left hover:bg-opacity-5 transition-colors duration-200 flex items-center gap-3 border-t"
              style={{
                color: 'var(--text-primary)',
                backgroundColor: 'transparent',
                borderColor: 'var(--border-primary)'
              }}
            >
              <span className="text-lg">🔗</span>
              <span className="text-sm">Копировать ссылку</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default ShareButton;

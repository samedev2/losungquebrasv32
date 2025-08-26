import React, { useEffect } from 'react';

interface MobileViewportHandlerProps {
  children: React.ReactNode;
}

export function MobileViewportHandler({ children }: MobileViewportHandlerProps) {
  useEffect(() => {
    // Set viewport meta tag for mobile devices
    const setViewportMeta = () => {
      let viewport = document.querySelector('meta[name="viewport"]');
      
      if (!viewport) {
        viewport = document.createElement('meta');
        viewport.setAttribute('name', 'viewport');
        document.head.appendChild(viewport);
      }
      
      viewport.setAttribute(
        'content',
        'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover'
      );
    };

    // Handle orientation changes
    const handleOrientationChange = () => {
      // Small delay to ensure proper viewport adjustment
      setTimeout(() => {
        setViewportMeta();
        
        // Force a reflow to ensure proper rendering
        if (window.innerHeight) {
          document.documentElement.style.height = `${window.innerHeight}px`;
          setTimeout(() => {
            document.documentElement.style.height = '';
          }, 100);
        }
      }, 100);
    };

    // Handle resize events
    const handleResize = () => {
      // Update CSS custom properties for viewport height
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };

    // Initialize
    setViewportMeta();
    handleResize();

    // Add event listeners
    window.addEventListener('orientationchange', handleOrientationChange);
    window.addEventListener('resize', handleResize);

    // iOS Safari specific fixes
    if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
      // Prevent zoom on input focus
      const inputs = document.querySelectorAll('input, select, textarea');
      inputs.forEach(input => {
        input.addEventListener('focus', () => {
          if (input instanceof HTMLElement) {
            input.style.fontSize = '16px';
          }
        });
      });

      // Handle iOS Safari bottom bar
      const updateIOSHeight = () => {
        const windowHeight = window.innerHeight;
        document.documentElement.style.setProperty('--ios-height', `${windowHeight}px`);
      };

      updateIOSHeight();
      window.addEventListener('resize', updateIOSHeight);
    }

    // Cleanup
    return () => {
      window.removeEventListener('orientationchange', handleOrientationChange);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return <>{children}</>;
}
"use client";
import { useEffect, useRef } from 'react';

export default function CusdisComments({ attrs }) {
  const containerRef = useRef(null);

  useEffect(() => {
    // Dynamically load the Cusdis script
    const script = document.createElement("script");
    script.src = "https://cusdis.com/js/cusdis.es.js";
    script.async = true;
    script.defer = true;
    
    // Append to the container
    if (containerRef.current) {
      containerRef.current.appendChild(script);
    }
    
    // When the component unmounts, or attrs change, we might need to reset
    // Cusdis automatically handles window.CUSDIS.initial() when the script loads
    // But if we navigate client-side, we need to call it manually
    if (window.CUSDIS) {
      window.CUSDIS.initial();
    }

    return () => {
      if (containerRef.current && script.parentNode) {
        containerRef.current.removeChild(script);
      }
    };
  }, [attrs.pageId, attrs.theme]);

  return (
    <div ref={containerRef} style={{ width: '100%', overflow: 'hidden' }}>
      <div 
        id="cusdis_thread"
        data-host={attrs.host}
        data-app-id={attrs.appId}
        data-page-id={attrs.pageId}
        data-page-url={attrs.pageUrl}
        data-page-title={attrs.pageTitle}
        data-theme={attrs.theme}
        style={{ width: '100%' }}
      ></div>
    </div>
  );
}

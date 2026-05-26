"use client";

import { useEffect } from "react";

export default function AdminRedirect() {
  useEffect(() => {
    window.location.href = "/wuxian/admin/index.html";
  }, []);

  return (
    <div style={{ padding: '2rem', textAlign: 'center', fontFamily: 'sans-serif' }}>
      正在为您进入后台写作环境，请稍候... (Redirecting to CMS portal)
    </div>
  );
}

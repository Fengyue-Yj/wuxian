"use client";

import { useEffect } from "react";

export default function AdminRedirect() {
  useEffect(() => {
    window.location.replace("/wuxian/admin/index.html");
  }, []);

  return (
    <main style={{ padding: "2rem", textAlign: "center", fontFamily: "sans-serif" }}>
      <p>正在打开写作与发布后台……</p>
      <a href="/wuxian/admin/index.html">进入发布后台</a>
    </main>
  );
}

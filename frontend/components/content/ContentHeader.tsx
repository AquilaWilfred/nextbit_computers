"use client";

import { memo } from "react";

export const ContentHeader = memo(function ContentHeader() {
  return (
    <div>
      <h2 className="text-3xl font-bold">Content Management</h2>
      <p className="text-muted-foreground mt-1">
        Manage website content, banners, and promotions
      </p>
    </div>
  );
});
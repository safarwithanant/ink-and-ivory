import React, { useEffect } from "react";
import { useLocation } from "wouter";
import { resetRouteScroll } from "@/lib/navigation";

export function ScrollToTop() {
  const [location] = useLocation();
  useEffect(() => {
    window.history.scrollRestoration = "manual";
    resetRouteScroll(window);
  }, [location]);
  return null;
}

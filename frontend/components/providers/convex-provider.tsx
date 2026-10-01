"use client";

import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import { createContext, useContext, type ReactNode } from "react";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
const client = convexUrl ? new ConvexReactClient(convexUrl) : null;
const ConvexReadyContext = createContext(false);

export function useConvexReady() {
  return useContext(ConvexReadyContext);
}

export function ConvexProvider({ children }: { children: ReactNode }) {
  if (!client) {
    return <ConvexReadyContext.Provider value={false}>{children}</ConvexReadyContext.Provider>;
  }
  return (
    <ConvexReadyContext.Provider value>
      <ConvexAuthProvider client={client}>{children}</ConvexAuthProvider>
    </ConvexReadyContext.Provider>
  );
}
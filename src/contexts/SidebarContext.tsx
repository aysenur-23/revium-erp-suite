import { createContext, useContext, ReactNode } from "react";

interface SidebarContextType {
  closeSidebar: () => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export const useSidebarContext = () => {
  const context = useContext(SidebarContext);
  return context;
};

interface SidebarProviderProps {
  children: ReactNode;
  closeSidebar: () => void;
}

export const SidebarProvider = ({ children, closeSidebar }: SidebarProviderProps) => {
  return (
    <SidebarContext.Provider value={{ closeSidebar }}>
      {children}
    </SidebarContext.Provider>
  );
};


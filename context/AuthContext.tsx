import { createContext, useContext } from "react";

type AuthContextType = {
  isRecovering: boolean;
  setIsRecovering: (value: boolean) => void;
};

export const AuthContext = createContext<AuthContextType>({
  isRecovering: false,
  setIsRecovering: () => {},
});

export const useAuth = () => useContext(AuthContext);

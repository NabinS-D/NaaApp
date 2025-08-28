import { useContext, createContext, useState, useEffect } from "react";
import { getCurrentUser } from "../lib/APIs/UserApi";
import { router } from "expo-router";

const GlobalContext = createContext();

export const useGlobalContext = () => useContext(GlobalContext);

const GlobalProvider = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [userdetails, setuserdetails] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkAuth = async () => {
    try {
      const currentUser = await getCurrentUser();
      if (currentUser?.account?.$id) {
        setUser(currentUser.account);
        setuserdetails(currentUser.document);
        setIsLoggedIn(true);
      } else {
        throw new Error('No valid user session');
      }
    } catch (error) {
      setUser(null);
      setuserdetails(null);
      setIsLoggedIn(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkAuth().catch((error) => {
      console.error('checkAuth failed in useEffect:', error);
      setIsLoading(false);
    });
  }, []);

  return (
    <GlobalContext.Provider
      value={{
        isLoading,
        user,
        setUser,
        isLoggedIn,
        setIsLoggedIn,
        checkAuth,
        userdetails,
        setuserdetails,
      }}
    >
      {children}
    </GlobalContext.Provider>
  );
};

export default GlobalProvider;
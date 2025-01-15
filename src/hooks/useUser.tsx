import { User } from "@supabase/auth-helpers-nextjs";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { useUser as useSupaUser } from "@supabase/auth-helpers-react";
import { useSessionContext } from "@supabase/auth-helpers-react";
import { Subscription, UserDetails } from "../types";

type UserContextType = {
  accessToken: string | null;
  refreshToken: string | null;
  user: User | null;
  userDetails: UserDetails | null;
  isLoading: boolean;
  subscription: Subscription | null;
};

export const usercontext = createContext<UserContextType | undefined>(
  undefined
);

export interface Props {
  children: React.ReactNode;
}

export const MyUserContextProvider = (props: Props) => {
  const {
    session,
    isLoading: isLoadinguser,
    supabaseClient: supabase,
  } = useSessionContext();
  const user = useSupaUser();
  const accessToken = session?.access_token ?? null;
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [userDetails, setUserDetails] = useState<UserDetails | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);

  const getUserDetails = useCallback(
    () => supabase.from("users").select("*").eq("id", user?.id).single(),
    [supabase, user?.id]
  );

  const getSubscription = useCallback(
    () =>
      supabase
        .from("subscriptions")
        .select("*, prices(*, products(*))")
        .eq("user_id", user?.id)
        .single(),
    [supabase, user?.id]
  );

  useEffect(() => {
    if (user && !isLoadingData && !userDetails && !subscription) {
      setIsLoadingData(true);
      Promise.allSettled([getUserDetails(), getSubscription()]).then(
        (results) => {
          const userDetailsResult = results[0];
          const subscriptionResult = results[1];

          if (userDetailsResult.status === "fulfilled") {
            setUserDetails(userDetailsResult.value.data as UserDetails);
          }
          if (subscriptionResult.status === "fulfilled") {
            setSubscription(subscriptionResult.value.data as Subscription);
          }

          setIsLoadingData(false);
        }
      );
    } else if (!user && !isLoadinguser && !isLoadingData) {
      setUserDetails(null);
      setSubscription(null);
    }
  }, [
    user,
    isLoadinguser,
    isLoadingData,
    userDetails,
    subscription,
    getUserDetails,
    getSubscription,
  ]);
  const value = {
    accessToken,
    refreshToken: session?.refresh_token ?? null,
    user,
    userDetails,
    isLoading: isLoadinguser || isLoadingData,
    subscription,
  };
  return <usercontext.Provider value={value} {...props} />;
};

export const useUser = () => {
  const context = useContext(usercontext);
  if (context === undefined) {
    throw new Error("useUser must be used within a MyUserContextProvider");
  }
  return context;
};

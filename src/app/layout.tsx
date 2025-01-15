import type { Metadata } from "next";
import { Figtree } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import SupabaseProvider from "../../providers/supabaseprovider";
import UserProvider from "../../providers/userProvider";
import ModalProvider from "../../providers/ModalProvider";
import ToasterProvider from "../../providers/Toaster.Provider";
import getSongsByUserId from "../../actions/getSongsByUserId";
import Player from "@/components/Player";

const figtree = Figtree({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Spotify clone",
  description: "Songs",
};
export const revalidate = 0;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const userSongs = await getSongsByUserId();

  return (
    <html lang="en">
      <body className={figtree.className}>
        <ToasterProvider />
        <SupabaseProvider>
          <UserProvider>
            <ModalProvider />
            <Sidebar songs={userSongs}>{children}</Sidebar>
            <Player />
          </UserProvider>
        </SupabaseProvider>
      </body>
    </html>
  );
}

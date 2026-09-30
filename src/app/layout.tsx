import type { Metadata } from "next";
import "./styles.css";
export const metadata: Metadata = { title:"LANDER CREATORS", description:"Creator Marketing com operação organizada por contexto." };
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="pt-BR"><body>{children}</body></html>;}

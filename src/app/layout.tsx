import type { Metadata } from "next";
import "./styles.css";
export const metadata: Metadata = { title:"LANDER CREATORS", description:"Plataforma em configuração inicial." };
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="pt-BR"><body>{children}</body></html>;}

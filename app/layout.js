import { Roboto } from "next/font/google";
import "./globals.css";

const roboto = Roboto({
    weight: ["400", "500", "700"],
    subsets: ["latin", "cyrillic"],
});

export const metadata = {
    title: "My app",
    description: "By Vistai",
};

export default function RootLayout({ children }) {
    return (
        <html lang="en" className="h-full antialiased">
        <body className={`${roboto.className} min-h-full flex flex-col`}>
        {children}
        </body>
        </html>
    );
}

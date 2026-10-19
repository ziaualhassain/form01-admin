import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FORM/01 Operations",
  description: "FORM/01 catalogue, inventory, order, and fulfilment control center",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}

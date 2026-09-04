"use client";

import FooterThemeSwitcher from "@/components/FooterThemeSwitcher";

const BUILD_VERSION = process.env.NEXT_PUBLIC_BUILD_VERSION ?? "dev";

interface Props {
  tagline: string;
}

export default function ShellFooter({ tagline }: Props) {
  return (
    <footer className="shell-footer">
      <div className="shell-footer__meta">
        <span className="shell-footer__legal">Rags to Races · MIT · {tagline}</span>
        <span className="shell-footer__version">v{BUILD_VERSION}</span>
      </div>
      <FooterThemeSwitcher />
    </footer>
  );
}

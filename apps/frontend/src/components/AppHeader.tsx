import type { UserDto } from "@ridebook/contracts";
import { Link2, LogIn, LogOut, MapPinned, Moon, Plus, Sun, SunMoon } from "lucide-react";
import type { ReactElement } from "react";

import type { ThemeChoice } from "../hooks/usePersistentTheme.js";

const THEME_OPTIONS: Array<{ icon: ReactElement; label: string; value: ThemeChoice }> = [
  { icon: <Sun size={16} />, label: "Clair", value: "light" },
  { icon: <Moon size={16} />, label: "Sombre", value: "dark" },
  { icon: <SunMoon size={16} />, label: "Système", value: "system" },
];

interface AppHeaderProps {
  onGoHome: () => void;
  onLogin: () => void;
  onLogout: () => void;
  onNewTrip: () => void;
  onOpenInvitations: () => void;
  onThemeChange: (theme: ThemeChoice) => void;
  theme: ThemeChoice;
  user: UserDto | null;
}

export function AppHeader({
  onGoHome,
  onLogin,
  onLogout,
  onNewTrip,
  onOpenInvitations,
  onThemeChange,
  theme,
  user,
}: AppHeaderProps): ReactElement {
  return (
    <header className="topbar">
      <button className="brand" type="button" onClick={onGoHome}>
        <span className="brand-mark" aria-hidden="true">
          <MapPinned size={22} />
        </span>
        <span>Ridebook</span>
      </button>
      <div className="topbar-actions">
        {user ? (
          <>
            <button className="secondary-action compact" onClick={onNewTrip} type="button">
              <Plus size={16} />
              Nouvelle balade
            </button>
            {user.role === "ADMIN" && (
              <button className="secondary-action compact" onClick={onOpenInvitations} type="button">
                <Link2 size={16} />
                Invitations
              </button>
            )}
            <button className="icon-button" onClick={onLogout} title="Déconnexion" type="button">
              <LogOut size={16} />
            </button>
          </>
        ) : (
          <button className="secondary-action compact" onClick={onLogin} type="button">
            <LogIn size={16} />
            Connexion
          </button>
        )}
        <div className="theme-switcher" aria-label="Thème">
          {THEME_OPTIONS.map((option) => (
            <button
              aria-label={option.label}
              className={theme === option.value ? "icon-button active" : "icon-button"}
              key={option.value}
              onClick={() => onThemeChange(option.value)}
              title={option.label}
              type="button"
            >
              {option.icon}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}

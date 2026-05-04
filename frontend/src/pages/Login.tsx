import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Input, Button } from "@yza/ui";
import { Globe } from "lucide-react";
import { animate, stagger, createTimeline } from "animejs";
import { useAuthStore } from "@/stores/auth";
import { useTransitionStore } from "@/stores/transition";
import { ParticleField } from "@/components/ParticleField";
import { api } from "@/lib/api";
import { buildApiUrl } from "@/lib/server-url";
import { toast } from "sonner";
import type { User } from "@/types";
import { useDeferredMount, useHeavyEffectsEnabled, useReducedMotion } from "@/hooks/useMotionPreferences";

export default function Login() {
  const { t } = useTranslation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [shaking, setShaking] = useState(false);
  const [errors, setErrors] = useState<{
    username?: string;
    password?: string;
  }>({});
  const [oauthConfig, setOauthConfig] = useState<{ enabled: boolean; provider: string } | null>(null);
  const [oauthConfigFailed, setOauthConfigFailed] = useState(false);
  const login = useAuthStore((s) => s.login);
  const setPhase = useTransitionStore((s) => s.setPhase);
  const location = useLocation();
  const navigate = useNavigate();
  const reducedMotion = useReducedMotion();
  const heavyEffectsEnabled = useHeavyEffectsEnabled(960);
  const showParticleField = useDeferredMount(heavyEffectsEnabled, 160);

  const heroRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const loadOauthConfig = useCallback(async (active?: { current: boolean }) => {
    try {
      const response = await api.get<{ enabled: boolean; provider: string }>("/api/v1/auth/oauth/config");
      if (active && !active.current) {
        return;
      }
      setOauthConfig(response.data);
      setOauthConfigFailed(false);
    } catch {
      if (active && !active.current) {
        return;
      }
      setOauthConfig(null);
      setOauthConfigFailed(true);
    }
  }, []);

  const playExitAnimation = useCallback(() => {
    return new Promise<void>((resolve) => {
      if (reducedMotion) {
        resolve();
        return;
      }

      if (!heroRef.current || !cardRef.current || !rootRef.current) {
        resolve();
        return;
      }

      const tl = createTimeline({
        defaults: { ease: "easeInCubic" },
        onComplete: () => resolve(),
      });

      // Card flies out to the right
      tl.add(cardRef.current, {
        translateX: [0, 120],
        opacity: [1, 0],
        duration: 500,
      }, 0);

      // Hero content fades and scales up (zoom into 3D scene)
      tl.add(heroRef.current.querySelector(".stc-login__hero-content")!, {
        opacity: [1, 0],
        scale: [1, 1.1],
        duration: 500,
      }, 0);

      // Whole page scales up + fades (portal zoom effect)
      tl.add(rootRef.current, {
        scale: [1, 1.15],
        opacity: [1, 0],
        duration: 450,
        ease: "easeInCubic",
      }, 350);
    });
  }, [reducedMotion]);

  useEffect(() => {
    const active = { current: true };
    void loadOauthConfig(active);
    return () => {
      active.current = false;
    };
  }, [loadOauthConfig]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const error = params.get("error");
    if (!error) {
      return;
    }

    const detail = params.get("error_description") || error;
    toast.error(t("login.oauthFailed", { reason: detail }));
    navigate("/login", { replace: true });
  }, [location.search, navigate, t]);

  // AnimeJS v4 timeline entrance
  useEffect(() => {
    if (!heroRef.current || !cardRef.current) return;
    if (reducedMotion) {
      rootRef.current?.querySelectorAll<HTMLElement>(".stc-pre-animate").forEach((el) => {
        el.style.opacity = "1";
        el.style.transform = "none";
      });
      cardRef.current.style.opacity = "1";
      cardRef.current.style.transform = "none";
      return;
    }

    // Hero side: staggered reveal with timeline
    const tl = createTimeline({ defaults: { ease: "easeOutCubic" } });

    tl.add(heroRef.current.querySelector(".stc-login__badge")!, {
      opacity: [0, 1],
      translateY: [20, 0],
      scale: [0.9, 1],
      duration: 600,
    }, 200)
    .add(heroRef.current.querySelector(".stc-login__headline")!, {
      opacity: [0, 1],
      translateY: [40, 0],
      duration: 800,
    }, 400)
    .add(heroRef.current.querySelector(".stc-login__tagline")!, {
      opacity: [0, 1],
      translateY: [30, 0],
      duration: 700,
    }, 600)
    .add(heroRef.current.querySelectorAll(".stc-login__tech-tag"), {
      opacity: [0, 1],
      translateY: [15, 0],
      scale: [0.8, 1],
      delay: stagger(80),
      duration: 500,
    }, 700)
    .add(heroRef.current.querySelectorAll(".stc-login__metric"), {
      opacity: [0, 1],
      translateY: [25, 0],
      delay: stagger(120),
      duration: 600,
    }, 900);

    // Animate counter values
    heroRef.current.querySelectorAll<HTMLElement>("[data-count]").forEach((el) => {
      const target = parseInt(el.dataset.count!, 10);
      const obj = { val: 0 };
      animate(obj, {
        val: [0, target],
        duration: 1800,
        delay: 1100,
        ease: "easeOutExpo",
        onUpdate: () => {
          el.textContent = Math.round(obj.val).toString();
        },
      });
    });

    // Card side: slide in from right
    animate(cardRef.current, {
      opacity: [0, 1],
      translateX: [60, 0],
      duration: 900,
      ease: "easeOutCubic",
      delay: 300,
    });

    // Card inner elements stagger
    animate(cardRef.current.querySelectorAll("[data-card-animate]"), {
      opacity: [0, 1],
      translateY: [20, 0],
      delay: stagger(80, { start: 600 }),
      duration: 600,
      ease: "easeOutCubic",
    });
  }, [reducedMotion]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const newErrors: typeof errors = {};
    if (!username.trim()) newErrors.username = t("login.usernameRequired");
    if (!password) newErrors.password = t("login.passwordRequired");
    if (Object.keys(newErrors).length) {
      setErrors(newErrors);
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      const normalizedUsername = username.trim();
      const { data } = await api.post<{ token: string; user: User }>(
        "/api/v1/auth/login",
        { username: normalizedUsername, password },
      );
      login(data.token, data.user);
      setPhase("login-exit");
      await playExitAnimation();
      navigate("/dashboard", { replace: true });
    } catch {
      toast.error(t("login.failed"));
      setShaking(true);
      setTimeout(() => setShaking(false), 600);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="stc-login" ref={rootRef}>
      {/* Left: Brand hero with 3D scene */}
      <div className="stc-login__hero" ref={heroRef}>
        <div className="stc-login__hero-aurora" />
        <div className="stc-login__hero-grid" />
        <div className="stc-login__hero-vignette" />
        {showParticleField ? (
          <ParticleField className="stc-login__scene" />
        ) : (
          <div className="stc-login__scene stc-particle-fallback" aria-hidden="true" />
        )}
        <div className="stc-login__hero-content">
          <div className="stc-login__badge stc-pre-animate">Prowl Range</div>
          <h1 className="stc-login__headline stc-pre-animate">
            Security<br />
            <span className="stc-login__headline-accent">Range</span>
          </h1>
          <p className="stc-login__tagline stc-pre-animate">{t("login.subtitle")}</p>

          <div className="stc-login__tech-stack stc-pre-animate">
            <span className="stc-login__tech-tag">Three.js</span>
            <span className="stc-login__tech-tag">AnimeJS v4</span>
            <span className="stc-login__tech-tag">React 19</span>
            <span className="stc-login__tech-tag">TypeScript</span>
            <span className="stc-login__tech-tag">Vite 6</span>
          </div>

          <div className="stc-login__metrics">
            <div className="stc-login__metric stc-pre-animate">
              <span className="stc-login__metric-value" data-count="100">0</span>
              <span className="stc-login__metric-unit">%</span>
              <span className="stc-login__metric-label">{t("login.stat1")}</span>
            </div>
            <div className="stc-login__metric stc-pre-animate">
              <span className="stc-login__metric-value" data-count="10">0</span>
              <span className="stc-login__metric-unit">+</span>
              <span className="stc-login__metric-label">{t("login.stat2")}</span>
            </div>
            <div className="stc-login__metric stc-pre-animate">
              <span className="stc-login__metric-value">&infin;</span>
              <span className="stc-login__metric-label">{t("login.stat3")}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right: Login panel */}
      <div className="stc-login__card-area">
        <div ref={cardRef} className={`stc-login__card stc-pre-animate${shaking ? " stc-shake" : ""}`}>
          <div className="stc-login__card-header" data-card-animate>
            <div className="stc-login__card-logo">S</div>
            <h2 className="stc-login__card-title">{t("login.title")}</h2>
            <p className="stc-login__card-desc">{t("login.desc")}</p>
          </div>
          <form className="stc-login__form" onSubmit={handleSubmit}>
            <div data-card-animate>
              <Input
                label={t("login.username")}
                value={username}
                status={errors.username ? "error" : "default"}
                message={errors.username}
                autoComplete="username"
                onChange={(e) => {
                  setUsername(e.target.value);
                  setErrors((prev) => ({ ...prev, username: undefined }));
                }}
              />
            </div>
            <div data-card-animate>
              <Input
                type="password"
                label={t("login.password")}
                value={password}
                status={errors.password ? "error" : "default"}
                message={errors.password}
                autoComplete="current-password"
                onChange={(e) => {
                  setPassword(e.target.value);
                  setErrors((prev) => ({ ...prev, password: undefined }));
                }}
              />
            </div>
            <div data-card-animate>
              <Button type="submit" disabled={loading} aria-busy={loading}>
                {loading ? t("login.submitting") : t("login.submit")}
              </Button>
            </div>
          </form>
          {oauthConfig?.enabled && (
            <div className="stc-login__oauth" data-card-animate>
              <div className="stc-login__divider">
                <span>{t("login.orContinueWith")}</span>
              </div>
              <a
                href={buildApiUrl("/api/v1/auth/oauth/login")}
                className="stc-login__oauth-btn"
                aria-label={t("login.oauthLogin", { provider: oauthConfig.provider })}
              >
                <Globe size={18} />
                {t("login.oauthLogin", { provider: oauthConfig.provider })}
              </a>
            </div>
          )}
          {oauthConfigFailed && (
            <div className="stc-login__oauth-error" data-card-animate>
              <span>{t("login.oauthUnavailable")}</span>
              <button
                className="stc-login__oauth-retry"
                type="button"
                onClick={() => { void loadOauthConfig(); }}
              >
                {t("login.retryOauth")}
              </button>
            </div>
          )}
        </div>
        <div className="stc-login__footer">&copy; {new Date().getFullYear()} Prowl</div>
      </div>
    </div>
  );
}

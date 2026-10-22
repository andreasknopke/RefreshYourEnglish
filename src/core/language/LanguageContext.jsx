import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import v2Client from '../api/v2Client';

const LanguageContext = createContext(null);

/**
 * Stellt die verfügbaren Language Packs und die aktive Zielsprache des
 * Nutzers bereit. Kein Modul liest Sprache mehr direkt aus localStorage.
 */
export function LanguageProvider({ children }) {
  const [packs, setPacks] = useState([]);
  const [userLanguages, setUserLanguages] = useState([]);
  const [activeUserLanguage, setActiveUserLanguage] = useState(null);
  const [loading, setLoading] = useState(true);

  // Packs laden (öffentlich, ohne Auth)
  useEffect(() => {
    let cancelled = false;
    v2Client
      .listLanguages()
      .then((data) => {
        if (!cancelled) setPacks(data.languages || []);
      })
      .catch(() => {
        if (!cancelled) setPacks([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const refreshUserLanguages = useCallback(async (userId) => {
    if (!userId) {
      setUserLanguages([]);
      setActiveUserLanguage(null);
      setLoading(false);
      return [];
    }
    try {
      const data = await v2Client.listMyLanguages();
      const langs = data.languages || [];
      setUserLanguages(langs);
      setActiveUserLanguage(langs.find((l) => l.active) || langs[0] || null);
      return langs;
    } catch {
      setUserLanguages([]);
      setActiveUserLanguage(null);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const createLanguage = useCallback(async (profile) => {
    const created = await v2Client.createLanguage(profile);
    await refreshUserLanguages(created.userId);
    return created;
  }, [refreshUserLanguages]);

  const switchLanguage = useCallback(async (id) => {
    await v2Client.setActiveLanguage(id);
    setUserLanguages((prev) => {
      const next = prev.map((l) => ({ ...l, active: l.id === id }));
      setActiveUserLanguage(next.find((l) => l.id === id) || null);
      return next;
    });
  }, []);

  const packFor = useCallback(
    (code) => packs.find((p) => p.code === code) || null,
    [packs]
  );

  const value = {
    packs,
    userLanguages,
    activeUserLanguage,
    activePack: activeUserLanguage ? packFor(activeUserLanguage.targetLang) : null,
    loading,
    refreshUserLanguages,
    createLanguage,
    switchLanguage,
    packFor
  };

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useLanguage muss innerhalb von <LanguageProvider> verwendet werden');
  }
  return ctx;
}

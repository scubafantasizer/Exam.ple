import { useState, useEffect } from "react";
import { getLang, onLangChange, setLang, t, type Lang, type TKey } from "../lib/i18n";

export function useLang() {
  const [lang, setL] = useState<Lang>(getLang());
  useEffect(() => {
    const unsub = onLangChange(() => setL(getLang()));
    return () => { unsub(); };
  }, []);
  return {
    lang,
    setLang,
    t: (key: TKey) => t(key),
  };
}

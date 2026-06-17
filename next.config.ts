import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Active le React Compiler (stable depuis Next 16) : mémoïsation automatique
  // des composants/hooks à la compilation. Permet de supprimer les useMemo/
  // useCallback/React.memo manuels tout en préservant l'identité stable requise
  // (callback refs, handlers d'événements add/removeEventListener).
  reactCompiler: true,
};

export default nextConfig;

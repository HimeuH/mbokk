import { getRequestConfig } from "next-intl/server";

// Scaffold only — French-only content for MVP (docs/mvp-plan.md).
// Wolof gets added here as a second locale post-MVP, no rewrite needed.
export default getRequestConfig(async () => {
  const locale = "fr";

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});

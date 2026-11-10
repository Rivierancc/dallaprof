type TitleMatch = { id: string; loaderData?: unknown };

/** Il nome proviene dalla licenza del locale, già letta dal caricamento principale. */
export function venuePageTitle(page: string, matches: readonly TitleMatch[]) {
  const root = matches.find((match) => match.loaderData && typeof match.loaderData === "object" && "venueName" in match.loaderData)?.loaderData;
  const name = root && typeof root === "object" && "venueName" in root && typeof root.venueName === "string" ? root.venueName.trim() : "";
  return name ? `${page} — ${name}` : page;
}
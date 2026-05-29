import HomePageClient from "@components/pages/home/home-page-client";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = await searchParams;
  const routeParam = resolvedSearchParams.route;
  const stopParam = resolvedSearchParams.stop;

  return (
    <HomePageClient
      initialRouteId={typeof routeParam === "string" ? routeParam : null}
      initialStopId={typeof stopParam === "string" ? stopParam : null}
    />
  );
}

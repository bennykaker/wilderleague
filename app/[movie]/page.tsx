import CastingDemoPage from "../components/CastingDemoPage";
import { movies } from "../data/movies";
import { notFound } from "next/navigation";

export default async function MoviePage({
  params,
}: {
  params: Promise<{ movie: string }>;
}) {
  const { movie } = await params;
  const movieData = movies[movie];

  if (!movieData) {
    notFound();
  }

  return <CastingDemoPage movie={movieData} />;
}
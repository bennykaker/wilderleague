import CastingDemoPage from "../components/CastingDemoPage";
import { movies } from "../data/movies";

export default function ApartmentPage() {
  return <CastingDemoPage movie={movies.apartment} />;
}
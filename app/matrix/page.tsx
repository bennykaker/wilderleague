import CastingDemoPage from "../components/CastingDemoPage";
import { movies } from "../data/movies";

export default function MatrixPage() {
  return <CastingDemoPage movie={movies.matrix} />;
}
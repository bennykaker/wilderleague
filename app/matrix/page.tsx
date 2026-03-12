import CastingBoard from "../components/CastingBoard";
import { getActors } from "../data/actors";
import { getRoles } from "../data/roles";

export default function MatrixPage() {
  const actors = getActors();
  const roles = getRoles();

  return (
    <CastingBoard
      actors={actors}
      roles={roles}
      title="The Matrix Recast"
      challenge="Recast The Matrix with a new ensemble. Drag actors into roles and share your version."
      budget="$35M"
    />
  );
}
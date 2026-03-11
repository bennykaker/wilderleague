import { getActors } from "./data/actors";
import { getRoles } from "./data/roles";
import CastingBoard from "./components/CastingBoard";

export default function Page() {
  const actors = getActors();
  const roles = getRoles();

  return <CastingBoard actors={actors} roles={roles} />;
}
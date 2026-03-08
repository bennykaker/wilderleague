export type Actor = {
  name: string;
  cost: number;
  image: string;
};

export type MovieData = {
  slug: string;
  title: string;
  budget: number;
  roles: string[];
  actors: Actor[];
  defaultCastTitle: string;
};

export const movies: Record<string, MovieData> = {
  matrix: {
    slug: "matrix",
    title: "The Matrix",
    budget: 90,
    roles: ["Neo", "Trinity", "Morpheus", "Agent Smith"],
    defaultCastTitle: "My Matrix Cast",
    actors: [
      { name: "Dev Patel", cost: 8, image: "/test.jpg" },
      { name: "Jodie Comer", cost: 7, image: "/test.jpg" },
      { name: "Mahershala Ali", cost: 10, image: "/test.jpg" },
      { name: "Cillian Murphy", cost: 9, image: "/test.jpg" },
      { name: "Florence Pugh", cost: 10, image: "/test.jpg" },
      { name: "Oscar Isaac", cost: 8, image: "/test.jpg" },
    ],
  },

  apartment: {
    slug: "apartment",
    title: "The Apartment",
    budget: 35,
    roles: ["C.C. Baxter", "Fran Kubelik", "Jeff D. Sheldrake", "Dr. Dreyfuss"],
    defaultCastTitle: "My Apartment Cast",
    actors: [
      { name: "Paul Mescal", cost: 8, image: "/test.jpg" },
      { name: "Daisy Edgar-Jones", cost: 7, image: "/test.jpg" },
      { name: "Jon Hamm", cost: 6, image: "/test.jpg" },
      { name: "John Turturro", cost: 4, image: "/test.jpg" },
      { name: "Glen Powell", cost: 9, image: "/test.jpg" },
      { name: "Jodie Comer", cost: 8, image: "/test.jpg" },
      { name: "Bryan Cranston", cost: 7, image: "/test.jpg" },
      { name: "Mark Ruffalo", cost: 8, image: "/test.jpg" },
      { name: "Carey Mulligan", cost: 7, image: "/test.jpg" },
      { name: "Sterling K. Brown", cost: 6, image: "/test.jpg" },
    ],
  },
};
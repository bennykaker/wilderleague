"use client";

import { useState } from "react";
import Link from "next/link";
import { slugify } from "../data/slugify";

export default function MovieSearch({ movies }: { movies: string[] }) {
  const [query, setQuery] = useState("");

  const filteredMovies = movies.filter((movie) =>
    movie.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <>
      <input
        type="text"
        placeholder="Search movies..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        style={{
          padding: "0.5rem",
          marginBottom: "1rem",
          width: "100%",
          fontSize: "1rem",
        }}
      />

      <ul>
        {filteredMovies.map((movie) => (
          <li key={movie}>
            <Link href={`/${slugify(movie)}`}>{movie}</Link>
          </li>
        ))}
      </ul>
    </>
  );
}
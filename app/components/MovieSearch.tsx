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
          padding: "0.75rem",
          marginBottom: "1.5rem",
          width: "100%",
          fontSize: "1rem",
          border: "1px solid #ccc",
          borderRadius: "8px",
        }}
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "1rem",
        }}
      >
        {filteredMovies.map((movie) => (
          <Link
            key={movie}
            href={`/${slugify(movie)}`}
            style={{
              display: "block",
              padding: "1.25rem",
              border: "1px solid #ccc",
              borderRadius: "10px",
              textDecoration: "none",
              background: "#f8f8f8",
              color: "#111",
              fontWeight: 600,
            }}
          >
            {movie}
          </Link>
        ))}
      </div>
    </>
  );
}
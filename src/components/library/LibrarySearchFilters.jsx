import { useState } from "react";
import { SearchIcon, SlidersIcon } from "../icons.jsx";

export function LibrarySearchFilters({ filters }) {
  const [activeFilter, setActiveFilter] = useState(filters[0]);

  return (
    <section className="library-search-card" aria-labelledby="library-search-title">
      <h2 id="library-search-title" className="sr-only">
        Search and filter library resources
      </h2>

      <label className="library-search-field">
        <SearchIcon />
        <span className="sr-only">Search resources</span>
        <input type="search" placeholder="Search resources..." />
      </label>

      <button className="library-filter-button" type="button" aria-label="Filters are UI only for now">
        <SlidersIcon />
      </button>

      <div className="library-filter-chips" aria-label="Resource filters">
        {filters.map((filter) => (
          <button
            type="button"
            className={filter === activeFilter ? "is-active" : ""}
            aria-pressed={filter === activeFilter}
            onClick={() => setActiveFilter(filter)}
            key={filter}
          >
            {filter}
          </button>
        ))}
      </div>
    </section>
  );
}

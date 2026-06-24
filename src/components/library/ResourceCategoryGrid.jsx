import { ResourceCategoryCard } from "./ResourceCategoryCard.jsx";

export function ResourceCategoryGrid({ categories }) {
  return (
    <section className="library-categories" aria-labelledby="library-categories-title">
      <div className="library-section-heading">
        <p className="card-eyebrow card-eyebrow--red">Browse by skill</p>
        <h2 id="library-categories-title">Resource Categories</h2>
      </div>

      <div className="library-category-grid">
        {categories.map((category) => (
          <ResourceCategoryCard category={category} key={category.title} />
        ))}
      </div>
    </section>
  );
}

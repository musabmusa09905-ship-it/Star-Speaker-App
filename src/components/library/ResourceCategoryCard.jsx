import { IconByName } from "../icons.jsx";

export function ResourceCategoryCard({ category }) {
  return (
    <article className="card library-category-card">
      <div className="library-card-icon" aria-hidden="true">
        <IconByName name={category.icon} />
      </div>

      <div className="library-category-card__copy">
        <h3>{category.title}</h3>
        <p>{category.description}</p>
      </div>

      <span>{category.status}</span>
    </article>
  );
}

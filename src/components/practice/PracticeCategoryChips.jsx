import { IconByName } from "../icons.jsx";

export function PracticeCategoryChips({ categories }) {
  return (
    <section className="practice-categories" aria-labelledby="practice-categories-title">
      <div className="practice-section-header">
        <p className="card-eyebrow card-eyebrow--red">Skill Focus</p>
        <h2 id="practice-categories-title">Practice types your teacher can assign</h2>
      </div>

      <div className="practice-category-grid">
        {categories.map((category) => (
          <div className="practice-category-chip" key={category.label}>
            <IconByName name={category.icon} />
            <span>{category.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

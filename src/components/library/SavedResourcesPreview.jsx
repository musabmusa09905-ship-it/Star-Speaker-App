import { BookIcon } from "../icons.jsx";

export function SavedResourcesPreview({ savedResources }) {
  return (
    <section className="card library-small-card saved-resources-card" aria-labelledby="saved-resources-title">
      <div className="library-card-icon" aria-hidden="true">
        <BookIcon />
      </div>
      <div>
        <h2 id="saved-resources-title">{savedResources.title}</h2>
        <p>{savedResources.message}</p>
      </div>
    </section>
  );
}

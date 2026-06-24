import { useState } from "react";

export function SpeakingChecklist({ items }) {
  const [checkedItems, setCheckedItems] = useState([]);

  const toggleItem = (item) => {
    setCheckedItems((current) =>
      current.includes(item)
        ? current.filter((checkedItem) => checkedItem !== item)
        : [...current, item]
    );
  };

  return (
    <section className="card speaking-checklist" aria-labelledby="checklist-title">
      <h2 id="checklist-title">Finish line check</h2>
      <div className="checklist-items">
        {items.map((item) => (
          <label key={item}>
            <input
              type="checkbox"
              checked={checkedItems.includes(item)}
              onChange={() => toggleItem(item)}
            />
            <span>{item}</span>
          </label>
        ))}
      </div>
    </section>
  );
}

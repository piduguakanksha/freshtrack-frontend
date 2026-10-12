
import { useEffect, useState } from "react";
import "./App.css";

const API = "https://freshtrack-backend-rd1n.onrender.com/api/groceries";

const CATEGORIES = [
  "Dairy",
  "Fruits",
  "Vegetables",
  "Meat",
  "Bakery",
  "Beverages",
  "Other",
];

const UNITS = [
  "pieces",
  "kg",
  "g",
  "litres",
  "ml",
  "packets",
  "bottles",
];

const STORAGE_LOCATIONS = [
  "Refrigerator",
  "Freezer",
  "Pantry",
  "Kitchen shelf",
  "Other",
];

function getLocalDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getExpiryStatus(expiryDate) {
  const today = getLocalDateString();

  if (!expiryDate) return "No expiry date";
  if (expiryDate < today) return "Expired";
  if (expiryDate === today) return "Expiring Today";

  const expiry = new Date(`${expiryDate}T00:00:00`);
  const todayDate = new Date(`${today}T00:00:00`);

  const daysLeft = Math.round(
    (expiry.getTime() - todayDate.getTime()) /
      (1000 * 60 * 60 * 24)
  );

  if (daysLeft <= 3) return "Expiring Soon";

  return "Fresh";
}

const emptyForm = () => ({
  name: "",
  category: "Dairy",
  quantity: 1,
  unit: "pieces",
  purchaseDate: getLocalDateString(),
  expiryDate: "",
  storageLocation: "Refrigerator",
  brand: "",
});

function App() {
  const [groceries, setGroceries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);

  const [searchText, setSearchText] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("All");

  const today = getLocalDateString();

  async function loadGroceries() {
    try {
      setError("");

      const response = await fetch(API);

      if (!response.ok) {
        throw new Error("Could not load groceries");
      }

      const data = await response.json();
      setGroceries(data);
    } catch {
      setError(
        "Cannot connect to the backend. Check that Spring Boot is running."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadGroceries();
  }, []);

  const expired = groceries.filter(
    (grocery) =>
      grocery.expiryDate && grocery.expiryDate < today
  );

  const expiringToday = groceries.filter(
    (grocery) => grocery.expiryDate === today
  );

  const expiringSoon = groceries.filter(
    (grocery) =>
      grocery.expiryDate &&
      grocery.expiryDate > today &&
      getExpiryStatus(grocery.expiryDate) === "Expiring Soon"
  );

  const filteredGroceries = groceries.filter((grocery) => {
    const matchesName = grocery.name
      .toLowerCase()
      .includes(searchText.trim().toLowerCase());

    const matchesCategory =
      selectedCategory === "All" ||
      grocery.category === selectedCategory;

    const matchesStatus =
      selectedStatus === "All" ||
      getExpiryStatus(grocery.expiryDate) === selectedStatus;

    return matchesName && matchesCategory && matchesStatus;
  });

  function updateField(event) {
    const { name, value } = event.target;

    setForm((previousForm) => ({
      ...previousForm,
      [name]: value,
    }));
  }

  async function saveGrocery(event) {
    event.preventDefault();

    try {
      setError("");

      const editing = editingId !== null;
      const url = editing ? `${API}/${editingId}` : API;

      const response = await fetch(url, {
        method: editing ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...form,
          quantity: Number(form.quantity),
        }),
      });

      if (!response.ok) {
        throw new Error("Save failed");
      }

      setForm(emptyForm());
      setEditingId(null);

      await loadGroceries();
    } catch {
      setError(
        "Could not save grocery. Check your backend and input."
      );
    }
  }

  function editGrocery(grocery) {
    setEditingId(grocery.id);

    setForm({
      name: grocery.name || "",
      category: grocery.category || "Other",
      quantity: grocery.quantity ?? 1,
      unit: grocery.unit || "pieces",
      purchaseDate:
        grocery.purchaseDate || getLocalDateString(),
      expiryDate: grocery.expiryDate || "",
      storageLocation:
        grocery.storageLocation || "Refrigerator",
      brand: grocery.brand || "",
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm());
    setError("");
  }

  async function deleteGrocery(id) {
    if (
      !window.confirm(
        "Are you sure you want to delete this grocery?"
      )
    ) {
      return;
    }

    try {
      setError("");

      const response = await fetch(`${API}/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Delete failed");
      }

      if (editingId === id) {
        cancelEdit();
      }

      await loadGroceries();
    } catch {
      setError("Could not delete the grocery item.");
    }
  }

  return (
    <main className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-icon">🥬</span>

          <div>
            <h1>FreshTrack</h1>
            <p>Smart grocery &amp; food waste management</p>
          </div>
        </div>

        <span className="live-badge">
          ● Inventory tracker
        </span>
      </header>

      <section className="welcome">
        <p className="eyebrow">YOUR SMART KITCHEN</p>
        <h2>Fresh food, less waste.</h2>
        <p>
          Keep track of your groceries and know what needs
          to be used first.
        </p>
      </section>

      {error && (
        <div className="error" role="alert">
          {error}
        </div>
      )}

      <section className="stats">
        <article className="stat-card">
          <span>Total groceries</span>
          <strong>{groceries.length}</strong>
          <small>Items in your inventory</small>
        </article>

        <article className="stat-card warning-card">
          <span>Expiring Today</span>
          <strong>{expiringToday.length}</strong>
          <small>Items expiring today</small>
        </article>

        <article className="stat-card">
          <span>Expiring Soon</span>
          <strong>{expiringSoon.length}</strong>
          <small>Items due within 3 days</small>
        </article>

        <article className="stat-card danger-card">
          <span>Expired items</span>
          <strong>{expired.length}</strong>
          <small>Items past their expiry date</small>
        </article>
      </section>

      <section className="content-grid">
        <section className="panel">
          <h3>
            {editingId !== null
              ? "✏️ Edit grocery"
              : "＋ Add a grocery"}
          </h3>

          <p className="muted">
            {editingId !== null
              ? "Update your grocery details."
              : "Enter the details of a grocery item."}
          </p>

          <form onSubmit={saveGrocery}>
            <label>
              Grocery name *
              <input
                name="name"
                value={form.name}
                onChange={updateField}
                placeholder="e.g. Milk"
                required
              />
            </label>

            <div className="two-cols">
              <label>
                Category
                <select
                  name="category"
                  value={form.category}
                  onChange={updateField}
                >
                  {CATEGORIES.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Quantity *
                <input
                  name="quantity"
                  type="number"
                  min="0.01"
                  step="any"
                  value={form.quantity}
                  onChange={updateField}
                  required
                />
              </label>
            </div>

            <div className="two-cols">
              <label>
                Unit
                <select
                  name="unit"
                  value={form.unit}
                  onChange={updateField}
                >
                  {UNITS.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Brand
                <input
                  name="brand"
                  value={form.brand}
                  onChange={updateField}
                  placeholder="Optional"
                />
              </label>
            </div>

            <div className="two-cols">
              <label>
                Purchase date *
                <input
                  name="purchaseDate"
                  type="date"
                  value={form.purchaseDate}
                  onChange={updateField}
                  required
                />
              </label>

              <label>
                Expiry date *
                <input
                  name="expiryDate"
                  type="date"
                  min={form.purchaseDate}
                  value={form.expiryDate}
                  onChange={updateField}
                  required
                />
              </label>
            </div>

            <label>
              Storage location
              <select
                name="storageLocation"
                value={form.storageLocation}
                onChange={updateField}
              >
                {STORAGE_LOCATIONS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <button className="primary-btn" type="submit">
              {editingId !== null
                ? "Save changes"
                : "＋ Save grocery"}
            </button>

            {editingId !== null && (
              <button
                className="refresh-btn"
                type="button"
                onClick={cancelEdit}
              >
                Cancel editing
              </button>
            )}
          </form>
        </section>

        <section className="panel inventory">
          <div className="inventory-heading">
            <div>
              <h3>Your inventory</h3>
              <p className="muted">
                Groceries saved in your database
              </p>
            </div>

            <button
              className="refresh-btn"
              type="button"
              onClick={loadGroceries}
            >
              ↻ Refresh
            </button>
          </div>

          <div className="filter-bar">
            <label>
              Search groceries
              <input
                type="search"
                value={searchText}
                onChange={(event) =>
                  setSearchText(event.target.value)
                }
                placeholder="Search by name..."
              />
            </label>

            <div className="two-cols">
              <label>
                Category
                <select
                  value={selectedCategory}
                  onChange={(event) =>
                    setSelectedCategory(event.target.value)
                  }
                >
                  <option value="All">All categories</option>
                  {CATEGORIES.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Expiry status
                <select
                  value={selectedStatus}
                  onChange={(event) =>
                    setSelectedStatus(event.target.value)
                  }
                >
                  <option value="All">All statuses</option>
                  <option value="Fresh">Fresh</option>
                  <option value="Expiring Soon">
                    Expiring Soon
                  </option>
                  <option value="Expiring Today">
                    Expiring Today
                  </option>
                  <option value="Expired">Expired</option>
                  <option value="No expiry date">
                    No expiry date
                  </option>
                </select>
              </label>
            </div>

            <p className="muted">
              Showing {filteredGroceries.length} of{" "}
              {groceries.length} groceries
            </p>
          </div>

          {loading ? (
            <p>Loading groceries...</p>
          ) : groceries.length === 0 ? (
            <div className="empty">
              <span>🧺</span>
              <h4>Your inventory is empty</h4>
              <p>Add your first grocery using the form.</p>
            </div>
          ) : filteredGroceries.length === 0 ? (
            <div className="empty">
              <span>🔎</span>
              <h4>No matching groceries</h4>
              <p>Try another search term or filter.</p>
              <button
                className="refresh-btn"
                type="button"
                onClick={() => {
                  setSearchText("");
                  setSelectedCategory("All");
                  setSelectedStatus("All");
                }}
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div className="grocery-list">
              {filteredGroceries.map((grocery) => {
                const status = getExpiryStatus(
                  grocery.expiryDate
                );

                const statusClass =
                  status === "Expired"
                    ? "status-expired"
                    : status === "Expiring Today"
                      ? "status-today"
                      : status === "Expiring Soon"
                        ? "status-soon"
                        : status === "Fresh"
                          ? "status-fresh"
                          : "status-no-date";

                return (
                  <article
                    className="grocery-item"
                    key={grocery.id}
                  >
                    <div className="food-icon">🥗</div>

                    <div className="food-info">
                      <h4>{grocery.name}</h4>

                      <p>
                        {grocery.category} · {grocery.quantity}{" "}
                        {grocery.unit}
                      </p>

                      {grocery.brand && (
                        <p>Brand: {grocery.brand}</p>
                      )}

                      <p>
                        Expires:{" "}
                        {grocery.expiryDate || "Not set"}
                      </p>

                      <p>
                        Stored in:{" "}
                        {grocery.storageLocation || "Not set"}
                      </p>

                      <span
                        className={`status ${statusClass}`}
                      >
                        {status}
                      </span>
                    </div>

                    <div className="item-actions">
                      <button
                        className="refresh-btn"
                        type="button"
                        onClick={() => editGrocery(grocery)}
                      >
                        Edit
                      </button>

                      <button
                        className="delete-btn"
                        type="button"
                        onClick={() =>
                          deleteGrocery(grocery.id)
                        }
                        aria-label={`Delete ${grocery.name}`}
                      >
                        Delete
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </section>

      <footer>
        FreshTrack · Make every grocery count. 🌱
      </footer>
    </main>
  );
}

export default App;

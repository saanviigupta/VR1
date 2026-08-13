# 🛒 Shop for Future Self

**Visualize and shop for your brighter future self.**

A small, stationary WebXR mini-game built with A-Frame. Pick a goal, watch groceries
ride a conveyor belt in front of you, grab the ones you need, and drop them in your
cart — all without taking a single step.

---

## 🎮 How to Play

1. **Choose a goal** from the floating menu — Pasta Night, Healthy Lunch, Breakfast,
   or Healthy Snack.
2. **Watch the conveyor belt.** Groceries slide past — some match your list, some don't.
3. **Grab an item** (click it on desktop, point your Quest controller laser at it and
   pull the trigger). It'll follow your cursor/hand.
4. **Drop it in the cart** — click/trigger the cart while holding an item.
   - ✅ Correct ingredient → it snaps into the basket and your list updates.
   - ❌ Wrong ingredient → a quick shake + "Not needed for this recipe" message, and
     it goes right back on the belt. No fail state, just try again.
5. Collect all 4 ingredients to trigger confetti and "You're ready for your future!"
6. Hit **Shop Again** to pick a new goal.

You never move. Everything happens within arm's reach of one spot.

---

## 📁 Project Structure

```
shop-future-self/
├── index.html        # The scene: player, conveyor, cart, menu, UI, lighting
├── js/
│   ├── components.js # 3 small interaction components (grocery-item, cart-zone, ui-button)
│   ├── game.js        # Recipes, grocery catalog, config, and all game state
│   └── audio.js        # Optional procedural WebAudio sound effects
└── README.md
```

---

## 🖥️ Run Locally (desktop testing)

A-Frame needs the page served over `http://`, not opened as a `file://` path.

**Option A — VS Code Live Server**
1. Open the folder in VS Code.
2. Right-click `index.html` → **Open with Live Server**.
3. Click into the page, then look around with the mouse. Click groceries to grab
   them and click the cart to place them. No WASD — you don't move.

**Option B — any static server**
```bash
cd shop-future-self
python3 -m http.server 8080
# then open http://localhost:8080
```

---

## 🥽 Test on Meta Quest

1. Host the folder somewhere reachable by the headset (GitHub Pages, Netlify,
   Vercel, or your dev machine's LAN IP + Live Server).
2. Open the URL in the Quest Browser.
3. Click **Enter VR** (bottom-right button, auto-shown by `vr-mode-ui`).
4. Stand still — point a controller's laser at a grocery and pull the trigger to
   grab it, point at the cart and pull the trigger again to place it.

The controllers use A-Frame's built-in `laser-controls`, so grabbing/placing works
the same way as the desktop mouse cursor — no extra code path needed.

---

## 🔧 Where to Change Things

Everything tunable lives in **`js/game.js`**, at the top of the file:

- **Recipes / shopping lists** → edit the `recipes` object. Each entry needs a
  `name`, `emoji`, and an `ingredients` array of catalog ids (4 is the sweet spot).
- **Grocery items** (what can appear on the belt) → edit `groceryCatalog`. Add a
  new entry with a `name`, `emoji`, and `color`, and it can be referenced by any
  recipe or show up as a distractor immediately.
- **Sizes / speed / layout** → edit `GAME_CONFIG`:
  - `groceryScale` — resizes every grocery item everywhere.
  - `conveyorSpeed` — how fast items travel (metres/second).
  - `conveyorHeight` / `conveyorHalfLength` — belt height and length.
  - `poolSize` — how many items exist on the belt at once.
- **Conveyor / cart position** → the `#conveyor` and `#cart` entities' `position`
  attributes in `index.html`.
- **Cart basket slots** (where collected items snap to) → `CART_SLOT_LOCAL` in
  `js/game.js`.

## 🎨 Visual Style

Deliberately not the old bakery's pink/kawaii palette — this is a clean,
teal-and-gold "future market" look (`#00D9B5` teal accent, `#FFB84D` gold accent,
deep green-black `#0a221f` base) meant to feel optimistic and a little
futuristic rather than cozy.

Enjoy shopping for your future self! ✨

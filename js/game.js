/**
 * 🛒 Shop for Future Self — Game Logic
 * game.js
 *
 * Everything you'd want to tweak lives at the top of this file:
 *   - GAME_CONFIG   → sizes, speeds, positions
 *   - groceryCatalog → every grocery that can appear, its emoji + color
 *   - recipes        → each goal and its 4 required ingredients
 *
 * The player never moves. Items ride the conveyor; clicking/triggering one
 * "grabs" it and it follows your cursor/hand; clicking/triggering the cart
 * tries to place it. Everything else (spawning, recycling, win condition,
 * confetti) is handled by the ShopGame class below.
 */

// ─────────────────────────────────────────────
// 1. EASY-TO-EDIT CONFIG
// ─────────────────────────────────────────────
const GAME_CONFIG = {
  groceryScale: 0.6,         // change this to resize every grocery, everywhere
  cartScale: 1.0,
  conveyorHeight: 1.02,      // world Y of the belt surface / item height
  conveyorHalfLength: 0.95,  // belt spans -0.95 .. +0.95 (local X of #conveyor)
  conveyorSpeed: 0.3,        // metres / second
  poolSize: 6,               // how many grocery items exist on the belt at once
  playerHeight: 1.6,
};

// Where each collected ingredient snaps to inside the cart basket
// (local space of the #cart entity).
const CART_SLOT_LOCAL = [
  { x: -0.13, y: 0.3, z: -0.08 },
  { x: 0.13, y: 0.3, z: -0.08 },
  { x: -0.13, y: 0.3, z: 0.08 },
  { x: 0.13, y: 0.3, z: 0.08 },
];

// ─────────────────────────────────────────────
// 2. GROCERY CATALOG — the single source of truth for every item
// ─────────────────────────────────────────────
const groceryCatalog = {
  tomato:   { name: 'Tomato',   emoji: '🍅', color: '#ff5a4e' },
  pasta:    { name: 'Pasta',    emoji: '🍝', color: '#f2c94c' },
  cheese:   { name: 'Cheese',   emoji: '🧀', color: '#ffd15c' },
  basil:    { name: 'Basil',    emoji: '🌿', color: '#3fa34d' },
  lettuce:  { name: 'Lettuce',  emoji: '🥬', color: '#8bc34a' },
  cucumber: { name: 'Cucumber', emoji: '🥒', color: '#4caf7d' },
  avocado:  { name: 'Avocado',  emoji: '🥑', color: '#7cb518' },
  apple:    { name: 'Apple',    emoji: '🍎', color: '#ff6b6b' },
  banana:   { name: 'Banana',   emoji: '🍌', color: '#ffe066' },
  bread:    { name: 'Bread',    emoji: '🥖', color: '#d9a566' },
  milk:     { name: 'Milk',     emoji: '🥛', color: '#eaf6ff' },
  carrot:   { name: 'Carrot',   emoji: '🥕', color: '#ff9f40' },
};

// ─────────────────────────────────────────────
// 3. RECIPES — change/add goals here, nowhere else
// ─────────────────────────────────────────────
const recipes = {
  pasta: {
    name: 'Pasta Night', emoji: '🍝',
    ingredients: ['pasta', 'tomato', 'cheese', 'basil'],
  },
  salad: {
    name: 'Healthy Lunch', emoji: '🥗',
    ingredients: ['lettuce', 'tomato', 'cucumber', 'avocado'],
  },
  breakfast: {
    name: 'Breakfast', emoji: '🥞',
    ingredients: ['bread', 'milk', 'banana', 'apple'],
  },
  snack: {
    name: 'Healthy Snack', emoji: '🍎',
    ingredients: ['apple', 'banana', 'carrot', 'cheese'],
  },
};

// ─────────────────────────────────────────────
// 4. EMOJI SPRITE HELPER (cached canvas → data URL texture)
// ─────────────────────────────────────────────
const _emojiTextureCache = {};
function getEmojiDataURL(emoji) {
  if (_emojiTextureCache[emoji]) return _emojiTextureCache[emoji];
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, size, size);
  ctx.font = `${Math.floor(size * 0.72)}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(emoji, size / 2, size / 2 + size * 0.06);
  const url = canvas.toDataURL('image/png');
  _emojiTextureCache[emoji] = url;
  return url;
}

// ─────────────────────────────────────────────
// 5. GROCERY PREFAB — reusable instance builder
// ─────────────────────────────────────────────
function createGroceryEntity(itemId) {
  const s = GAME_CONFIG.groceryScale;
  const wrap = document.createElement('a-entity');
  wrap.classList.add('grocery-item');
  wrap.setAttribute('grocery-item', '');
  wrap.dataset.itemId = itemId;
  wrap.dataset.placed = 'false';
  wrap.dataset.held = 'false';
  wrap.setAttribute('scale', `${s} ${s} ${s}`);

  // Invisible hit box — generous, so grabbing feels forgiving.
  wrap.setAttribute('geometry', 'primitive: box; width: 0.6; height: 0.6; depth: 0.35');
  wrap.setAttribute('material', 'opacity: 0; transparent: true; shader: flat');

  // Hover ring (hidden until moused/lasered over)
  const ring = document.createElement('a-circle');
  ring.classList.add('item-ring');
  ring.setAttribute('radius', '0.36');
  ring.setAttribute('position', '0 0 -0.02');
  ring.setAttribute('material', 'color: #ffffff; shader: flat; opacity: 0; transparent: true; side: double');
  wrap.appendChild(ring);

  const disc = document.createElement('a-circle');
  disc.classList.add('item-disc');
  disc.setAttribute('radius', '0.28');
  disc.setAttribute('material', `color: ${groceryCatalog[itemId].color}; shader: flat; side: double`);
  wrap.appendChild(disc);

  const plane = document.createElement('a-plane');
  plane.classList.add('item-emoji');
  plane.setAttribute('width', '0.34');
  plane.setAttribute('height', '0.34');
  plane.setAttribute('position', '0 0 0.01');
  // IMPORTANT: material must be set as an OBJECT here, not a style-string.
  // The emoji texture is a data:image/png;base64,... URL, which contains a
  // semicolon — A-Frame's string-attribute parser splits on ";" and would
  // silently truncate the src and corrupt the whole material component.
  plane.setAttribute('material', {
    shader: 'flat', src: getEmojiDataURL(groceryCatalog[itemId].emoji), transparent: true, side: 'double',
  });
  wrap.appendChild(plane);

  return wrap;
}

function updateGroceryVisual(el, itemId) {
  el.dataset.itemId = itemId;
  const def = groceryCatalog[itemId];
  const disc = el.querySelector('.item-disc');
  if (disc) disc.setAttribute('material', 'color', def.color);
  const plane = el.querySelector('.item-emoji');
  if (plane) plane.setAttribute('material', 'src', getEmojiDataURL(def.emoji)); // safe now: schema is correctly established
}

// ─────────────────────────────────────────────
// 6. GAME CLASS
// ─────────────────────────────────────────────
class ShopGame {
  constructor() {
    this.camera = document.querySelector('[camera]');
    this.conveyorEl = document.getElementById('conveyor');
    this.cartEl = document.getElementById('cart');

    this.pool = [];             // { el, x }
    this.heldItem = null;
    this.holder = null;
    this.currentRecipe = null;
    this.collected = new Set();

    this.buildMenu();
    this.spawnPool();

    this._prevT = performance.now();
    this.running = true;
    this._loop = this._loop.bind(this);
    requestAnimationFrame(this._loop);
  }

  _sfx(name) {
    try { if (window.shopAudio) window.shopAudio.play(name); } catch (e) {}
  }

  // ── Main loop ──────────────────────────────────────────────────
  _loop(t) {
    const dt = Math.min((t - this._prevT) / 1000, 0.05);
    this._prevT = t;
    try {
      this.tickConveyor(dt);
      this.tickHeldItem();
      if (window.shopAudio && this.camera) window.shopAudio.updateListener(this.camera.object3D);
    } catch (e) {
      console.error('[game.js] tick error (continuing):', e);
    }
    if (this.running) requestAnimationFrame(this._loop);
  }

  // ── Conveyor ────────────────────────────────────────────────────
  spawnPool() {
    const n = GAME_CONFIG.poolSize;
    for (let i = 0; i < n; i++) {
      const itemId = this.pickWeightedItemId();
      const el = createGroceryEntity(itemId);
      const x = -GAME_CONFIG.conveyorHalfLength + (i / (n - 1)) * (GAME_CONFIG.conveyorHalfLength * 2);
      el.setAttribute('position', `${x.toFixed(2)} ${GAME_CONFIG.conveyorHeight} 0`);
      this.conveyorEl.appendChild(el);
      this.pool.push({ el, x });
    }
  }

  spawnReplacement() {
    const itemId = this.pickWeightedItemId();
    const el = createGroceryEntity(itemId);
    const x = -GAME_CONFIG.conveyorHalfLength;
    el.setAttribute('position', `${x} ${GAME_CONFIG.conveyorHeight} 0`);
    this.conveyorEl.appendChild(el);
    this.pool.push({ el, x });
  }

  pickWeightedItemId() {
    const allIds = Object.keys(groceryCatalog);
    if (this.currentRecipe) {
      const need = this.currentRecipe.ingredients.filter((id) => !this.collected.has(id));
      if (need.length && Math.random() < 0.55) {
        return need[Math.floor(Math.random() * need.length)];
      }
    }
    return allIds[Math.floor(Math.random() * allIds.length)];
  }

  tickConveyor(dt) {
    for (const slot of this.pool) {
      if (slot.el === this.heldItem) continue;
      if (slot.el.dataset.placed === 'true') continue;
      slot.x += GAME_CONFIG.conveyorSpeed * dt;
      if (slot.x > GAME_CONFIG.conveyorHalfLength) {
        slot.x = -GAME_CONFIG.conveyorHalfLength;
        updateGroceryVisual(slot.el, this.pickWeightedItemId());
      }
      slot.el.setAttribute('position', `${slot.x.toFixed(3)} ${GAME_CONFIG.conveyorHeight} 0`);
    }
  }

  // ── Grabbing ────────────────────────────────────────────────────
  toggleGrab(el, holderEl) {
    if (el.dataset.placed === 'true') return;

    if (this.heldItem === el) {
      this.releaseToConveyor(el);
      return;
    }
    if (this.heldItem) this.releaseToConveyor(this.heldItem);

    this.heldItem = el;
    this.holder = (holderEl && holderEl.classList.contains('vr-hand')) ? holderEl : this.camera;
    el.dataset.held = 'true';
    const s = GAME_CONFIG.groceryScale * 1.15;
    el.setAttribute('scale', `${s} ${s} ${s}`);
    this._sfx('pickup');
  }

  releaseToConveyor(el) {
    el.dataset.held = 'false';
    const s = GAME_CONFIG.groceryScale;
    el.setAttribute('scale', `${s} ${s} ${s}`);
    const slot = this.pool.find((sl) => sl.el === el);
    if (slot) {
      slot.x = Math.max(-GAME_CONFIG.conveyorHalfLength, Math.min(GAME_CONFIG.conveyorHalfLength, slot.x));
      el.setAttribute('position', `${slot.x.toFixed(3)} ${GAME_CONFIG.conveyorHeight} 0`);
    }
    if (this.heldItem === el) { this.heldItem = null; this.holder = null; }
  }

  tickHeldItem() {
    if (!this.heldItem || !this.holder) return;
    const holdObj = this.holder.object3D;
    const worldPos = new THREE.Vector3();
    const worldQuat = new THREE.Quaternion();
    holdObj.getWorldPosition(worldPos);
    holdObj.getWorldQuaternion(worldQuat);

    const isCam = (this.holder === this.camera);
    const off = isCam ? { x: 0, y: -0.22, z: -0.55 } : { x: 0, y: 0.02, z: -0.15 };
    const offset = new THREE.Vector3(off.x, off.y, off.z).applyQuaternion(worldQuat);
    worldPos.add(offset);

    const parent = this.heldItem.object3D.parent;
    const localPos = worldPos.clone();
    if (parent) { parent.updateWorldMatrix(true, false); parent.worldToLocal(localPos); }
    this.heldItem.object3D.position.copy(localPos);
  }

  // ── Placing ─────────────────────────────────────────────────────
  tryPlaceHeld() {
    if (!this.heldItem || !this.currentRecipe) return;
    const el = this.heldItem;
    const itemId = el.dataset.itemId;
    const needed = this.currentRecipe.ingredients.includes(itemId) && !this.collected.has(itemId);
    if (needed) this.placeCorrect(el, itemId);
    else this.rejectItem(el);
  }

  placeCorrect(el, itemId) {
    this.collected.add(itemId);
    el.dataset.placed = 'true';
    this.heldItem = null;
    this.holder = null;

    const slotIndex = this.collected.size - 1;
    const local = CART_SLOT_LOCAL[slotIndex] || { x: 0, y: 0.34, z: 0 };
    const worldTarget = new THREE.Vector3(local.x, local.y, local.z);
    this.cartEl.object3D.localToWorld(worldTarget);

    const parent = el.object3D.parent;
    const localTarget = worldTarget.clone();
    if (parent) parent.worldToLocal(localTarget);

    el.removeAttribute('animation__place');
    el.setAttribute('animation__place', {
      property: 'position',
      to: `${localTarget.x.toFixed(3)} ${localTarget.y.toFixed(3)} ${localTarget.z.toFixed(3)}`,
      dur: 320, easing: 'easeOutBack',
    });
    const s = GAME_CONFIG.groceryScale * 0.85;
    el.setAttribute('scale', `${s} ${s} ${s}`);

    const idx = this.pool.findIndex((sl) => sl.el === el);
    if (idx >= 0) this.pool.splice(idx, 1);

    this._sfx('correct');
    this.updateShoppingListVisual();
    this.spawnReplacement();

    if (this.collected.size >= this.currentRecipe.ingredients.length) {
      setTimeout(() => this.triggerWin(), 500);
    }
  }

  rejectItem(el) {
    this._sfx('wrong');
    const disc = el.querySelector('.item-disc');
    const origColor = groceryCatalog[el.dataset.itemId].color;
    if (disc) {
      disc.setAttribute('material', 'color', '#ff5c5c');
      setTimeout(() => { if (disc.isConnected) disc.setAttribute('material', 'color', origColor); }, 380);
    }
    el.setAttribute('animation__shake', {
      property: 'rotation', from: '0 0 -10', to: '0 0 10', dur: 70, dir: 'alternate', loop: 4, easing: 'easeInOutSine',
    });
    this.showToast('Not needed for this recipe');
    setTimeout(() => {
      el.removeAttribute('animation__shake');
      el.setAttribute('rotation', '0 0 0');
      this.releaseToConveyor(el);
    }, 480);
  }

  showToast(msg) {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.style.opacity = '1';
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => { t.style.opacity = '0'; }, 1200);
  }

  // ── Shopping list ──────────────────────────────────────────────
  buildShoppingList() {
    const rows = document.getElementById('list-rows');
    while (rows.firstChild) rows.removeChild(rows.firstChild);

    const title = document.getElementById('list-title');
    title.setAttribute('value', `${this.currentRecipe.emoji} ${this.currentRecipe.name}`);

    this.currentRecipe.ingredients.forEach((id, i) => {
      const def = groceryCatalog[id];
      const row = document.createElement('a-text');
      row.setAttribute('id', `list-row-${id}`);
      row.setAttribute('value', `\u25A1 ${def.emoji} ${def.name}`);
      row.setAttribute('align', 'left');
      row.setAttribute('width', '2.4');
      row.setAttribute('color', '#F4FFFC');
      row.setAttribute('position', `-0.55 ${-0.18 * i} 0.01`);
      rows.appendChild(row);
    });
  }

  updateShoppingListVisual() {
    if (!this.currentRecipe) return;
    this.currentRecipe.ingredients.forEach((id) => {
      const row = document.getElementById(`list-row-${id}`);
      if (!row) return;
      const def = groceryCatalog[id];
      const done = this.collected.has(id);
      row.setAttribute('value', `${done ? '\u2713' : '\u25A1'} ${def.emoji} ${def.name}`);
      row.setAttribute('color', done ? '#00D9B5' : '#F4FFFC');
    });
  }

  // ── Menu ────────────────────────────────────────────────────────
  buildMenu() {
    const container = document.getElementById('recipe-menu-buttons');
    while (container.firstChild) container.removeChild(container.firstChild);

    const ids = Object.keys(recipes);
    const cols = 2;
    const spacingX = 0.66, spacingY = 0.36;

    ids.forEach((id, i) => {
      const r = recipes[id];
      const col = i % cols, row = Math.floor(i / cols);
      const x = (col - (cols - 1) / 2) * spacingX;
      const y = -row * spacingY;

      const btn = document.createElement('a-entity');
      btn.classList.add('ui-button');
      btn.setAttribute('ui-button', `action: select-recipe; value: ${id}`);
      btn.setAttribute('geometry', 'primitive: plane; width: 0.6; height: 0.28');
      btn.setAttribute('material', 'color: #0F3B39; opacity: 0.88; shader: flat; side: double');
      btn.setAttribute('position', `${x.toFixed(2)} ${y.toFixed(2)} 0`);

      const label = document.createElement('a-text');
      label.setAttribute('value', `${r.emoji} ${r.name}`);
      label.setAttribute('align', 'center');
      label.setAttribute('color', '#EAFBF8');
      label.setAttribute('width', '2.0');
      label.setAttribute('position', '0 0 0.01');
      btn.appendChild(label);

      container.appendChild(btn);
    });
  }

  selectRecipe(id) {
    const recipe = recipes[id];
    if (!recipe) return;
    this.currentRecipe = recipe;
    this.collected = new Set();

    document.getElementById('recipe-menu').setAttribute('visible', false);
    document.getElementById('shopping-list-panel').setAttribute('visible', true);
    this.buildShoppingList();

    // Re-seed the belt to favor this recipe's ingredients.
    this.pool.forEach((slot) => updateGroceryVisual(slot.el, this.pickWeightedItemId()));
  }

  // ── Win / reset ────────────────────────────────────────────────
  triggerWin() {
    this._sfx('complete');
    document.getElementById('shopping-list-panel').setAttribute('visible', false);
    document.getElementById('completion-panel').setAttribute('visible', true);

    const glow = document.querySelector('#cart .cart-glow');
    if (glow) {
      glow.removeAttribute('animation__glow');
      glow.setAttribute('animation__glow', {
        property: 'material.opacity', from: 0.1, to: 0.5, dir: 'alternate', dur: 380, loop: 6,
      });
    }
    this.spawnConfetti();
  }

  spawnConfetti() {
    const scene = document.querySelector('a-scene');
    const colors = ['#00D9B5', '#FFB84D', '#FF6B9D', '#7CE0FF', '#FFE066'];
    for (let i = 0; i < 26; i++) {
      setTimeout(() => {
        const piece = document.createElement('a-box');
        const c = colors[Math.floor(Math.random() * colors.length)];
        const x = (Math.random() * 1.6 - 0.4);
        const z = -0.9 - Math.random() * 1.6;
        const y0 = 2.5 + Math.random() * 0.6;
        piece.setAttribute('width', 0.045);
        piece.setAttribute('height', 0.045);
        piece.setAttribute('depth', 0.01);
        piece.setAttribute('material', `color: ${c}; shader: flat; side: double`);
        piece.setAttribute('position', `${x.toFixed(2)} ${y0.toFixed(2)} ${z.toFixed(2)}`);
        piece.setAttribute('rotation', `${Math.random() * 360} ${Math.random() * 360} ${Math.random() * 360}`);
        piece.setAttribute('animation__fall', {
          property: 'position',
          to: `${(x + (Math.random() - 0.5) * 0.5).toFixed(2)} 0.05 ${z.toFixed(2)}`,
          dur: 1400 + Math.random() * 900, easing: 'easeInQuad',
        });
        piece.setAttribute('animation__spin', {
          property: 'rotation',
          to: `${Math.random() * 720} ${Math.random() * 720} ${Math.random() * 720}`,
          dur: 1800, easing: 'linear',
        });
        scene.appendChild(piece);
        setTimeout(() => piece.remove(), 2600);
      }, i * 40);
    }
  }

  reset() {
    document.querySelectorAll('#conveyor .grocery-item').forEach((e) => e.remove());
    this.pool = [];
    this.heldItem = null;
    this.holder = null;
    this.currentRecipe = null;
    this.collected = new Set();

    document.getElementById('completion-panel').setAttribute('visible', false);
    document.getElementById('shopping-list-panel').setAttribute('visible', false);
    document.getElementById('recipe-menu').setAttribute('visible', true);

    this.spawnPool();
  }
}

// ─────────────────────────────────────────────
// 7. INIT
// ─────────────────────────────────────────────
const _shopSceneEl = document.querySelector('a-scene');
function _startShopGame() { window.shopGame = new ShopGame(); }
if (_shopSceneEl.hasLoaded) _startShopGame();
else _shopSceneEl.addEventListener('loaded', _startShopGame);

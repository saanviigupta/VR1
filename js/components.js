/**
 * 🛒 Shop for Future Self — A-Frame Components
 * components.js
 *
 * Only the reusable interaction components the game actually needs.
 * These fire identically whether the pointer is the desktop mouse cursor
 * (cursor component on the camera) or a Quest controller laser
 * (laser-controls, which raises the same mouseenter/mouseleave/click
 * events on trigger). That's the whole trick that keeps VR + desktop
 * interaction unified with no extra code path.
 */

// ─────────────────────────────────────────────
// GROCERY-ITEM
// Click/trigger to grab an item off the conveyor. Click/trigger it again
// (while held) to put it back down without using the cart.
// ─────────────────────────────────────────────
AFRAME.registerComponent('grocery-item', {
  init: function () {
    const el = this.el;

    this.onEnter = () => {
      if (el.dataset.placed === 'true') return;
      const ring = el.querySelector('.item-ring');
      if (ring) ring.setAttribute('material', 'opacity', 0.55);
      el.setAttribute('animation__hover', {
        property: 'scale', to: '1.15 1.15 1.15', dur: 120, easing: 'easeOutQuad',
      });
    };

    this.onLeave = () => {
      if (el.dataset.placed === 'true') return;
      if (window.shopGame && window.shopGame.heldItem === el) return;
      const ring = el.querySelector('.item-ring');
      if (ring) ring.setAttribute('material', 'opacity', 0);
      el.setAttribute('animation__hover', {
        property: 'scale', to: '1 1 1', dur: 120, easing: 'easeOutQuad',
      });
    };

    this.onClick = (e) => {
      if (el.dataset.placed === 'true') return;
      e.stopPropagation();
      const holder = (e.detail && e.detail.cursorEl) ? e.detail.cursorEl : null;
      if (window.shopGame) window.shopGame.toggleGrab(el, holder);
    };

    el.addEventListener('mouseenter', this.onEnter);
    el.addEventListener('mouseleave', this.onLeave);
    el.addEventListener('click', this.onClick);
  },

  remove: function () {
    this.el.removeEventListener('mouseenter', this.onEnter);
    this.el.removeEventListener('mouseleave', this.onLeave);
    this.el.removeEventListener('click', this.onClick);
  },
});

// ─────────────────────────────────────────────
// CART-ZONE
// Click/trigger while holding a grocery item to try placing it in the cart.
// ─────────────────────────────────────────────
AFRAME.registerComponent('cart-zone', {
  init: function () {
    const el = this.el;

    this.onEnter = () => {
      if (!window.shopGame || !window.shopGame.heldItem) return;
      el.setAttribute('animation__glow', {
        property: 'material.opacity', to: 0.4, dur: 150,
      });
    };

    this.onLeave = () => {
      el.setAttribute('animation__glow', {
        property: 'material.opacity', to: 0.12, dur: 150,
      });
    };

    this.onClick = (e) => {
      e.stopPropagation();
      if (window.shopGame) window.shopGame.tryPlaceHeld();
    };

    el.addEventListener('mouseenter', this.onEnter);
    el.addEventListener('mouseleave', this.onLeave);
    el.addEventListener('click', this.onClick);
  },

  remove: function () {
    this.el.removeEventListener('mouseenter', this.onEnter);
    this.el.removeEventListener('mouseleave', this.onLeave);
    this.el.removeEventListener('click', this.onClick);
  },
});

// ─────────────────────────────────────────────
// UI-BUTTON
// Generic clickable panel used by the recipe menu and the replay button.
// schema: action = "select-recipe" | "replay", value = recipe id (optional)
// ─────────────────────────────────────────────
AFRAME.registerComponent('ui-button', {
  schema: {
    action: { type: 'string', default: '' },
    value: { type: 'string', default: '' },
  },

  init: function () {
    const el = this.el;

    this.onEnter = () => {
      el.setAttribute('animation__hover', { property: 'scale', to: '1.06 1.06 1.06', dur: 110 });
    };

    this.onLeave = () => {
      el.setAttribute('animation__hover', { property: 'scale', to: '1 1 1', dur: 110 });
    };

    this.onClick = (e) => {
      e.stopPropagation();
      if (!window.shopGame) return;
      window.shopGame._sfx('click');
      if (this.data.action === 'select-recipe') window.shopGame.selectRecipe(this.data.value);
      else if (this.data.action === 'replay') window.shopGame.reset();
    };

    el.addEventListener('mouseenter', this.onEnter);
    el.addEventListener('mouseleave', this.onLeave);
    el.addEventListener('click', this.onClick);
  },

  remove: function () {
    this.el.removeEventListener('mouseenter', this.onEnter);
    this.el.removeEventListener('mouseleave', this.onLeave);
    this.el.removeEventListener('click', this.onClick);
  },
});

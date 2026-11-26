// Keyboard and mouse input. Arrows / WASD fly the plane, Space is the
// airbrake, mouse position steers pitch toward the pointer, Enter or a
// click starts and restarts. Keys are tracked as a held set so the world
// step can read them every frame.
export function makeInput() {
  return {
    up: false,
    down: false,
    throttleUp: false,
    throttleDown: false,
    brake: false,
    // Mouse pitch in degrees, or null when the mouse is not steering.
    mousePitch: null,
    mouseX: 0,
    mouseY: 0,
    pressed: false,
    // Edge-triggered actions, consumed by the world step.
    startPressed: false,
    mutePressed: false,
    pausePressed: false,
  };
}

const KEYMAP = {
  ArrowUp: 'up',
  KeyW: 'up',
  ArrowDown: 'down',
  KeyS: 'down',
  ArrowRight: 'throttleUp',
  KeyD: 'throttleUp',
  ArrowLeft: 'throttleDown',
  KeyA: 'throttleDown',
  Space: 'brake',
};

export function attachInput(input, canvas) {
  window.addEventListener('keydown', (event) => {
    if (event.code === 'Enter' || event.code === 'Space') input.startPressed = true;
    if (event.code === 'KeyM') input.mutePressed = true;
    if (event.code === 'KeyP') input.pausePressed = true;
    const field = KEYMAP[event.code];
    if (field) {
      input[field] = true;
      event.preventDefault();
    }
  });
  window.addEventListener('keyup', (event) => {
    const field = KEYMAP[event.code];
    if (field) input[field] = false;
  });
  canvas.addEventListener('mousemove', (event) => {
    const rect = canvas.getBoundingClientRect();
    input.mouseX = event.clientX - rect.left;
    input.mouseY = event.clientY - rect.top;
    // Pointer above the plane's screen line climbs, below it descends.
    const dy = 360 - input.mouseY;
    input.mousePitch = Math.max(-20, Math.min(24, dy * 0.09));
  });
  canvas.addEventListener('mouseleave', () => {
    input.mousePitch = null;
  });
  canvas.addEventListener('mousedown', () => {
    input.pressed = true;
    input.startPressed = true;
  });
  window.addEventListener('mouseup', () => {
    input.pressed = false;
  });
  // Touch: drag steers pitch, tap starts.
  canvas.addEventListener('touchstart', (event) => {
    input.startPressed = true;
    event.preventDefault();
  }, { passive: false });
}

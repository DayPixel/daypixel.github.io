const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
const size = { width: 40, height: 42.5 };

// GhostCore/GhostWorld.swift and WindowMotion.swift, in the app's point/second units.
// shortcut: this page has one simulated window; desktop tracking stays in the native app.
export class PoffWorld {
  constructor(width, height) {
    this.time = 1;
    this.agents = [0, 1].map(index => ({
      index, x: 0, y: 0, vx: 0, vy: 0, mode: index ? 'float' : 'perch', seated: !index,
      lean: 0, spin: 0, spinVelocity: 0, squash: 0, squashVelocity: 0,
      hem: index * 2, eyeX: 0, eyeY: 0, heading: 2, turn: 0, restUntil: 0,
      cooldown: 0, waveFrom: 0, waveUntil: 0, bubble: '', bubbleUntil: 0
    }));
    this.resize(width, height);
    this.agents.forEach(agent => Object.assign(agent, this.seat(agent)));
    this.agents[1].y = 16;
    this.agents[1].x = 16;
    this.nextRoam = 9;
    this.reversals = [];
    this.direction = { x: 0, y: 0 };
  }

  resize(width, height) {
    this.width = width;
    this.height = height;
    this.window = { x: (width - Math.min(270, width - 32)) / 2, y: height * .44, width: Math.min(270, width - 32), height: 100 };
    this.agents.forEach(agent => {
      if (agent.seated) Object.assign(agent, this.seat(agent), { vx: 0, vy: 0 });
      this.bound(agent);
    });
  }

  seat(agent) {
    return { x: this.window.x + this.window.width * (agent.index ? .75 : .25) - size.width / 2, y: this.window.y - size.height + 5 };
  }

  bound(agent) {
    agent.x = clamp(agent.x, 2, this.width - size.width - 2);
    agent.y = clamp(agent.y, 2, this.height - size.height - 2);
  }

  moveWindow(x, y, at) {
    x = clamp(x, 8, this.width - this.window.width - 8);
    y = clamp(y, size.height + 12, this.height - this.window.height - 8);
    let shook = false;
    if (this.lastDrag && at > this.lastDrag.at) {
      const dt = at - this.lastDrag.at;
      const velocity = { x: (x - this.lastDrag.x) / dt, y: (y - this.lastDrag.y) / dt };
      for (const axis of ['x', 'y']) {
        const direction = velocity[axis] > 250 ? 1 : velocity[axis] < -250 ? -1 : 0;
        if (direction) {
          if (this.direction[axis] && direction !== this.direction[axis]) this.reversals.push(at);
          this.direction[axis] = direction;
        }
      }
      this.reversals = this.reversals.filter(time => at - time <= 1);
      if (this.reversals.length >= 3 || Math.hypot(velocity.x, velocity.y) > 2600) {
        shook = this.shake(velocity);
        this.reversals = [];
      }
    }
    Object.assign(this.window, { x, y });
    this.lastDrag = { x, y, at };
    return shook;
  }

  shake(velocity = { x: 0, y: 0 }) {
    let shook = false;
    this.agents.filter(agent => agent.seated).forEach(agent => {
      Object.assign(agent, { mode: 'tumble', seated: false,
        vx: velocity.x * .45 + (agent.index ? 60 : -60), vy: Math.min(velocity.y * .45, 0) - 420,
        spinVelocity: agent.index ? 7 : -7, tumbleUntil: this.time + 1.2,
        cooldown: this.time + 3.5, bubble: 'oops', bubbleUntil: this.time + 1.6 });
      shook = true;
    });
    return shook;
  }

  greet(index) {
    Object.assign(this.agents[index], { waveFrom: this.time, waveUntil: this.time + 1.8, bubble: 'hello', bubbleUntil: this.time + 2.3 });
  }

  update(dt, mouse) {
    // Small substeps keep the native springs stable on slow displays and after a stall.
    dt = clamp(dt, 0, .05);
    this.mouseSpeed = mouse && this.lastMouse && dt > 0 ? Math.hypot(mouse.x - this.lastMouse.x, mouse.y - this.lastMouse.y) / dt : 0;
    this.lastMouse = mouse;
    while (dt > 0) {
      const step = Math.min(dt, 1 / 120);
      this.step(step, mouse);
      dt -= step;
    }
  }

  step(dt, mouse) {
    this.time += dt;
    if (this.time >= this.nextRoam) {
      const roamer = this.agents[1];
      if (roamer.mode !== 'tumble' && this.time >= roamer.cooldown) {
        roamer.mode = roamer.mode === 'float' ? 'perch' : 'float';
        roamer.seated = false;
      }
      this.nextRoam = this.time + 10;
    }
    for (const agent of this.agents) {
      if (this.time >= agent.bubbleUntil) agent.bubble = '';
      if (agent.mode === 'tumble' && this.time >= agent.tumbleUntil) agent.mode = 'float';
      if (agent.mode === 'float' && agent.cooldown && this.time >= agent.cooldown) { agent.mode = 'perch'; agent.cooldown = 0; }
      const seat = this.seat(agent);
      const mouseDistance = mouse ? Math.hypot(agent.x + 20 - mouse.x, agent.y + size.height / 2 - mouse.y) : Infinity;
      if (agent.seated && this.mouseSpeed > 250 && mouseDistance < 54) agent.seated = false;
      if (agent.index === this.pausedIndex && !agent.seated && agent.mode !== 'tumble') {
        agent.vx *= Math.max(0, 1 - dt * 10); agent.vy *= Math.max(0, 1 - dt * 10);
        agent.x += agent.vx * dt; agent.y += agent.vy * dt;
      } else if (agent.mode === 'tumble') {
        agent.vy += 1500 * dt;
        agent.x += agent.vx * dt; agent.y += agent.vy * dt;
        agent.spin += agent.spinVelocity * dt;
        if (agent.y > this.height - size.height - 2) {
          agent.vy *= -.35; agent.vx *= .7; agent.spinVelocity *= .6; agent.squashVelocity += 3;
        }
        if (agent.x < 2 || agent.x > this.width - size.width - 2) agent.vx *= -.5;
      } else if (agent.seated) {
        agent.vx += ((seat.x - agent.x) * 320 - agent.vx * 36) * dt;
        agent.vy += ((seat.y - agent.y) * 320 - agent.vy * 36) * dt;
        agent.x += agent.vx * dt; agent.y += agent.vy * dt;
      } else {
        let fx, fy;
        const maxSpeed = agent.mode === 'perch' ? 320 : 55;
        if (agent.mode === 'perch') {
          const dx = seat.x - agent.x, dy = seat.y - agent.y, distance = Math.hypot(dx, dy);
          const speed = maxSpeed * Math.min(1, distance / 140);
          fx = ((distance > .01 ? dx * speed / distance : 0) - agent.vx) * 4;
          fy = ((distance > .01 ? dy * speed / distance : 0) - agent.vy) * 4;
        } else {
          agent.turn = clamp(agent.turn + (Math.random() * 2 - 1) * 1.6 * dt, -.8, .8);
          agent.heading += agent.turn * dt;
          const cx = agent.x + 20, cy = agent.y + size.height / 2;
          if (cx < 60 || cx > this.width - 60 || cy < 60 || cy > this.height - 60) {
            const inward = Math.atan2(this.height / 2 - cy, this.width / 2 - cx);
            const difference = Math.atan2(Math.sin(inward - agent.heading), Math.cos(inward - agent.heading));
            agent.heading += difference * Math.min(1, dt * 2.5);
          }
          fx = (Math.cos(agent.heading) * maxSpeed * .8 - agent.vx) * 2;
          fy = (Math.sin(agent.heading) * maxSpeed * .8 - agent.vy) * 2;
          if (this.time < agent.restUntil) { fx = -agent.vx * 2.5; fy = -agent.vy * 2.5; }
          else if (Math.random() < dt * .07) agent.restUntil = this.time + 1.2 + Math.random() * 2;
          for (const other of this.agents.filter(other => other !== agent && !other.seated)) {
            const dx = agent.x - other.x, dy = agent.y - other.y, distance = Math.hypot(dx, dy);
            if (distance > .01 && distance < 52) { fx += dx * (52 - distance) * 14 / distance; fy += dy * (52 - distance) * 14 / distance; }
          }
        }
        const force = Math.hypot(fx, fy), limit = agent.mode === 'perch' ? 900 : 140;
        if (force > limit) { fx *= limit / force; fy *= limit / force; }
        if (this.mouseSpeed > 250 && mouseDistance > .01 && mouseDistance < 90) {
          const avoid = (90 - mouseDistance) / 90 * 1600 / mouseDistance;
          fx += (agent.x + 20 - mouse.x) * avoid; fy += (agent.y + size.height / 2 - mouse.y) * avoid;
        }
        agent.vx += fx * dt; agent.vy += fy * dt;
        const speed = Math.hypot(agent.vx, agent.vy);
        if (speed > maxSpeed * 1.6) { agent.vx *= maxSpeed * 1.6 / speed; agent.vy *= maxSpeed * 1.6 / speed; }
        agent.x += agent.vx * dt; agent.y += agent.vy * dt;
        if (agent.mode === 'perch' && !(this.mouseSpeed > 250 && mouseDistance < 90) && Math.hypot(seat.x - agent.x, seat.y - agent.y) < 2.5 && speed < 60) {
          Object.assign(agent, seat, { seated: true, vx: 0, vy: 0 }); agent.squashVelocity += 3.5;
        }
      }
      this.bound(agent);
      const speed = Math.hypot(agent.vx, agent.vy);
      const targetLean = agent.mode === 'tumble' ? 0 : agent.seated ? clamp(-agent.vx / 700, -.28, .28) : clamp(agent.vx / 500, -.22, .22);
      agent.lean += (targetLean - agent.lean) * Math.min(1, dt * 6);
      if (agent.mode !== 'tumble') { agent.spin = Math.atan2(Math.sin(agent.spin), Math.cos(agent.spin)); agent.spin -= agent.spin * Math.min(1, dt * 8); }
      agent.squashVelocity += (-260 * agent.squash - 12 * agent.squashVelocity) * dt;
      agent.squash += agent.squashVelocity * dt;
      const dx = mouse ? mouse.x - agent.x - 20 : agent.vx, dy = mouse ? mouse.y - agent.y - size.height / 2 : agent.vy;
      const distance = Math.hypot(dx, dy), look = mouse ? 1 : Math.min(1, speed / 60);
      agent.eyeX += ((distance > .01 ? dx / distance * look * 1.6 : 0) - agent.eyeX) * Math.min(1, dt * 8);
      agent.eyeY += ((distance > .01 ? dy / distance * look * 1.6 : 0) - agent.eyeY) * Math.min(1, dt * 8);
      agent.hem += dt * (2.4 + speed / 50);
    }
  }

  pose(agent) {
    const speed = Math.hypot(agent.vx, agent.vy), waving = this.time < agent.waveUntil;
    const envelope = waving ? Math.max(0, Math.min(1, (this.time - agent.waveFrom) / .15, (agent.waveUntil - this.time) / .35)) : 0;
    const sway = Math.sin((this.time - agent.waveFrom) * 2 * Math.PI * 1.8 + agent.index) * .17 * envelope;
    const bob = agent.mode === 'tumble' ? 0 : agent.seated ? Math.sin(this.time * 7 + agent.index) * .7 : Math.sin(this.time * 2.1 + agent.index) * 3.2 * (1 - Math.min(speed / 120, .6));
    const fall = agent.seated ? 0 : Math.min(Math.abs(agent.vy) / 900, .1);
    return { x: agent.x, y: agent.y + bob, rotation: agent.lean + agent.spin + sway,
      scaleX: 1 + agent.squash * .6 - fall * .5, scaleY: 1 - agent.squash + fall,
      blink: !waving && (this.time + agent.index * 1.37) % 4.3 < .13, happy: waving };
  }
}

// Same 24-point hem and circular head as GhostShape.svgBody.
export function bodyPath(phase) {
  let path = 'M4 16 A12 12 0 0 1 28 16';
  for (let x = 28; x >= 4; x--) path += ` L${x} ${(29.6 + 1.7 * Math.sin(x * Math.PI / 4 + phase)).toFixed(2)}`;
  return path + ' Z';
}

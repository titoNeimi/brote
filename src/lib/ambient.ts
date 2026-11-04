import type { Ambient } from "../store";

/**
 * Sonidos ambiente sintetizados con WebAudio (ruido filtrado), sin archivos de audio.
 */
class AmbientPlayer {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private nodes: AudioNode[] = [];
  private kind: Ambient = "none";

  play(kind: Ambient, volume: number) {
    if (kind === this.kind) {
      this.setVolume(volume);
      return;
    }
    this.stop();
    if (kind === "none") return;
    this.kind = kind;
    const ctx = (this.ctx ??= new AudioContext());
    void ctx.resume();
    this.master = ctx.createGain();
    this.master.gain.value = 0;
    this.master.gain.linearRampToValueAtTime(volume * 0.6, ctx.currentTime + 1.5);
    this.master.connect(ctx.destination);
    this.nodes = BUILD[kind](ctx, this.master);
  }

  setVolume(volume: number) {
    if (this.ctx && this.master) this.master.gain.setTargetAtTime(volume * 0.6, this.ctx.currentTime, 0.1);
  }

  stop() {
    const { ctx, master, nodes } = this;
    this.kind = "none";
    if (!ctx || !master) return;
    master.gain.setTargetAtTime(0, ctx.currentTime, 0.3);
    setTimeout(() => {
      nodes.forEach((n) => {
        if (n instanceof AudioScheduledSourceNode) n.stop();
        n.disconnect();
      });
      master.disconnect();
    }, 1500);
    this.master = null;
    this.nodes = [];
  }
}

function noiseBuffer(ctx: AudioContext, color: "white" | "pink" | "brown"): AudioBuffer {
  const length = ctx.sampleRate * 4;
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;
  let b0 = 0, b1 = 0, b2 = 0;
  for (let i = 0; i < length; i++) {
    const white = Math.random() * 2 - 1;
    if (color === "white") data[i] = white;
    else if (color === "brown") {
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.5;
    } else {
      b0 = 0.99765 * b0 + white * 0.099046;
      b1 = 0.963 * b1 + white * 0.2965164;
      b2 = 0.57 * b2 + white * 1.0526913;
      data[i] = (b0 + b1 + b2 + white * 0.1848) * 0.2;
    }
  }
  return buffer;
}

function loop(ctx: AudioContext, buffer: AudioBuffer): AudioBufferSourceNode {
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.loop = true;
  src.start();
  return src;
}

const BUILD: Record<Exclude<Ambient, "none">, (ctx: AudioContext, out: AudioNode) => AudioNode[]> = {
  rain: (ctx, out) => {
    const src = loop(ctx, noiseBuffer(ctx, "pink"));
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 400;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 6000;
    src.connect(hp).connect(lp).connect(out);
    return [src, hp, lp];
  },
  forest: (ctx, out) => {
    // Viento: ruido marrón con un filtro que se abre y cierra lentamente.
    const src = loop(ctx, noiseBuffer(ctx, "brown"));
    const bp = ctx.createBiquadFilter();
    bp.type = "lowpass";
    bp.frequency.value = 500;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.08;
    const depth = ctx.createGain();
    depth.gain.value = 300;
    lfo.connect(depth).connect(bp.frequency);
    lfo.start();
    src.connect(bp).connect(out);
    return [src, bp, lfo, depth];
  },
  brown: (ctx, out) => {
    const src = loop(ctx, noiseBuffer(ctx, "brown"));
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 900;
    src.connect(lp).connect(out);
    return [src, lp];
  },
};

export const AMBIENT_LABEL: Record<Ambient, string> = {
  none: "Ninguno",
  rain: "🌧️ Lluvia",
  forest: "🍃 Viento en el bosque",
  brown: "🟤 Ruido marrón",
};

export const ambient = new AmbientPlayer();

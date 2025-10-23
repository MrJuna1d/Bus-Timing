// index.js (ESM). If you use CommonJS, swap imports for require().
import { io } from "socket.io-client";
import { gunzipSync } from "node:zlib";

const socket = io("https://rapidbus-socketio-avl.prasarana.com.my", {
  path: "/socket.io/",
  transports: ["websocket"],
  extraHeaders: {
    Origin: "https://myrapidbus.prasarana.com.my",
  }
});

function decodeMaybeGzip(x) {
  if (typeof x === "string" && x.startsWith("H4sI")) {
    try {
      const buf = Buffer.from(x, "base64");
      const txt = gunzipSync(buf).toString("utf8");
      try { return JSON.parse(txt); } catch { return txt; }
    } catch (e) {
      return { __decodeError: e.message, rawPrefix: x.slice(0, 60) + "..." };
    }
  }
  return x;
}

function emitWithAck(event, payload) {
  return new Promise((resolve) => {
    try {
      socket.timeout(3000).emit(event, payload, (err, ack) => {
        resolve({ event, ok: !err, err, ack });
      });
    } catch (e) {
      resolve({ event, ok: false, err: e, ack: null });
    }
  });
}

let timer;

socket.on("connect", async () => {
  console.log("✅ Connected:", socket.id);

  //make this dynamic
  const route = "T5800";

  const evt = "onFts-reload";
  const payload = { provider: "RKL", route: route};

  console.log(`testing:\n Event: ${evt} \n Payload: ${payload.provider}, ${payload.route}`)
  const res = await emitWithAck(evt, payload);
  console.log("↪️  sent", evt, payload, "→ ack:", res);

  console.log("🕓 Waiting for server events…");

  timer = setInterval(() => {
    if (socket.connected) {
      emitWithAck("onFts-reload", { provider: "RKL", route: "T5800" });
    }
  }, 10_000);
});


socket.onAny((event, ...args) => {
  const decoded = args.map(decodeMaybeGzip);
  console.log(`📩 Location: ${event}`);
  console.dir(decoded, { depth: null });
});

socket.on("connect_error", (err) => {
  console.error("connect_error:", err?.message, err?.data);
});
socket.on("disconnect", (reason) => {
  console.log("❌ Disconnected:", reason);
  if(timer) clearInterval(timer)
});

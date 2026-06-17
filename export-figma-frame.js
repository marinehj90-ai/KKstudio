#!/usr/bin/env node
// Connects to relay, exports Figma node, saves PNG to public/guide/
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

const NODE_ID = '5869:7386';          // 기획전상단와이드 frame
const OUT_PATH = path.join(__dirname, 'public/guide/pc-exhibition-wide.png');
const CHANNEL = 'claude';
const PORT = 3055;

const ws = new WebSocket(`ws://localhost:${PORT}`);
const id = 'export-' + Date.now();

ws.on('open', () => {
  console.log('[export] Connected to relay');
  // Join channel
  ws.send(JSON.stringify({ id: id + '-join', type: 'join', channel: CHANNEL }));
});

ws.on('message', (raw) => {
  let msg;
  try { msg = JSON.parse(raw.toString()); } catch { return; }

  const inner = msg.message;
  if (!inner) return;

  // join ack → send export command
  if (inner.result && inner.result.channel === CHANNEL) {
    console.log('[export] Joined channel, sending export command...');
    ws.send(JSON.stringify({
      id,
      type: 'message',
      channel: CHANNEL,
      message: { id, command: 'export_node_as_image', params: { nodeId: NODE_ID, format: 'PNG', scale: 1 } }
    }));
    return;
  }

  // export result
  if (inner.id === id && inner.result) {
    const { imageData } = inner.result;
    if (!imageData) { console.error('[export] No imageData in result'); ws.close(); return; }
    const buf = Buffer.from(imageData, 'base64');
    fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
    fs.writeFileSync(OUT_PATH, buf);
    console.log(`[export] Saved ${buf.length} bytes → ${OUT_PATH}`);
    ws.close();
    process.exit(0);
  }

  if (inner.id === id && inner.error) {
    console.error('[export] Error:', inner.error);
    ws.close();
    process.exit(1);
  }
});

ws.on('error', (e) => { console.error('[export] WS error:', e.message); process.exit(1); });
setTimeout(() => { console.error('[export] Timeout'); process.exit(1); }, 60000);

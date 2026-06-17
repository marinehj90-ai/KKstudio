#!/usr/bin/env node
// WebSocket relay server for cursor-talk-to-figma-mcp
// MCP sends: { id, type:'message', channel, message: { id, command, params } }
// Figma plugin expects: { id, type: command, ...params }
// Figma plugin responds: { id, result/error, channel }
// MCP expects response: { message: { id, result/error } }

const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 3055;
const channels = {}; // { channelName: Set<ws> }
const clientChannels = new Map(); // ws → channelName

const wss = new WebSocketServer({ port: PORT });
console.log(`[socket] WebSocket relay server started on ws://localhost:${PORT}`);

wss.on('connection', (ws) => {
  console.log(`[socket] Client connected (total: ${wss.clients.size})`);

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    const { type, id, channel } = msg;

    // join: 채널 등록
    if (type === 'join') {
      const ch = channel || 'default';
      if (!channels[ch]) channels[ch] = new Set();

      // 기존 채널에서 제거
      const prev = clientChannels.get(ws);
      if (prev && channels[prev]) channels[prev].delete(ws);

      channels[ch].add(ws);
      clientChannels.set(ws, ch);
      console.log(`[socket] Client joined channel: ${ch} (members: ${channels[ch].size})`);

      // MCP expects response as { message: { id, result } }
      ws.send(JSON.stringify({ message: { id, result: { success: true, channel: ch } } }));
      return;
    }

    // 채널에 속한 다른 클라이언트에게 브로드캐스트 (포맷 변환 포함)
    const ch = clientChannels.get(ws);
    if (!ch || !channels[ch]) {
      ws.send(JSON.stringify({ id, error: 'Not in a channel. Send {type:"join", channel:"..."} first.' }));
      return;
    }

    for (const client of channels[ch]) {
      if (client !== ws && client.readyState !== 1) continue;
      if (client === ws) continue;

      // MCP → Figma: { type:'message', message: { id, command, params } }
      //   → Figma receives: { id, type: command, ...params }
      if (type === 'message' && msg.message && msg.message.command) {
        const { id: msgId, command, params } = msg.message;
        const toFigma = { id: msgId, type: command, ...params };
        console.log(`[socket] MCP→Figma [${ch}] command=${command} id=${msgId}`);
        client.send(JSON.stringify(toFigma));
      }
      // Figma → MCP: { id, result/error, channel }
      //   → MCP receives: { message: { id, result/error } }
      else if (msg.result !== undefined || msg.error !== undefined) {
        const toMcp = { message: { id: msg.id, result: msg.result, error: msg.error } };
        console.log(`[socket] Figma→MCP [${ch}] id=${msg.id} ${msg.error ? 'error' : 'result'}`);
        client.send(JSON.stringify(toMcp));
      }
      // fallback: 원본 그대로
      else {
        console.log(`[socket] Relay [${ch}] type=${type} id=${id}`);
        client.send(raw.toString());
      }
    }
  });

  ws.on('close', () => {
    const ch = clientChannels.get(ws);
    if (ch && channels[ch]) channels[ch].delete(ws);
    clientChannels.delete(ws);
    console.log(`[socket] Client disconnected (channel: ${ch || 'none'})`);
  });

  ws.on('error', (err) => console.error(`[socket] Error: ${err.message}`));
});

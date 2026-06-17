figma.showUI(__html__, { width: 340, height: 360, title: 'Talk to Claude' });

figma.ui.onmessage = async (msg) => {
  if (msg.type !== 'ws_message') return;
  const { data } = msg;
  const { id, type } = data;
  let result;
  try {
    result = await handleCommand(type, data);
    // 쓰기 작업 후 undo 스냅샷 등록
    const writeOps = ['resize_node','move_node','set_fill_color','set_text_content',
                      'create_frame','create_rectangle','create_text','delete_node',
                      'set_corner_radius','set_layout_mode','set_padding'];
    if (writeOps.includes(type)) figma.commitUndo();
  } catch (e) {
    figma.ui.postMessage({ type: 'send_to_ws', data: { id, error: e.message || String(e) } });
    return;
  }
  figma.ui.postMessage({ type: 'send_to_ws', data: { id, result } });
};

async function handleCommand(type, params) {
  switch (type) {
    case 'get_document_info':
      return {
        name: figma.root.name,
        currentPage: { id: figma.currentPage.id, name: figma.currentPage.name },
        pages: figma.root.children.map(p => ({ id: p.id, name: p.name })),
      };
    case 'get_selection':
      return figma.currentPage.selection.map(nodeInfo);
    case 'get_node_info':
      return nodeInfo(figma.getNodeById(params.nodeId));
    case 'resize_node': {
      const node = figma.getNodeById(params.nodeId);
      if (!node || !('resize' in node)) throw new Error('Node not found');
      node.resize(params.width !== undefined ? params.width : node.width, params.height !== undefined ? params.height : node.height);
      return nodeInfo(node);
    }
    case 'move_node': {
      const node = figma.getNodeById(params.nodeId);
      if (!node || !('x' in node)) throw new Error('Node not found');
      if (params.x !== undefined) node.x = params.x;
      if (params.y !== undefined) node.y = params.y;
      return nodeInfo(node);
    }
    case 'set_fill_color': {
      const node = figma.getNodeById(params.nodeId);
      if (!node) throw new Error('Node not found');
      if (!('fills' in node)) throw new Error('Node does not support fills');
      const { r, g, b, a = 1 } = params.color;
      const paint = { type: 'SOLID', color: { r: +r, g: +g, b: +b }, opacity: +a };
      node.fills = [paint];
      return nodeInfo(node);
    }
    case 'set_text_content': {
      const node = figma.getNodeById(params.nodeId);
      if (!node || node.type !== 'TEXT') throw new Error('Not a text node');
      // fontName이 Symbol(mixed)일 수 있으므로 안전하게 처리
      const fn = node.fontName;
      if (typeof fn === 'symbol') {
        // 혼합 폰트: 전체를 Inter Regular로 통일 후 설정
        await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
        node.fontName = { family: 'Inter', style: 'Regular' };
      } else {
        await figma.loadFontAsync(fn);
      }
      node.characters = params.text;
      return nodeInfo(node);
    }
    case 'create_frame': {
      const frame = figma.createFrame();
      frame.name = params.name || 'Frame';
      frame.x = params.x !== undefined ? params.x : 0;
      frame.y = params.y !== undefined ? params.y : 0;
      frame.resize(params.width !== undefined ? params.width : 400, params.height !== undefined ? params.height : 300);
      figma.currentPage.appendChild(frame);
      return nodeInfo(frame);
    }
    case 'create_rectangle': {
      const rect = figma.createRectangle();
      rect.name = params.name || 'Rectangle';
      rect.x = params.x !== undefined ? params.x : 0;
      rect.y = params.y !== undefined ? params.y : 0;
      rect.resize(params.width !== undefined ? params.width : 100, params.height !== undefined ? params.height : 100);
      figma.currentPage.appendChild(rect);
      return nodeInfo(rect);
    }
    case 'create_text': {
      const text = figma.createText();
      await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
      text.x = params.x !== undefined ? params.x : 0;
      text.y = params.y !== undefined ? params.y : 0;
      text.characters = params.text || '';
      if (params.fontSize) text.fontSize = params.fontSize;
      figma.currentPage.appendChild(text);
      return nodeInfo(text);
    }
    case 'delete_node': {
      const node = figma.getNodeById(params.nodeId);
      if (!node) throw new Error('Node not found');
      node.remove();
      return { deleted: params.nodeId };
    }
    case 'set_multiple_text_contents': {
      const items = params.text || [];
      const results = [];
      var applied = 0;
      var failed = 0;
      for (var i = 0; i < items.length; i++) {
        var item = items[i];
        var tnode = figma.getNodeById(item.nodeId);
        if (!tnode || tnode.type !== 'TEXT') {
          results.push({ nodeId: item.nodeId, success: false, error: 'Not a text node' });
          failed++;
          continue;
        }
        try {
          var tfn = tnode.fontName;
          if (typeof tfn === 'symbol') {
            await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
            tnode.fontName = { family: 'Inter', style: 'Regular' };
          } else {
            await figma.loadFontAsync(tfn);
          }
          tnode.characters = item.text;
          results.push({ nodeId: item.nodeId, success: true, name: tnode.name });
          applied++;
        } catch(e) {
          results.push({ nodeId: item.nodeId, success: false, error: e.message });
          failed++;
        }
      }
      return { replacementsApplied: applied, replacementsFailed: failed, completedInChunks: 1, results: results };
    }
    case 'scan_nodes_by_types': {
      const types = params.types || [];
      const found = [];
      const walk = (n) => { if (types.includes(n.type)) found.push(nodeInfo(n)); if ('children' in n) n.children.forEach(walk); };
      figma.currentPage.children.forEach(walk);
      return found;
    }
    case 'export_node_as_image': {
      const node = figma.getNodeById(params.nodeId);
      if (!node) throw new Error('Node not found');
      var fmt = (params.format || 'PNG').toUpperCase();
      var sc = params.scale || 1;
      var settings = { format: fmt, constraint: { type: 'SCALE', value: sc } };
      var bytes = await node.exportAsync(settings);
      // Uint8Array → base64
      var binary = '';
      for (var bi = 0; bi < bytes.length; bi++) binary += String.fromCharCode(bytes[bi]);
      var b64 = btoa(binary);
      return { imageData: b64, mimeType: fmt === 'JPG' ? 'image/jpeg' : fmt === 'SVG' ? 'image/svg+xml' : 'image/png' };
    }
    case 'join': return { joined: true };
    default: throw new Error(`Unknown command: ${type}`);
  }
}

function nodeInfo(node) {
  if (!node) return null;
  return {
    id: node.id, name: node.name, type: node.type,
    x: 'x' in node ? Math.round(node.x) : undefined,
    y: 'y' in node ? Math.round(node.y) : undefined,
    width: 'width' in node ? Math.round(node.width) : undefined,
    height: 'height' in node ? Math.round(node.height) : undefined,
  };
}

'use strict';
(function () {
  if (!window || !window.settings || !window.settings.secure_path) {
    return;
  }

  const securePath = window.settings.secure_path.replace(/^\/+|\/+$/g, '');
<<<<<<< HEAD
  const apiHost = (window.settings.apiHost || window.settings.host || '').replace(/\/+$/, '');
=======
  const apiHost = (window.settings.apiHost || window.settings.host || '').replace(/\/+$/, '');
>>>>>>> a635fc3c (feat(admin): add telegram broadcast)
  const apiPrefix = '/api/v1/';
  const basePath = apiPrefix + securePath + '/';
  const apiBase = apiHost ? apiHost + basePath : basePath;
  const BLOCK_ID = 'telegram-broadcast-block';
  const MODAL_ID = 'telegram-broadcast-modal';

  const state = {
    modal: null,
    plansLoaded: false,
    plans: [],
    loadingPlans: false,
    sending: false,
    logLimit: 200
  };

  function injectStyles() {
    if (document.getElementById('telegram-broadcast-styles')) {
      return;
    }
    const style = document.createElement('style');
    style.id = 'telegram-broadcast-styles';
    style.textContent = `
      body.tb-modal-open { overflow: hidden; }
      #${MODAL_ID} { position: fixed; inset: 0; background: rgba(17, 24, 39, 0.45); z-index: 2600; display: none; align-items: center; justify-content: center; padding: 24px; }
      #${MODAL_ID}.active { display: flex; }
      #${MODAL_ID} .tb-modal-card { width: min(640px, 100%); max-height: calc(100vh - 60px); background: #ffffff; border-radius: 12px; box-shadow: 0 22px 80px rgba(15, 23, 42, 0.25); display: flex; flex-direction: column; }
      #${MODAL_ID} .tb-modal-header { padding: 20px 24px 16px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #f1f5f9; }
      #${MODAL_ID} .tb-modal-title { font-size: 18px; font-weight: 600; color: #0f172a; }
      #${MODAL_ID} .tb-modal-close { background: transparent; border: none; font-size: 20px; cursor: pointer; color: #64748b; line-height: 1; padding: 4px; }
      #${MODAL_ID} .tb-modal-close:hover { color: #1e293b; }
      #${MODAL_ID} .tb-modal-body { padding: 20px 24px; overflow-y: auto; }
      #${MODAL_ID} .tb-field { margin-bottom: 16px; text-align: left; }
      #${MODAL_ID} .tb-field label { display: block; font-weight: 600; font-size: 13px; color: #1e293b; margin-bottom: 6px; }
      #${MODAL_ID} .tb-field select,
      #${MODAL_ID} .tb-field textarea { width: 100%; border: 1px solid #cbd5f5; border-radius: 6px; padding: 10px 12px; font-size: 13px; color: #1f2937; }
      #${MODAL_ID} .tb-field textarea { resize: vertical; min-height: 140px; }
      #${MODAL_ID} .tb-field small { display: block; margin-top: 4px; color: #64748b; }
      #${MODAL_ID} .tb-modal-footer { padding: 16px 24px 20px; display: flex; justify-content: flex-end; gap: 8px; border-top: 1px solid #f1f5f9; }
      #${MODAL_ID} .tb-status { margin-bottom: 16px; border-radius: 6px; padding: 10px 12px; font-size: 13px; display: none; }
      #${MODAL_ID} .tb-status.active { display: block; }
      #${MODAL_ID} .tb-status.tb-success { background: #ecfdf5; color: #047857; border: 1px solid #bbf7d0; }
      #${MODAL_ID} .tb-status.tb-error { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }
      #${MODAL_ID} .tb-status.tb-info { background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; }
      #${MODAL_ID} .tb-log { border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; max-height: 220px; overflow-y: auto; background: #f8fafc; font-size: 12px; color: #0f172a; }
      #${MODAL_ID} .tb-log ul { margin: 8px 0 0; padding-left: 18px; }
      #${MODAL_ID} .tb-log li { margin-bottom: 4px; }
      #${MODAL_ID} .tb-inline-loading::after { content: ''; width: 12px; height: 12px; border: 2px solid rgba(148,163,184,0.5); border-top-color: rgba(30,64,175,0.9); border-radius: 50%; display: inline-block; margin-left: 6px; animation: tb-spin 0.8s linear infinite; vertical-align: middle; }
      @keyframes tb-spin { to { transform: rotate(360deg); } }
    `;
    document.head.appendChild(style);
  }

  function createBlock() {
    const block = document.createElement('div');
    block.id = BLOCK_ID;
    block.className = 'row';
    block.style.padding = '20px';
    block.style.borderBottom = '1px solid #eee';

    const left = document.createElement('div');
    left.className = 'col-lg-6';
    left.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 5px;">群发消息</div>
      <div style="font-size: 12px; margin-bottom: 5px; color: #666;">向已绑定 Telegram 的用户群发通知，可按订阅状态筛选目标。</div>
    `;

    const right = document.createElement('div');
    right.className = 'col-lg-6 text-right';
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'ant-btn ant-btn-primary';
    button.textContent = '群发消息';
    button.addEventListener('click', () => {
      ensureModal();
      openModal();
    });
    right.appendChild(button);

    block.appendChild(left);
    block.appendChild(right);
    return block;
  }

  function ensureModal() {
    if (state.modal) {
      return;
    }
    injectStyles();
    const overlay = document.createElement('div');
    overlay.id = MODAL_ID;
    overlay.innerHTML = `
      <div class="tb-modal-card" role="dialog" aria-modal="true">
        <div class="tb-modal-header">
          <span class="tb-modal-title">Telegram 群发消息</span>
          <button type="button" class="tb-modal-close" aria-label="关闭">×</button>
        </div>
        <div class="tb-modal-body">
          <div class="tb-status" id="tb-status"></div>
          <div class="tb-field">
            <label for="tb-broadcast-target">群发目标</label>
            <select id="tb-broadcast-target">
              <option value="all">所有已绑定 Telegram 的用户</option>
              <option value="active">目前有订阅的用户</option>
              <option value="history">目前或曾经有订阅的用户</option>
              <option value="plan">指定订阅的用户</option>
            </select>
          </div>
          <div class="tb-field" id="tb-plan-field" style="display:none;">
            <label for="tb-plan-select">选择订阅</label>
            <select id="tb-plan-select" multiple size="6"></select>
            <small>按住 Ctrl / Cmd 支持多选。</small>
          </div>
          <div class="tb-field">
            <label for="tb-message">群发内容</label>
            <textarea id="tb-message" placeholder="请输入要发送的消息，支持 Telegram Markdown。"></textarea>
            <small>建议控制在 2000 个字符以内。</small>
          </div>
          <div class="tb-field">
            <label>发送结果</label>
            <div class="tb-log" id="tb-log">尚未发送。</div>
          </div>
        </div>
        <div class="tb-modal-footer">
          <button type="button" class="ant-btn" id="tb-cancel-btn">取消</button>
          <button type="button" class="ant-btn ant-btn-primary" id="tb-send-btn">发送</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) {
        closeModal();
      }
    });
    overlay.querySelector('.tb-modal-close').addEventListener('click', closeModal);
    overlay.querySelector('#tb-cancel-btn').addEventListener('click', closeModal);
    overlay.querySelector('#tb-broadcast-target').addEventListener('change', handleTargetChange);
    overlay.querySelector('#tb-send-btn').addEventListener('click', handleSend);

    state.modal = overlay;
  }

  function handleTargetChange(event) {
    const target = event.target.value;
    const planField = state.modal.querySelector('#tb-plan-field');
    if (target === 'plan') {
      planField.style.display = 'block';
      if (!state.plansLoaded && !state.loadingPlans) {
        loadPlans();
      }
    } else {
      planField.style.display = 'none';
    }
  }

  function openModal() {
    if (!state.modal) {
      return;
    }
    state.modal.classList.add('active');
    document.body.classList.add('tb-modal-open');
    resetModal();
  }

  function closeModal() {
    if (!state.modal) {
      return;
    }
    state.modal.classList.remove('active');
    document.body.classList.remove('tb-modal-open');
  }

  function resetModal() {
    const targetSelect = state.modal.querySelector('#tb-broadcast-target');
    const messageInput = state.modal.querySelector('#tb-message');
    const statusBox = state.modal.querySelector('#tb-status');
    const logBox = state.modal.querySelector('#tb-log');

    targetSelect.value = 'all';
    messageInput.value = '';
    statusBox.className = 'tb-status';
    statusBox.textContent = '';
    logBox.textContent = '尚未发送。';
    handleTargetChange({ target: targetSelect });
  }

  function loadPlans() {
    state.loadingPlans = true;
    updateStatus('info', '订阅列表加载中，请稍候...', true);
    let plansUrl = apiBase + 'plan/fetch';
    const auth = getAuthData();
    if (auth) {
      plansUrl += (plansUrl.includes('?') ? '&' : '?') + 'auth_data=' + encodeURIComponent(auth);
    }
    fetch(plansUrl, {
      method: 'GET',
      credentials: 'same-origin',
      headers: buildHeaders()
    }).then(response => response.json())
      .then(payload => {
        state.loadingPlans = false;
        state.plansLoaded = true;
        const data = payload && payload.data ? payload.data : [];
        state.plans = Array.isArray(data) ? data : [];
        renderPlanOptions();
        updateStatus('success', '订阅列表已加载。');
      })
      .catch(error => {
        state.loadingPlans = false;
        updateStatus('error', '订阅列表加载失败：' + (error && error.message ? error.message : '未知错误'));
      });
  }

  function renderPlanOptions() {
    if (!state.modal) {
      return;
    }
    const select = state.modal.querySelector('#tb-plan-select');
    if (!select) {
      return;
    }
    select.innerHTML = '';
    if (!Array.isArray(state.plans) || state.plans.length === 0) {
      const option = document.createElement('option');
      option.disabled = true;
      option.textContent = '暂无可选订阅';
      select.appendChild(option);
      return;
    }
    state.plans.forEach(plan => {
      const option = document.createElement('option');
      option.value = plan.id;
      option.textContent = plan.name || ('#' + plan.id);
      select.appendChild(option);
    });
  }

  function updateStatus(type, message, loading) {
    if (!state.modal) {
      return;
    }
    const statusBox = state.modal.querySelector('#tb-status');
    if (!statusBox) {
      return;
    }
    statusBox.className = 'tb-status';
    statusBox.classList.remove('tb-inline-loading');
    statusBox.textContent = '';
    if (!type || !message) {
      return;
    }
    const classMap = {
      success: 'tb-success',
      error: 'tb-error',
      info: 'tb-info'
    };
    statusBox.classList.add(classMap[type] || 'tb-info');
    if (loading) {
      statusBox.classList.add('tb-inline-loading');
    }
    statusBox.textContent = message;
    statusBox.classList.add('active');
  }

  function handleSend() {
    if (state.sending || !state.modal) {
      return;
    }
    const targetSelect = state.modal.querySelector('#tb-broadcast-target');
    const messageInput = state.modal.querySelector('#tb-message');
    const planSelect = state.modal.querySelector('#tb-plan-select');
    const logBox = state.modal.querySelector('#tb-log');
    const sendBtn = state.modal.querySelector('#tb-send-btn');

    const target = targetSelect.value;
    const message = (messageInput.value || '').trim();
    const planIds = target === 'plan'
      ? Array.from(planSelect.selectedOptions || []).map(option => parseInt(option.value, 10)).filter(Boolean)
      : [];

    if (!message) {
      updateStatus('error', '请输入要发送的消息内容');
      return;
    }
    if (message.length > 2000) {
      updateStatus('error', '消息内容过长，请控制在 2000 个字符以内');
      return;
    }
    if (target === 'plan' && planIds.length === 0) {
      updateStatus('error', '请选择要群发的订阅套餐');
      return;
    }

    state.sending = true;
    sendBtn.classList.add('ant-btn-loading', 'tb-inline-loading');
    sendBtn.disabled = true;
    updateStatus('info', '正在发送，请稍候...', true);
    logBox.textContent = '发送中，请稍候…';

    const payload = { target, message, plan_ids: planIds };
    const auth = getAuthData();
    if (auth) {
      payload.auth_data = auth;
    }

    const requestUrl = apiBase + 'config/telegram/broadcast';
    fetch(requestUrl, {
      method: 'POST',
      headers: buildHeaders(true),
      credentials: 'same-origin',
      body: JSON.stringify(payload)
    }).then(async response => {
      const status = response.status;
      const statusText = response.statusText || '';
      const rawBody = await response.text();
      let data = null;
      try {
        data = rawBody ? JSON.parse(rawBody) : null;
      } catch (err) {
        data = null;
      }
      if (!response.ok) {
        const serverMessage = data && data.message ? data.message : '';
        const error = new Error(`发送失败：HTTP ${status}${statusText ? ' ' + statusText : ''}${serverMessage ? ' - ' + serverMessage : ''}`);
        error.httpStatus = status;
        error.httpStatusText = statusText;
        error.httpBody = rawBody;
        error.httpUrl = response.url;
        throw error;
      }
      return data || {};
    }).then(data => {
      const result = data && data.data ? data.data : data;
      renderResult(logBox, result);
      updateStatus('success', '群发完成。成功 ' + (result?.summary?.success || 0) + '，失败 ' + (result?.summary?.failed || 0) + '。');
    }).catch(error => {
      const lines = [];
      lines.push(error && error.message ? error.message : '发送失败：未知错误');
      if (error && error.httpUrl) {
        lines.push('请求地址：' + error.httpUrl);
      } else {
        lines.push('请求地址：' + requestUrl);
      }
      if (error && typeof error.httpStatus !== 'undefined') {
        lines.push('状态码：' + error.httpStatus + (error.httpStatusText ? ' ' + error.httpStatusText : ''));
      }
      if (error && error.httpBody) {
        const body = error.httpBody.trim();
        if (body) {
          lines.push('响应内容：' + (body.length > 600 ? body.slice(0, 600) + '…' : body));
        }
      }
      const message = lines.join('\n');
      logBox.textContent = message;
      updateStatus('error', '发送失败，请查看下方详情。');
    }).finally(() => {
      state.sending = false;
      sendBtn.classList.remove('ant-btn-loading', 'tb-inline-loading');
      sendBtn.disabled = false;
    });
  }

  function renderResult(container, result) {
    if (!container) {
      return;
    }
    const summary = result && result.summary ? result.summary : {};
    const logs = result && Array.isArray(result.logs) ? result.logs : [];
    const pieces = [
      '目标：' + (formatTarget(summary.target) || '未知'),
      '总数：' + (summary.total || 0),
      '成功：' + (summary.success || 0),
      '失败：' + (summary.failed || 0)
    ];
    if (summary.plans && summary.plans.length > 0) {
      pieces.push('订阅：' + summary.plans.map(plan => plan.name || ('#' + plan.id)).join('、'));
    }
    const detailLines = logs.slice(0, state.logLimit).map(item => {
      if (item.status === 'success') {
        return `[成功] 用户 #${item.user_id} ${item.email || ''}`.trim();
      }
      return `[失败] 用户 #${item.user_id} ${item.email || ''} - ${item.error || '未知错误'}`.trim();
    });
    container.innerHTML = `<div>${pieces.join(' ｜ ')}</div>`;
    if (detailLines.length > 0) {
      const list = document.createElement('ul');
      detailLines.forEach(line => {
        const li = document.createElement('li');
        li.textContent = line;
        list.appendChild(li);
      });
      container.appendChild(list);
      if (logs.length > state.logLimit) {
        const note = document.createElement('div');
        note.style.marginTop = '8px';
        note.style.color = '#64748b';
        note.textContent = `日志仅展示前 ${state.logLimit} 条。`;
        container.appendChild(note);
      }
    }
  }

  function getAuthData() {
    try {
      const raw = window.localStorage.getItem('authorization');
      if (!raw) {
        return null;
      }
      let parsed = null;
      try {
        parsed = JSON.parse(raw);
      } catch (err) {
        parsed = null;
      }
      if (parsed && typeof parsed === 'object') {
        if (parsed.value) {
          return parsed.value;
        }
        if (parsed.data) {
          return parsed.data;
        }
      }
      return raw;
    } catch (err) {
      return null;
    }
  }

  function buildHeaders(isPost) {
    const headers = {
      'X-Requested-With': 'XMLHttpRequest'
    };
    if (isPost) {
      headers['Content-Type'] = 'application/json';
    }
    const auth = getAuthData();
    if (auth) {
      headers.authorization = auth;
    }
    return headers;
  }

  function formatTarget(target) {
    switch (target) {
      case 'all':
        return '所有已绑定用户';
      case 'active':
        return '当前订阅用户';
      case 'history':
        return '现有或曾有订阅用户';
      case 'plan':
        return '指定订阅用户';
      default:
        return target;
    }
  }

  function findTelegramPane() {
    let pane = document.querySelector('.ant-tabs-tabpane[data-node-key="telegram"]');
    if (pane) {
      return pane;
    }
    const panes = document.querySelectorAll('.ant-tabs-tabpane');
    for (let i = 0; i < panes.length; i += 1) {
      const candidate = panes[i];
      if (candidate && candidate.getAttribute('data-node-key') === 'telegram') {
        return candidate;
      }
      if (candidate && candidate.textContent && candidate.textContent.indexOf('机器人Token') !== -1) {
        return candidate;
      }
    }
    return null;
  }

  function tryInjectBlock() {
    const pane = findTelegramPane();
    if (!pane || pane.querySelector('#' + BLOCK_ID)) {
      return;
    }
    const block = createBlock();
    pane.insertBefore(block, pane.firstChild || null);
  }

  const observer = new MutationObserver(function () {
    tryInjectBlock();
  });

  observer.observe(document.body, { childList: true, subtree: true });
  document.addEventListener('DOMContentLoaded', () => {
    tryInjectBlock();
  });
  tryInjectBlock();
})();

/**
 * Browser half of Cite & ask.
 *
 * The selection gesture on the Chat transcript is dispatched by the shipped
 * `message-quotes` interaction (id `quote`); the keyed cell it renders is the
 * one extension point for that gesture. This module shadows that cell at a
 * lower priority and renders one toolbar with both actions: the original
 * quote, and "ask" — an inline question editor whose result is written into
 * the composer as a Markdown blockquote followed by the numbered question.
 */
window.__ModuleLoader__.load({
  id: 'dsh-cite-ask',
  factory(require) {
    const React = require('react');
    const h = React.createElement;

    /** Locale namespace owned by this plugin. */
    const NS = 'citeAsk';
    /** Longest passage an answered question keeps. */
    const MAX_PASSAGE = 4000;
    /** Characters of the passage echoed back in the card. */
    const PREVIEW_CHARS = 220;
    /** Typed questions kept per Session while the surface is closed. */
    const MEMORY_LIMIT = 30;
    /** Ignore Enter this soon after a composition ends (Safari reports the closing Enter as plain). */
    const COMPOSITION_TAIL_MS = 80;

    /** English dictionary. */
    const en = {
      'action.quote': 'Quote',
      'action.ask': 'Ask about this',
      'compose.placeholder': 'What do you want to ask about this passage?',
      'compose.insert': 'Add question',
      'compose.send': 'Add & send',
      'compose.cancel': 'Cancel',
      'compose.hint': 'Enter adds it · Shift+Enter for a new line · Cmd/Ctrl+Enter adds and sends',
      'compose.truncated': 'Long passage: only the first 4000 characters were kept.',
      'compose.busy': 'Wait for the current message to finish before adding this.',
      'compose.failed': 'The composer did not accept the text. Try again.',
      'compose.failedPartial': 'The quote is already in the composer; only the question failed. Try again.',
      'quote.failed': 'The composer does not accept a quote right now.',
      'entry': 'Question {n}: ',
      'label': 'Question',
    };

    /** Simplified Chinese dictionary. */
    const zh = {
      'action.quote': '引用',
      'action.ask': '就这段提问',
      'compose.placeholder': '针对这一段，你想问什么？',
      'compose.insert': '加入提问',
      'compose.send': '加入并发送',
      'compose.cancel': '取消',
      'compose.hint': 'Enter 加入 · Shift+Enter 换行 · ⌘/Ctrl+Enter 加入并发送',
      'compose.truncated': '内容较长，只保留了前 4000 个字符。',
      'compose.busy': '请等当前消息发送完成后再加入。',
      'compose.failed': '输入框没有接受这段文字，请重试。',
      'compose.failedPartial': '引用已经在输入框里了，只差问题没写进去，请再试一次。',
      'quote.failed': '输入框现在不接受引用，请稍后再试。',
      'entry': '问题 {n}：',
      'label': '问题',
    };

    /**
     * Questions typed but not yet committed, keyed by Session and passage, so an
     * accidental click outside the card does not throw the text away.
     */
    const pendingQuestions = new Map();
    /** Recent composition state, so an IME Enter never commits half a word. */
    let compositionActive = false;
    let compositionEndedAt = 0;

    const CSS = [
      '.ca-bar{display:flex;align-items:center;gap:2px;padding:2px;',
      '--dsw-elevation-stroke-color:var(--dsw-alias-border-l3);',
      'background:var(--dsw-alias-button-floating-fill);border-radius:999px;',
      'box-shadow:var(--dsw-elevation-panel);font-family:inherit}',
      '.ca-bar-button{appearance:none;border:0;background:transparent;color:var(--dsw-alias-label-primary);',
      'font-family:inherit;font-size:13px;line-height:1.4;padding:5px 10px;border-radius:999px;cursor:pointer}',
      '.ca-bar-button:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px}',
      '.ca-bar-ask{font-weight:600}',
      '.ca-card{box-sizing:border-box;width:340px;max-width:100%;display:flex;flex-direction:column;gap:8px;',
      'padding:10px;--dsw-elevation-stroke-color:var(--dsw-alias-border-l3);',
      'background:var(--dsw-alias-button-floating-fill);border-radius:12px;',
      'box-shadow:var(--dsw-elevation-panel);color:var(--dsw-alias-label-primary);',
      'font-family:inherit;text-align:start}',
      '.ca-passage{margin:0;padding-left:8px;border-left:2px solid var(--dsw-alias-state-business-primary);',
      'color:var(--dsw-alias-label-secondary);font-size:12px;line-height:1.5;white-space:pre-wrap;',
      'word-break:break-word;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden}',
      '.ca-note{font-size:11px;line-height:1.4;color:var(--dsw-alias-label-secondary)}',
      '.ca-failed{font-size:11px;line-height:1.4;color:var(--dsw-alias-state-error-primary)}',
      '.ca-input{box-sizing:border-box;width:100%;resize:none;padding:8px;border-radius:8px;',
      'border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-base);',
      'color:var(--dsw-alias-label-primary);font-family:inherit;font-size:13px;line-height:1.5;outline:none}',
      '.ca-input:focus{border-color:var(--dsw-alias-brand-primary)}',
      '.ca-foot{display:flex;align-items:center;gap:6px}',
      '.ca-spacer{flex:1}',
      '.ca-ghost,.ca-submit{appearance:none;font-family:inherit;font-size:12px;line-height:1.4;padding:5px 10px;',
      'border-radius:7px;cursor:pointer;white-space:nowrap}',
      '.ca-ghost{border:1px solid var(--dsw-alias-border-l1);background:transparent;color:var(--dsw-alias-label-secondary)}',
      '.ca-submit{border:1px solid transparent;background:var(--dsw-alias-button-primary-fill);',
      'color:var(--dsw-alias-label-on-color)}',
      '.ca-submit:disabled{background:var(--dsw-alias-button-primary-dimmed);cursor:default}',
      '.ca-ghost:disabled{opacity:.5;cursor:default}',
      '.ca-submit:focus-visible,.ca-ghost:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px}',
      '@media (hover:hover){.ca-bar-button:hover{background:var(--dsw-alias-button-floating-hover)}',
      '.ca-ghost:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}',
      '.ca-submit:hover:not(:disabled){background:var(--dsw-alias-button-primary-hover)}}',
    ].join('');

    /**
     * Normalize one selection for quoting: no CRLF, no trailing blanks, at most
     * two consecutive line breaks, bounded length.
     * @param raw - text read from the transcript selection.
     * @returns the passage text that goes into the composer and whether it was cut.
     */
    function normalizePassage(raw) {
      const text = String(raw)
        .replace(/\r\n?/gu, '\n')
        .replace(/[ \t]+$/gmu, '')
        .replace(/\n{3,}/gu, '\n\n')
        .trim();
      if (text.length <= MAX_PASSAGE) return { text, truncated: false };
      return { text: text.slice(0, MAX_PASSAGE).trimEnd(), truncated: true };
    }

    /**
     * @param text - passage text.
     * @returns the same passage as Markdown blockquote lines.
     */
    function asBlockquote(text) {
      return text.split('\n').map(line => (line.trim() === '' ? '>' : `> ${line}`)).join('\n');
    }

    /**
     * Next question number in an existing draft, so one message can carry
     * several quoted questions in order.
     * @param draft - current composer text.
     * @param label - localized question label.
     * @returns the next ordinal, starting at 1.
     */
    function nextIndex(draft, label) {
      if (typeof draft !== 'string' || draft === '') return 1;
      const escaped = label.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
      const pattern = new RegExp(`(?:^|\\n)[ \\t]*${escaped}[ \\t]*(\\d+)`, 'gu');
      let next = 1;
      for (const match of draft.matchAll(pattern)) {
        const value = Number(match[1]);
        if (Number.isFinite(value) && value >= next) next = value + 1;
      }
      return next;
    }

    /**
     * Remember a typed question, keeping the newest {@link MEMORY_LIMIT} entries.
     * @param key - Session and passage identity.
     * @param text - current question text; empty removes the entry.
     */
    function remember(key, text) {
      pendingQuestions.delete(key);
      if (text.trim() === '') return;
      pendingQuestions.set(key, text);
      while (pendingQuestions.size > MEMORY_LIMIT) {
        const oldest = pendingQuestions.keys().next();
        if (oldest.done === true) break;
        pendingQuestions.delete(oldest.value);
      }
    }

    /**
     * Render the selection surface: a two-action toolbar that expands into the
     * question editor.
     * @param props - surface actions and framework hooks for this Session.
     * @returns the toolbar, or the question card while composing.
     */
    function CiteAskAction(props) {
      const { dismiss, readText, clearSelection, inputActions, useInput, useSession, sessionId, t } = props;
      const enabled = useSession(session => !session.removed
        && (session.subagent === null || session.subagent.address.mode === 'continuable'));
      const phase = useInput(state => state.phase);
      const draft = useInput(state => state.draft);
      const [passage, setPassage] = React.useState(null);
      const [question, setQuestion] = React.useState('');
      const [notice, setNotice] = React.useState(null);
      const [quotePlaced, setQuotePlaced] = React.useState(false);
      const inputRef = React.useRef(null);
      const memoryKey = passage === null ? null : `${sessionId}\u0000${passage.text}`;

      React.useEffect(() => {
        if (!enabled) dismiss();
      }, [enabled, dismiss]);

      const composing = passage !== null;
      React.useEffect(() => {
        if (!composing) return;
        const input = inputRef.current;
        if (input === null) return;
        input.focus();
        input.setSelectionRange(input.value.length, input.value.length);
      }, [composing]);

      if (!enabled) return null;

      const writable = phase === 'plain';
      const refocus = () => {
        const input = inputRef.current;
        if (input === null) return;
        input.focus();
      };
      const quoteNow = () => {
        const raw = readText();
        if (raw === null) { dismiss(); return; }
        const text = raw.replace(/\r\n?/gu, '\n').trim();
        if (text === '') { dismiss(); return; }
        if (!inputActions.insertQuote(text)) { setNotice('quote.failed'); return; }
        clearSelection();
        dismiss();
      };
      const askNow = () => {
        const raw = readText();
        if (raw === null) { dismiss(); return; }
        const normalized = normalizePassage(raw);
        if (normalized.text === '') { dismiss(); return; }
        setPassage(normalized);
        setQuestion(pendingQuestions.get(`${sessionId}\u0000${normalized.text}`) ?? '');
        setNotice(null);
        setQuotePlaced(false);
      };
      /**
       * @param text - composer text to splice in at the caret.
       * @returns whether the editor accepted it.
       */
      const write = (text) => {
        let span = inputActions.captureInsertion();
        if (inputActions.insertText(text, span)) return true;
        span = inputActions.captureInsertion();
        return inputActions.insertText(text, span);
      };
      /**
       * Write the pending passage and question into the composer.
       * @param send - submit the message once the text landed.
       */
      const commit = (send) => {
        const body = question.trim();
        if (passage === null || body === '' || !writable) return;
        const entry = t('entry', { n: String(nextIndex(draft, t('label'))) }) + body;
        const separator = draft === '' ? '' : '\n\n';
        let placed = quotePlaced;
        if (!placed) {
          placed = inputActions.insertQuote(passage.text);
          if (placed) setQuotePlaced(true);
        }
        const written = placed
          ? write(`\n\n${entry}`)
          : write(`${separator}${asBlockquote(passage.text)}\n\n${entry}`);
        if (!written) {
          setNotice(placed ? 'compose.failedPartial' : 'compose.failed');
          refocus();
          return;
        }
        if (memoryKey !== null) pendingQuestions.delete(memoryKey);
        clearSelection();
        dismiss();
        if (send) inputActions.submit();
      };
      const cancel = () => {
        if (memoryKey !== null) pendingQuestions.delete(memoryKey);
        dismiss();
      };
      /** @returns whether the key press belongs to an IME composition. */
      const composingKey = (event) => {
        const native = event.nativeEvent;
        if (compositionActive) return true;
        if (native !== undefined && (native.isComposing === true || native.keyCode === 229)) return true;
        return Date.now() - compositionEndedAt < COMPOSITION_TAIL_MS;
      };

      const style = h('style', null, CSS);
      const noticeLine = notice === null
        ? null
        : h('div', { className: 'ca-failed', role: 'alert' }, t(notice));

      if (!composing) {
        return h(React.Fragment, null, style, h('div', { className: 'ca-bar', role: 'toolbar' },
          h('button', {
            type: 'button',
            className: 'ca-bar-button',
            onPointerDown: event => { event.preventDefault() },
            onClick: quoteNow,
          }, t('action.quote')),
          h('button', {
            type: 'button',
            className: 'ca-bar-button ca-bar-ask',
            onPointerDown: event => { event.preventDefault() },
            onClick: askNow,
          }, t('action.ask')),
        ), noticeLine);
      }

      const preview = passage.text.length > PREVIEW_CHARS
        ? `${passage.text.slice(0, PREVIEW_CHARS).trimEnd()}…`
        : passage.text;
      const canWrite = writable && question.trim() !== '';
      return h(React.Fragment, null, style, h('div', {
        className: 'ca-card',
        role: 'group',
        'aria-label': t('action.ask'),
      },
        h('div', { className: 'ca-passage' }, preview),
        passage.truncated ? h('div', { className: 'ca-note' }, t('compose.truncated')) : null,
        h('textarea', {
          ref: inputRef,
          className: 'ca-input',
          rows: 3,
          value: question,
          placeholder: t('compose.placeholder'),
          'aria-label': t('compose.placeholder'),
          onChange: (event) => {
            setQuestion(event.target.value);
            setNotice(null);
            if (memoryKey !== null) remember(memoryKey, event.target.value);
          },
          onCompositionStart: () => { compositionActive = true },
          onCompositionEnd: () => {
            compositionActive = false;
            compositionEndedAt = Date.now();
          },
          onKeyDown: (event) => {
            if (event.key !== 'Enter' || event.shiftKey) return;
            if (composingKey(event)) return;
            event.preventDefault();
            commit(event.metaKey || event.ctrlKey);
          },
        }),
        noticeLine,
        writable ? null : h('div', { className: 'ca-note', role: 'status' }, t('compose.busy')),
        h('div', { className: 'ca-note' }, t('compose.hint')),
        h('div', { className: 'ca-foot' },
          h('button', { type: 'button', className: 'ca-ghost', onClick: cancel }, t('compose.cancel')),
          h('span', { className: 'ca-spacer' }),
          h('button', {
            type: 'button',
            className: 'ca-ghost',
            disabled: !canWrite,
            onClick: () => { commit(true) },
          }, t('compose.send')),
          h('button', {
            type: 'button',
            className: 'ca-submit',
            disabled: !canWrite,
            onClick: () => { commit(false) },
          }, t('compose.insert')),
        ),
      ));
    }

    return {
      inject: ['slots', 'locale'],
      /**
       * @param ctx - Client root context owning the dictionaries and the
       * shadowing cell registration.
       */
      apply(ctx) {
        ctx.effect(() => ctx.locale.register(NS, { en, zh }), 'cite-ask: dictionaries');
        ctx.slots.inject('conversation.chat.text-interaction', () => ctx.slots.register({
          name: 'conversation.chat.text-interaction',
          key: 'quote',
          priority: -1,
          locale: NS,
        }, CiteAskAction));
      },
    };
  },
});

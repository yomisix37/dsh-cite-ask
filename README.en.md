# dsh-cite-ask

Stop copy-pasting: select a passage, write the question right next to it, and
send both together.

[中文](README.md) | English

## Why

- **The question stays attached to the passage.** The model receives
  `> the passage` followed by `Question 1: …`, so it never has to guess which
  sentence you mean.
- **No copy-paste, no separators.** Select, type, Enter. The passage and your
  question reach the composer as one block.
- **Ask several times in one message.** Numbering continues automatically, so the
  agent can answer item by item instead of in one blob.
- **Your draft is kept.** The plugin appends at the caret: existing text and
  `@file` reference chips are untouched.
- **Safe with a Chinese IME.** The Enter that confirms an IME candidate does not
  submit the question, and an accidental click outside the card does not lose
  what you typed.
- **Small and local.** Browser-side only: no Host code, no network requests, no
  install scripts.

## Install

```sh
dsh plugin --profile <profile> add https://github.com/yomisix37/dsh-cite-ask/releases/latest/download/dsh-cite-ask.tgz
```

In DSH Desktop, open **Settings → Plugins → Add plugin** and enter the same URL.
From the repository source instead: `dsh plugin --profile <profile> add github:yomisix37/dsh-cite-ask`.
Reload the page (or restart `dsh web`) after installing.

## Use it

1. Select text in a message (mine or yours).
2. The floating toolbar offers **Quote** and **Ask about this**.
3. **Ask about this** opens a small card: the passage stays visible above a
   question box that already has keyboard focus.
4. Type the question, then:
   - **Enter** adds it to the composer and closes the card;
   - **Add & send** (**Cmd/Ctrl+Enter**) adds it and sends the message at once;
   - **Shift+Enter** starts a new line in the question.
5. The composer receives the passage as a blockquote followed by your numbered
   question. Repeat for more passages in the same message, then send.

**Quote** keeps the behaviour of DSH's selection toolbar: the full selected
text goes into the composer as a blockquote.

## What the model sees

One message per batch, for example:

```
> the selected passage

Question 1: what does this sentence mean?

> another passage

Question 2: why here and not earlier?
```

Numbering continues from the questions already in the draft, and quoted
passages keep their line breaks.

## Notes

- The plugin never sends a message you did not submit: **Add question** only
  writes into the composer, and **Add & send** is an explicit click or key.
- A question with no passage is never sent by this plugin; it always writes a
  quote first.
- Passages longer than 4000 characters are trimmed for a question, and the card
  says so. **Quote** is not trimmed.
- A typed question survives an accidental click outside the card: select the
  same passage again and the text is restored. **Cancel** discards it.
- The toolbar is rendered for the selection gesture that DSH's own quote
  selection dispatches. With that built-in selection turned off, this toolbar
  does not appear.
- The **Ask** card replaces the presentation of DSH's selection toolbar so both
  actions share one place; **Quote** keeps the original result.

## Requirements

DSH 0.2.x on the Web surface (`engines.dsh` declares the range). No Host-side
code, no configuration, no network access, no install scripts.

## License

MIT

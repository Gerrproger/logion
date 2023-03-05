import crypto from 'node:crypto';
import readline from 'node:readline';
import wrapAnsi from 'wrap-ansi';
import stripAnsi from 'strip-ansi';
import interactive from 'is-interactive';
import chalk from 'chalk';

/**
 * @module logion
 */

/** Class representing a logger. */
export class Logion {
  #codes = {
    nl: '\n',
    screenClear: '\u001B[3J',
    screenNorm: '\u001B[?1049l',
    screenAlt: '\u001B[?1049h',
    cursorShow: '\u001B[?25h',
    cursorHide: '\u001B[?25l',
    beep: '\u0007',
  };

  #initialized = false;
  #endedWith = {
    newline: 0,
    separator: 0,
  };

  #chunks = new Map();
  #spinners = new Map();
  #separators = new Map();
  #activeSpinners = new Set();

  #updateTimout = null;
  #startPos = NaN;
  #input = null;

  #streamIn;
  #streamOut;
  #write;
  #isDisabled;
  #isPaused;
  #renderInterval;
  #spinOpts;

  /**
   * A logger instance.
   * @typedef {object} Instance
   */

  /**
   * Available style names.
   * @typedef {"success"|"error"|"info"|"bold"|"underline"|"italic"|"strikethrough"} styleName
   */

  /**
   * Supported color names.
   * @typedef {"black"|"red"|"green"|"yellow"|"blue"|"magenta"|"cyan"|"white"|"gray"|"blackBright"|"redBright"|"greenBright"|"yellowBright"|"blueBright"|"magentaBright"|"cyanBright"|"whiteBright"} color
   */

  /**
   * Format the spinner text when it is marked as done.
   * @callback spinnerFormatDone
   * @param {string} - Current spinner text.
   * @returns {string} a formated spinner text.
   */

  /**
   * Create a logger.
   * @param {object} options - Options object.
   * @param {object} [options.streamIn=process.stdin] - Input stream (for scrolling and shortcuts).
   * @param {object} [options.streamOut=process.stdout] - Output stream.
   * @param {boolean} [options.disabled=auto] - Is logger disabled (no logging). By default, disabled if not ran in TTY.
   * @param {boolean} [options.paused=false] - Is logger paused (not outputting to console and not listening for key presses, but still collecting logs).
   * @param {number} [options.renderInterval=80] - Render interval in ms to update spinners.
   * @param {color} [options.spinnerColor=white] - Spinner char {@link #module_logion--module.exports..color|color}.
   * @param {number} [options.spinnerIndent=0] - Spinner indent length in text chars.
   * @param {string[]} [options.spinnerFrames=["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"]] - Spinner frames characters.
   * @param {string} [options.spinnerDoneChar=✱] - Char to replace spinner after it is done (when calling {@link #module_logion--module.exports.Logion+spinnerDone|spinnerDone}).
   * @param {string} [options.spinnerDoneAllChar=✸] - Char to replace active spinners after they are done (when calling {@link #module_logion--module.exports.Logion+spinnerDoneAll|spinnerDoneAll}).
   * @param {function} [options.spinnerFormatDone=(str) => str] - Call this function to format the spinner text after it is done, see {@link #module_logion--module.exports..spinnerFormatDone|spinnerFormatDone}.
   * @returns {Instance} a logger instance.
   */
  constructor({
    streamIn = process.stdin,
    streamOut = process.stdout,
    disabled = !interactive({ stream: streamOut }),
    paused = false,
    renderInterval = 80,
    spinnerColor = 'white',
    spinnerIndent = 0,
    spinnerFrames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'],
    spinnerDoneChar = '✱',
    spinnerDoneAllChar = '✸',
    spinnerFormatDone = (str) => str,
  } = {}) {
    this.#streamIn = streamIn;
    this.#streamOut = streamOut;
    this.#write = this.#streamOut.write.bind(this.#streamOut);
    this.#isDisabled = disabled;
    this.#isPaused = paused;
    this.#renderInterval = renderInterval;
    this.#spinOpts = {
      color: spinnerColor,
      indent: spinnerIndent,
      frames: spinnerFrames,
      doneChar: spinnerDoneChar,
      doneAllChar: spinnerDoneAllChar,
      formatter: spinnerFormatDone,
    };
  }

  /**
   * Output a newline(s).
   * Accommodates if line breaks have been used before.
   * @param {number} [num=1] - Number of new lines to output.
   * @param {boolean} [force=false] - Do not accommodate for previous lines.
   * @param {string} [identifier=$random] - Identifier for this log message (should be unique).
   * @returns {Instance} a logger instance.
   */
  newline(num = 1, force = false, identifier = this.#rand()) {
    if (this.#endedWith.newline >= num && !force) {
      return this;
    }

    const string = this.#codes.nl.repeat(
      num - (force ? 0 : this.#endedWith.newline)
    );

    this.log(string, identifier);

    this.#endedWith.newline = num;
    this.#endedWith.separator = 0;

    return this;
  }

  /**
   * Output spaces.
   * Can be used in the middle of a line.
   * @param {number} [num=2] - Number of spaces to output.
   * @param {string} [identifier=$random] - Identifier for this log message (should be unique).
   * @returns {Instance} a logger instance.
   */
  indent(num = 2, identifier = this.#rand()) {
    this.log(' '.repeat(num), identifier);

    this.#endedWith.newline = 0;
    this.#endedWith.separator = 0;

    return this;
  }

  /**
   * Output a separator on a new line.
   * It fills all the available width.
   * @param {color} [color=grey] - A separator character's {@link #module_logion--module.exports..color|color}.
   * @param {string} [char=-] - Character that make up the separator.
   * @param {string} [identifier=$random] - Identifier for this log message (should be unique).
   * @returns {Instance} a logger instance.
   */
  separate(color = 'grey', char = '―', identifier = this.#rand()) {
    if (this.#endedWith.separator) {
      return this;
    }

    const startNl = this.#endedWith.newline;
    const string = `${startNl ? '' : this.#codes.nl}${char.repeat(this.width)}${
      this.#codes.nl
    }`;
    const colored = chalk[color](string);

    this.#separators.set(identifier, {
      identifier,
      color,
      startNl,
      char,
    });
    this.log(colored, identifier);

    this.#endedWith.separator = 1;
    this.#endedWith.newline = 0;

    return this;
  }

  /**
   * Output a text with stlies applied.
   * Does not add a new line.
   * @param {string} [string=$space] - Text to output.
   * @param {(object|styleName)} styles - Style object or {@link #module_logion--module.exports..styleName|styleName} string.
   * @param {color} [styles.color] - Text color (uses Chalk module {@link #module_logion--module.exports..color|color}).
   * @param {color} [styles.bgColor] - Background color (uses Chalk {@link #module_logion--module.exports..color|color}).
   * @param {boolean} [styles.bold=false] - Output as bold.
   * @param {boolean} [styles.underline=false] - Output as underlined.
   * @param {boolean} [styles.italic=false] - Output as italic.
   * @param {boolean} [styles.strikethrough=false] - Output as strike-through.
   * @param {string} [identifier=$random] - Identifier for this log message (should be unique).
   * @returns {Instance} a logger instance.
   */
  text(string = ' ', styles, identifier = this.#rand()) {
    this.log(styles ? this.style(string, styles) : string, identifier);

    this.#endedWith.newline = 0;
    this.#endedWith.separator = 0;

    return this;
  }

  /**
   * Style a text string.
   * Shortening names could be one of: "success", "error", "info", "bold", "underline", "italic", "strikethrough".
   * @param {string} string - Text to style.
   * @param {(object|styleName)} styles - Style object or {@link #module_logion--module.exports..styleName|styleName} string.
   * @param {color} [styles.color] - Text color (uses Chalk module {@link #module_logion--module.exports..color|color}).
   * @param {color} [styles.bgColor] - Background color (uses Chalk {@link #module_logion--module.exports..color|color}).
   * @param {boolean} [styles.bold=false] - Output as bold.
   * @param {boolean} [styles.underline=false] - Output as underlined.
   * @param {boolean} [styles.italic=false] - Output as italic.
   * @param {boolean} [styles.strikethrough=false] - Output as strike-through.
   * @param {string} [identifier=$random] - Identifier for this log message (should be unique).
   * @returns {string} a styled string (with escape codes).
   */
  style(string, styles) {
    const capitalize = (str) => `${str.charAt(0).toUpperCase()}${str.slice(1)}`;
    let construct = chalk;
    let opts = {
      bold: false,
      underline: false,
      italic: false,
      strikethrough: false,
      color: '',
      bgColor: '',
    };

    if (typeof styles === 'object') {
      opts = {
        ...opts,
        ...styles,
      };
    } else if (typeof styles === 'string') {
      switch (styles) {
        case this.styleNames.SUCCESS:
          opts.color = 'green';
          break;
        case this.styleNames.ERROR:
          opts.color = 'red';
          break;
        case this.styleNames.INFO:
          opts.color = 'magenta';
          break;
        case this.styleNames.BOLD:
          opts.bold = true;
          break;
        case this.styleNames.UNDERLINE:
          opts.underline = true;
          break;
        case this.styleNames.ITALIC:
          opts.italic = true;
          break;
        case this.styleNames.STRIKETHROUGH:
          opts.strikethrough = true;
      }
    }

    if (opts.bold) {
      construct = construct.bold;
    }

    if (opts.underline) {
      construct = construct.underline;
    }

    if (opts.italic) {
      construct = construct.italic;
    }

    if (opts.strikethrough) {
      construct = construct.strikethrough;
    }

    if (opts.color) {
      construct = construct[opts.color];
    }

    if (opts.bgColor) {
      construct = construct[`bg${capitalize(opts.bgColor)}`];
    }

    return construct(string);
  }

  /**
   * Reset all styles for a string.
   * @param {string} string - String with styled text.
   * @returns {string} an unstyled string.
   */
  styleReset(string) {
    return stripAnsi(string);
  }

  /**
   * Output a line of a text with an indent.
   * @param {string} [string=$space] - Your text.
   * @param {(object|string)} [styles] - Style object or shortening name (as string), same as {@link #module_logion--module.exports.Logion+style|style}.
   * @param {color} [styles.color] - Text color (uses Chalk module {@link #module_logion--module.exports..color|color}).
   * @param {color} [styles.bgColor] - Background color (uses Chalk {@link #module_logion--module.exports..color|color}).
   * @param {boolean} [styles.bold=false] - Output as bold.
   * @param {boolean} [styles.underline=false] - Output as underlined.
   * @param {boolean} [styles.italic=false] - Output as italic.
   * @param {boolean} [styles.strikethrough=false] - Output as strike-through.
   * @param {number} [indt=0] - Line indentation, a number of spaces to output before the text.
   * @returns {Instance} a logger instance.
   */
  line(string = ' ', styles, indt = 0) {
    this.newline();
    this.indent(indt);
    this.text(string, styles);
    this.newline();

    return this;
  }

  /**
   * Clear all the output.
   * @returns {Instance} a logger instance.
   */
  clear() {
    if (this.#isDisabled || !this.#initialized) {
      return this;
    }

    this.#stopUpdater();
    this.#clearScreen();

    this.#chunks.clear();
    this.#spinners.clear();
    this.#separators.clear();
    this.#activeSpinners.clear();
    this.#endedWith.newline = 0;
    this.#endedWith.separator = 0;

    return this;
  }

  /**
   * Create a spinner on a new line.
   * You can mark a spinner as done using its identifier with {@link #module_logion--module.exports.Logion+spinnerDone|spinnerDone}.
   * @param {string} identifier - Identifier for this spinner (required, should be unique).
   * @param {string} [text] - Text to output after this spinner (on the same line).
   * @param {object} [config] - An object for configuring this spinner.
   * @param {color} [config.color=white] - Spinner char color (uses Chalk module {@link #module_logion--module.exports..color|color}).
   * @param {number} [config.indent=0] - Amount of spaces to output before this spinner.
   * @returns {Instance} a logger instance.
   */
  spinner(
    identifier,
    text = '',
    { color = this.#spinOpts.color, indent = this.#spinOpts.indent } = {}
  ) {
    if (this.#isDisabled) {
      return this;
    }

    if (!identifier || typeof identifier !== 'string') {
      throw new Error('Spinner identifier absent!');
    }

    if (this.#spinners.has(identifier)) {
      throw new Error(`Spinner identifier '${identifier}' already exists!`);
    }

    const prefix = `${
      this.#endedWith.newline || this.#endedWith.separator ? '' : this.#codes.nl
    }${' '.repeat(indent)}`;
    const string = `${prefix}${chalk[color](this.#spinOpts.frames[0])} ${text}${
      this.#codes.nl
    }`;

    this.#spinners.set(identifier, {
      identifier,
      text,
      color,
      prefix,
      active: true,
      frame: 0,
    });
    this.#activeSpinners.add(identifier);

    this.log(string, identifier);

    this.#endedWith.newline = 1;
    this.#endedWith.separator = 0;

    return this;
  }

  /**
   * Mark the spinner as done.
   * If text is not provided, uses {@link #module_logion--module.exports..spinnerFormatDone|spinnerFormatDone} to format the original text.
   * @param {string} identifier - Identifier for the spinner (previously used to create the spinner in {@link #module_logion--module.exports.Logion+spinner|spinner}).
   * @param {object} [config] - An object for configuring this spinner.
   * @param {string} [config.text] - A new text for this spinner (if empty, leaves the original text).
   * @param {color} [config.color] - A new spinner char {@link #module_logion--module.exports..color|color} (if empty, uses the original color).
   * @param {string} [config.char=✱] - A character which replaces the spinner.
   * @returns {Instance} a logger instance.
   */
  spinnerDone(
    identifier,
    { text, color, char = this.#spinOpts.doneChar } = {}
  ) {
    if (this.#isDisabled) {
      return this;
    }

    const inst = this.#spinners.get(identifier);

    if (!inst || !inst.active) {
      return this;
    }

    const resText = text || this.#spinOpts.formatter.call(this, inst.text);
    const resColor = color || inst.color;

    const string = `${inst.prefix}${chalk[resColor](char)} ${resText}${
      this.#codes.nl
    }`;

    this.#spinners.set(identifier, {
      ...inst,
      color: resColor,
      text: resText,
      active: false,
    });
    this.#chunks.set(identifier, string);
    this.#activeSpinners.delete(identifier);
    this.#update();

    return this;
  }

  /**
   * Mark all spinners that are not already done as done.
   * Uses {@link #module_logion--module.exports..spinnerFormatDone|spinnerFormatDone} to format the original text.
   * @param {object} [config] - An object for configuring this spinner.
   * @param {color} [config.color] - A new spinner char {@link #module_logion--module.exports..color|color} (if empty, uses the original color).
   * @param {string} [config.char=✸] - A character which replaces the spinner.
   * @returns {Instance} a logger instance.
   */
  spinnerDoneAll({ color, char = this.#spinOpts.doneAllChar } = {}) {
    if (this.#isDisabled) {
      return this;
    }

    for (const inst of this.#spinners) {
      if (!inst[1].active) {
        continue;
      }

      const resText = this.#spinOpts.formatter.call(this, inst[1].text);
      const resColor = color || inst[1].color;

      const string = `${inst[1].prefix}${chalk[resColor](char)} ${resText}${
        this.#codes.nl
      }`;

      this.#spinners.set(inst[0], {
        ...inst[1],
        color: resColor,
        text: resText,
        active: false,
      });
      this.#chunks.set(inst[0], string);
    }

    this.#activeSpinners.clear();
    this.#update();

    return this;
  }

  /**
   * Make a beep sound.
   * May not be played in some consoles.
   * @returns {Instance} a logger instance.
   */
  beep() {
    if (this.#isDisabled) {
      return this;
    }

    this.#write(this.#codes.beep);

    return this;
  }

  /**
   * Output a special spinner and waits for a user interaction.
   * Removes the spinner after interaction and resolves a Promise.
   * @param {string} [text=Press any key to continue] - Text for the spinner
   * @param {object} [config] - An object for configuring the spinner, see {@link #module_logion--module.exports.Logion+spinner|spinner}.
   * @returns {Promise.<Instance>} a promise which resolves after user interaction (resolver returns a logger instance).
   */
  waitInteraction(text = 'Press any key to continue', config) {
    return new Promise((success) => {
      if (this.#isDisabled) {
        success(this);
      }

      const spinId = this.#rand();
      const spaceId = this.#rand();

      const cb = (chunk, key) => {
        if (
          key &&
          !['up', 'down', 'k', 'j', 'home', 'end'].includes(key.name)
        ) {
          this.#streamIn.off('keypress', cb);
          this.removeLog(spaceId);
          this.removeLog(spinId);
          success(this);
        }
      };

      this.newline(1, false, spaceId);
      this.spinner(spinId, text, config);
      this.#streamIn.on('keypress', cb);
    });
  }

  /**
   * Log a row string.
   * Other methods use this under the hood.
   * @param {string} string - String to output.
   * @param {string} [identifier=$random] - Identifier for this log message (should be unique).
   * @returns {Instance} a logger instance.
   */
  log(string, identifier = this.#rand()) {
    if (this.#isDisabled || !string) {
      return this;
    }

    if (this.#chunks.has(identifier)) {
      throw new Error(`Chunk identifier '${identifier}' already exists!`);
    }

    this.#chunks.set(identifier, string.toString());
    this.#update();

    return this;
  }

  /**
   * Remove a log message with the corresponding identifier.
   * @param {string} identifier - Identifier for the log message (used to create it in other methods).
   * @returns {Instance} a logger instance.
   */
  removeLog(identifier) {
    this.#chunks.delete(identifier);
    this.#spinners.delete(identifier);
    this.#separators.delete(identifier);
    this.#activeSpinners.delete(identifier);
    this.#update();

    return this;
  }

  /**
   * Enable a logger.
   * @returns {Instance} a logger instance.
   */
  enable() {
    if (this.#initialized && !this.#isDisabled) {
      return this;
    }

    this.#isDisabled = false;
    this.#initialized = true;

    process.on('exit', this.#onExit.bind(this));

    this.#streamOut.on('resize', () => {
      this.#updateSeparators();
      this.#update();
    });

    if (!this.#isPaused) {
      this.resume();
    }

    this.#write(this.#codes.screenAlt);

    return this;
  }

  /**
   * Disable a logger.
   * When disabled, it removes all listeners, resets screen buffer, and clears all logs.
   * @returns {Instance} a logger instance.
   */
  disable() {
    if (this.#isDisabled) {
      return this;
    }

    this.#isDisabled = true;

    if (!this.#initialized) {
      return this;
    }

    const isPaused = this.#isPaused;

    process.off('exit', this.#onExit);

    this.clear();
    this.#write(this.#codes.screenNorm);
    this.pause();

    this.#isPaused = isPaused;

    return this;
  }

  /**
   * Update the console with the last messages, resume spinners and listen for user interactions.
   * Use this after {@link #module_logion--module.exports.Logion+pause|pause}.
   * @returns {Instance} a logger instance.
   */
  resume() {
    if (this.#isDisabled) {
      return this;
    }

    this.pause();

    this.#isPaused = false;

    this.#write(this.#codes.cursorHide);

    this.#input = readline.createInterface({
      input: this.#streamIn,
      escapeCodeTimeout: 50,
    });

    readline.emitKeypressEvents(this.#streamIn, this.#input);

    this.#streamIn.on('keypress', (chunk, key) => {
      if (!key) {
        return;
      }

      if ((key.ctrl && key.name === 'c') || key.name === 'q') {
        process.exit();
      }

      if (Number.isNaN(this.#startPos)) {
        return;
      }

      if (!key.shift && (key.name === 'up' || key.name === 'k')) {
        this.#startPos--;
        this.renderEnd = false;
        this.#update();
        return;
      }

      if (!key.shift && (key.name === 'down' || key.name === 'j')) {
        this.#startPos++;
        this.renderEnd = false;
        this.#update();
        return;
      }

      if ((key.shift && key.name === 'up') || key.name === 'home') {
        this.#startPos = 0;
        this.renderEnd = false;
        this.#update();
        return;
      }

      if ((key.shift && key.name === 'down') || key.name === 'end') {
        this.renderEnd = true;
        this.#update();
      }
    });

    this.#streamIn.setRawMode(true);

    return this;
  }

  /**
   * Pause all logging, remove all listeners.
   * Use this to temporary output something outside a logger instance, or to release a process from events listening (by logion).
   * @returns {Instance} a logger instance.
   */
  pause() {
    this.#isPaused = true;

    this.#write(this.#codes.cursorShow);

    if (this.#input) {
      this.#input.close();
      this.#input = null;
    }

    return this;
  }

  /**
   * Width of a console.
   * @readonly
   * @returns {number} width in chars.
   */
  get width() {
    return (
      this.#streamOut?.columns || Number.parseInt(process.env.COLUMNS, 10) || 80
    );
  }

  /**
   * Height of a console.
   * @readonly
   * @returns {number} height in chars.
   */
  get height() {
    return this.#streamOut?.rows || Number.parseInt(process.env.ROWS, 10) || 40;
  }

  /**
   * Returns true if a logger is disabled.
   * @readonly
   * @returns {boolean} is disabled.
   */
  get disabled() {
    return this.#isDisabled;
  }

  /**
   * Returns true if a logger is paused.
   * @readonly
   * @returns {boolean} is paused.
   */
  get paused() {
    return this.#isPaused;
  }

  /**
   * Shortening style names enum.
   * See {@link #module_logion--module.exports..styleName|Available style names}
   * @readonly
   * @returns {object} style names enum.
   */
  get styleNames() {
    return {
      SUCCESS: 'success',
      ERROR: 'error',
      INFO: 'info',
      BOLD: 'bold',
      UNDERLINE: 'underline',
      ITALIC: 'italic',
      STRIKETHROUGH: 'strikethrough',
    };
  }

  #render(final = false) {
    if (this.#isDisabled) {
      return this;
    }

    if (!this.#initialized) {
      this.enable();
    }

    if (!final) {
      this.#clearScreen();
    }

    let accum = '';

    for (const chunk of this.#chunks) {
      accum += chunk[1];
    }

    if (final) {
      this.#write(accum);

      return this;
    }

    const lines = wrapAnsi(accum, this.width, {
      wordWrap: false,
      trim: false,
    }).split(this.#codes.nl);
    const lineLen = lines.length;

    if (Number.isNaN(this.#startPos)) {
      this.#startPos = lineLen - this.height;
    }

    if (this.#startPos < 0) {
      this.#startPos = 0;
    }

    if (this.height > lineLen) {
      this.#startPos = 0;
      this.renderEnd = true;
    } else if (this.renderEnd || this.#startPos + this.height > lineLen) {
      this.#startPos = lineLen - this.height + 1;
      this.renderEnd = true;
    }

    const content = lines
      .slice(this.#startPos, this.#startPos + this.height)
      .join(this.#codes.nl);

    this.#write(content);

    return this;
  }

  #update() {
    if (this.#isDisabled || this.#isPaused) {
      return this;
    }

    this.#stopUpdater();
    this.#render();

    if (this.#activeSpinners.size) {
      this.#startUpdater();
    }

    return this;
  }

  #startUpdater(delay = this.#renderInterval) {
    this.#stopUpdater();
    this.#updateTimout = setTimeout(this.#updateSpinners.bind(this), delay);

    return this;
  }

  #stopUpdater() {
    clearTimeout(this.#updateTimout);
    this.#updateTimout = null;
  }

  #clearScreen() {
    this.#streamOut.cursorTo(0, 0);
    this.#write(this.#codes.screenClear);
    this.#streamOut.clearScreenDown();

    return this;
  }

  #updateSeparators() {
    if (!this.#separators.size) {
      return this;
    }

    for (const inst of this.#separators) {
      const string = `${
        inst[1].startNl ? '' : this.#codes.nl
      }${inst[1].char.repeat(this.width)}${this.#codes.nl}`;
      const colored = chalk[inst[1].color](string);

      this.#chunks.set(inst[0], colored);
    }

    return this;
  }

  #updateSpinners() {
    if (!this.#activeSpinners.size) {
      return this;
    }

    for (const inst of this.#spinners) {
      if (!inst[1].active) {
        continue;
      }

      const nextFrame = inst[1].frame + 1;
      const newFrame =
        nextFrame === this.#spinOpts.frames.length ? 0 : nextFrame;
      const string = `${inst[1].prefix}${chalk[inst[1].color](
        this.#spinOpts.frames[newFrame]
      )} ${inst[1].text}${this.#codes.nl}`;

      this.#spinners.set(inst[0], {
        ...inst[1],
        frame: newFrame,
      });
      this.#chunks.set(inst[0], string);
    }

    this.#update();

    return this;
  }

  #onExit() {
    this.#stopUpdater();
    this.spinnerDoneAll();
    this.#write(this.#codes.screenNorm);
    this.#render(true);
    this.#write(this.#codes.nl);
    this.pause();
  }

  #rand() {
    return crypto.randomBytes(16).toString('hex');
  }
}

/** Class representing a logger. */
export default Logion;

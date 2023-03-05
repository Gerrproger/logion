import stream from 'node:stream';
import t from 'tap';
import Logion from '../index.js';

class ReadStream extends stream.Readable {
  isTTY = true;
  isRaw = false;

  setRawMode(mode) {
    this.isRaw = mode;
  }

  _read() {}
}

class WriteStream extends stream.Writable {
  #result = '';

  isTTY = true;
  columns = 20;
  rows = 10;

  write(chunk) {
    this.#result += chunk;
    super.write(...arguments);
  }

  toString() {
    return encodeURIComponent(this.#result);
  }
  reset() {
    this.#result = '';
  }

  clearScreenDown() {
    this.reset();
  }
  clearLine() {
    this.reset();
  }
  getWindowSize() {
    return [this.columns, this.rows];
  }

  getColorDepth() {}
  hasColors() {}
  moveCursor() {}
  cursorTo() {}

  _write() {}
}

const streamIn = new ReadStream();
const streamOut = new WriteStream();

const logger = new Logion({ streamIn, streamOut, spinnerFrames: ['*', '*'] });

t.test('log(), removeLog()', async (t) => {
  streamOut.reset();
  logger.log('Simple log.');
  t.equal(streamOut.toString(), 'Simple%20log.');

  streamOut.reset();
  logger.log('Will be removed', 'unique').removeLog('unique');
  t.equal(streamOut.toString(), 'Simple%20log.');
});

t.test('clear()', async (t) => {
  streamOut.reset();
  logger.clear();
  t.equal(streamOut.toString(), '');
});

t.test('text()', async (t) => {
  streamOut.reset();
  logger.clear().text('JUST TEXT');
  t.equal(streamOut.toString(), 'JUST%20TEXT');

  streamOut.reset();
  logger.clear().text('Success TEXT', 'success');
  t.equal(streamOut.toString(), '%1B%5B32mSuccess%20TEXT%1B%5B39m');

  streamOut.reset();
  logger.clear().text('Error TEXT', 'error');
  t.equal(streamOut.toString(), '%1B%5B31mError%20TEXT%1B%5B39m');

  streamOut.reset();
  logger.clear().text('Info TEXT', 'info');
  t.equal(streamOut.toString(), '%1B%5B35mInfo%20TEXT%1B%5B39m');

  streamOut.reset();
  logger.clear().text('Bold TEXT', 'bold');
  t.equal(streamOut.toString(), '%1B%5B1mBold%20TEXT%1B%5B22m');

  streamOut.reset();
  logger.clear().text('Underlined TEXT', 'underline');
  t.equal(streamOut.toString(), '%1B%5B4mUnderlined%20TEXT%1B%5B24m');

  streamOut.reset();
  logger.clear().text('Italic TEXT', 'italic');
  t.equal(streamOut.toString(), '%1B%5B3mItalic%20TEXT%1B%5B23m');

  streamOut.reset();
  logger.clear().text('Strikethrough TEXT', 'strikethrough');
  t.equal(streamOut.toString(), '%1B%5B9mStrikethrough%20TEXT%1B%5B29m');

  streamOut.reset();
  logger.clear().text('Styled TEXT', {
    bold: true,
    italic: true,
    underline: true,
    strikethrough: true,
    bgColor: 'red',
  });
  t.equal(
    streamOut.toString(),
    '%1B%5B1m%1B%5B4m%1B%5B3m%1B%5B9m%1B%5B41mStyled%20TEXT%1B%5B49m%1B%5B29m%1B%5B23m%1B%5B24m%1B%5B22m'
  );

  streamOut.reset();
  logger
    .clear()
    .text('Identified text', undefined, 'unique')
    .removeLog('unique');
  t.equal(streamOut.toString(), '');
});

t.test('newline()', async (t) => {
  streamOut.reset();
  logger.clear().newline();
  t.equal(streamOut.toString(), '%0A');

  streamOut.reset();
  logger.clear().newline(5);
  t.equal(streamOut.toString(), '%0A%0A%0A%0A%0A');

  streamOut.reset();
  logger
    .clear()
    .newline(3)
    .newline(2)
    .newline(1)
    .newline(0)
    .newline(4)
    .newline(2);
  t.equal(streamOut.toString(), '%0A%0A%0A%0A');

  streamOut.reset();
  logger.clear().newline(3).newline(2, true).newline(1, true);
  t.equal(streamOut.toString(), '%0A%0A%0A%0A%0A%0A');

  streamOut.reset();
  logger.clear().newline(2, false, 'unique').removeLog('unique');
  t.equal(streamOut.toString(), '');
});

t.test('indent()', async (t) => {
  streamOut.reset();
  logger.clear().indent();
  t.equal(streamOut.toString(), '%20%20');

  streamOut.reset();
  logger.clear().indent(5);
  t.equal(streamOut.toString(), '%20%20%20%20%20');

  streamOut.reset();
  logger.clear().indent(1, 'unique').removeLog('unique');
  t.equal(streamOut.toString(), '');
});

t.test('separate()', async (t) => {
  streamOut.reset();
  logger.clear().separate();
  t.equal(
    streamOut.toString(),
    '%1B%5B90m%1B%5B39m%0A%1B%5B90m%E2%80%95%E2%80%95%E2%80%95%E2%80%95%E2%80%95%E2%80%95%E2%80%95%E2%80%95%E2%80%95%E2%80%95%E2%80%95%E2%80%95%E2%80%95%E2%80%95%E2%80%95%E2%80%95%E2%80%95%E2%80%95%E2%80%95%E2%80%95%1B%5B39m%0A%1B%5B90m%1B%5B39m'
  );

  streamOut.reset();
  logger.clear().separate().separate().separate();
  t.equal(
    streamOut.toString(),
    '%1B%5B90m%1B%5B39m%0A%1B%5B90m%E2%80%95%E2%80%95%E2%80%95%E2%80%95%E2%80%95%E2%80%95%E2%80%95%E2%80%95%E2%80%95%E2%80%95%E2%80%95%E2%80%95%E2%80%95%E2%80%95%E2%80%95%E2%80%95%E2%80%95%E2%80%95%E2%80%95%E2%80%95%1B%5B39m%0A%1B%5B90m%1B%5B39m'
  );

  streamOut.reset();
  logger.clear().separate('red', '~');
  t.equal(
    streamOut.toString(),
    '%1B%5B31m%1B%5B39m%0A%1B%5B31m~~~~~~~~~~~~~~~~~~~~%1B%5B39m%0A%1B%5B31m%1B%5B39m'
  );

  streamOut.reset();
  logger.clear().separate(undefined, undefined, 'unique').removeLog('unique');
  t.equal(streamOut.toString(), '');
});

t.test('line()', async (t) => {
  streamOut.reset();
  logger.clear().line();
  t.equal(streamOut.toString(), '%0A%20%0A');

  streamOut.reset();
  logger.clear().line('This is a line.', 'info', 3);
  t.equal(
    streamOut.toString(),
    '%0A%20%20%20%1B%5B35mThis%20is%20a%20line.%1B%5B39m%0A'
  );
});

t.test('beep()', async (t) => {
  streamOut.reset();
  logger.clear().beep();
  t.equal(streamOut.toString(), '%07');
});

t.test('enable(), disable()', async (t) => {
  streamOut.reset();
  logger.clear().text('Hello').disable().text(' World!');
  t.equal(streamOut.toString(), 'Hello%1B%5B%3F1049l%1B%5B%3F25h');

  streamOut.reset();
  logger
    .clear()
    .text('Hello')
    .disable()
    .text(' my only ')
    .enable()
    .text(' World!');
  t.equal(streamOut.toString(), 'Hello%20World!');
});

t.test('resume(), pause()', async (t) => {
  streamOut.reset();
  logger.clear().text('Hello').pause().text(' World!');
  t.equal(streamOut.toString(), 'Hello%1B%5B%3F25h');

  streamOut.reset();
  logger
    .clear()
    .text('Hello')
    .pause()
    .text(' my only ')
    .resume()
    .text(' World!');
  t.equal(streamOut.toString(), 'Hello%20my%20only%20%20World%0A!');
});

t.test('spinner(), pause()', async (t) => {
  streamOut.reset();
  logger.clear().spinner('unique').pause();
  t.equal(streamOut.toString(), '%0A%1B%5B37m*%1B%5B39m%20%0A%1B%5B%3F25h');

  streamOut.reset();
  logger
    .clear()
    .resume()
    .spinner('unique', 'Spinner', { color: 'blue', indent: 3 })
    .pause();
  t.equal(
    streamOut.toString(),
    '%0A%20%20%20%1B%5B34m*%1B%5B39m%20Spinner%0A%1B%5B%3F25h'
  );
});

t.test('spinnerDone()', async (t) => {
  streamOut.reset();
  logger
    .clear()
    .resume()
    .spinner('unique1', 'Spinner', { color: 'blue', indent: 3 })
    .spinner('unique2', 'This will change', { color: 'blue', indent: 1 })
    .spinnerDone('unique2', { text: 'Spinner 2', color: 'red', char: '^' })
    .spinnerDone('unique1');
  t.equal(
    streamOut.toString(),
    '%0A%20%20%20%1B%5B34m%E2%9C%B1%1B%5B39m%20Spinner%0A%20%1B%5B31m%5E%1B%5B39m%20Spinner%202%0A'
  );
});

t.test('spinnerDoneAll()', async (t) => {
  streamOut.reset();
  logger
    .clear()
    .spinner('unique1', 'Spinner')
    .spinner('unique2', 'Spinner 2')
    .spinnerDone('unique2')
    .spinnerDoneAll();
  t.equal(
    streamOut.toString(),
    '%0A%1B%5B37m%E2%9C%B8%1B%5B39m%20Spinner%0A%1B%5B37m%E2%9C%B1%1B%5B39m%20Spinner%202%0A'
  );
});

t.test('style()', async (t) => {
  let str = '';
  const encoded = () => encodeURIComponent(str);

  str = logger.style('JUST TEXT');
  t.equal(encoded(), 'JUST%20TEXT');

  str = logger.style('Success TEXT', 'success');
  t.equal(encoded(), '%1B%5B32mSuccess%20TEXT%1B%5B39m');

  str = logger.style('Error TEXT', 'error');
  t.equal(encoded(), '%1B%5B31mError%20TEXT%1B%5B39m');

  str = logger.style('Info TEXT', 'info');
  t.equal(encoded(), '%1B%5B35mInfo%20TEXT%1B%5B39m');

  str = logger.style('Bold TEXT', 'bold');
  t.equal(encoded(), '%1B%5B1mBold%20TEXT%1B%5B22m');

  str = logger.style('Underlined TEXT', 'underline');
  t.equal(encoded(), '%1B%5B4mUnderlined%20TEXT%1B%5B24m');

  str = logger.style('Italic TEXT', 'italic');
  t.equal(encoded(), '%1B%5B3mItalic%20TEXT%1B%5B23m');

  str = logger.style('Strikethrough TEXT', 'strikethrough');
  t.equal(encoded(), '%1B%5B9mStrikethrough%20TEXT%1B%5B29m');

  str = logger.style('Styled TEXT', {
    bold: true,
    italic: true,
    underline: true,
    strikethrough: true,
    bgColor: 'red',
  });
  t.equal(
    encoded(),
    '%1B%5B1m%1B%5B4m%1B%5B3m%1B%5B9m%1B%5B41mStyled%20TEXT%1B%5B49m%1B%5B29m%1B%5B23m%1B%5B24m%1B%5B22m'
  );
});

t.test('styleReset()', async (t) => {
  t.equal(
    logger.styleReset(
      '\u001B[1m\u001B[4m\u001B[3m\u001B[9m\u001B[41mStyled TEXT\u001B[49m\u001B[29m\u001B[23m\u001B[24m\u001B[22m'
    ),
    'Styled TEXT'
  );
});

t.test('disabled', async (t) => {
  streamOut.reset();
  logger.clear().disable();
  t.equal(logger.disabled, true);
});

t.test('paused', async (t) => {
  streamOut.reset();
  logger.clear().pause();
  t.equal(logger.paused, true);
});

t.test('width, height', async (t) => {
  t.equal(logger.width, 20);
  t.equal(logger.height, 10);
});

t.test('styleNames', async (t) => {
  t.strictSame(logger.styleNames, {
    SUCCESS: 'success',
    ERROR: 'error',
    INFO: 'info',
    BOLD: 'bold',
    UNDERLINE: 'underline',
    ITALIC: 'italic',
    STRIKETHROUGH: 'strikethrough',
  });
});

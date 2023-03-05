import Logion from './index.js';

const logger = new Logion({
  spinnerDoneAllChar: '$',
  spinnerFormatDone: (str) => str.replace(/-/g, '+'),
});

logger
  .text('This will be cleared')
  .clear()
  .text('JUST TEXT')
  .newline()
  .text('From a new line')
  .separate()
  .separate()
  .text('Only one separator');

setTimeout(() => {
  logger
    .newline()
    .indent()
    .text('With default indent (2)...')
    .indent(5)
    .text('indent (5) in the middle of a line')
    .newline(3)
    .newline(2)
    .newline(1)
    .newline()
    .text('After 2 empty lines');
}, 300);

setTimeout(() => {
  logger
    .newline()
    .text(' Success ', 'success')
    .text(' Error ', 'error')
    .text(' Info ', 'info')
    .text(' Bold ', 'bold')
    .text(' Underline ', 'underline')
    .text(' Italic ', 'italic')
    .text(' Strikethrough ', 'strikethrough')
    .newline()
    .text(' Blue background bold underlined! ', {
      bgColor: 'blue',
      bold: true,
      underline: true,
    });
}, 600);

setTimeout(() => {
  logger
    .newline()
    .text('This message will be removed...', 'error', 'remove')
    .beep();
}, 900);

setTimeout(() => {
  logger
    .separate('blue', '~')
    .log('Wow, fancy separator!')
    .newline()
    .text(
      logger.style('Yellow italic strikethrough', {
        color: 'yellow',
        italic: true,
        strikethrough: true,
      })
    )
    .line('Whole line with indent (3) and info style', 'info', 3)
    .separate()
    .newline(2)
    .spinner('1', 'First spinner');
}, 1500);

setTimeout(() => {
  logger
    .spinner('2', 'Second spinner, waw')
    .spinner('3', 'Third spinner, yay')
    .text('You can log between spinners and style them too')
    .spinner('4', logger.style('Colorfull', { color: 'magenta' }), {
      color: 'yellow',
      indent: 3,
    })
    .text(
      'Very long text will be automatically wrapped on console resize | Very long text will be automatically wrapped on console resize | Very long text will be automatically wrapped on console resize | Very long text will be automatically wrapped on console resize | Very long text will be automatically wrapped on console resize | Very long text will be automatically wrapped on console resize | Very long text will be automatically wrapped on console resize.'
    )
    .spinner('5', 'This minus will become plus (-)');
}, 2000);

setTimeout(() => {
  logger.spinnerDone('1', { text: 'First spinner done! (changed text)' });
}, 1800);

setTimeout(() => {
  logger
    .spinnerDone('2', {
      text: 'Second spinner done! (changed color)',
      color: 'blue',
    })
    .removeLog('remove');
}, 2500);

setTimeout(() => {
  logger
    .spinnerDone('3', {
      text: 'Third spinner done! (changed character)',
      char: '%',
    })
    .spinnerDone('5');
}, 3000);

setTimeout(() => {
  process.exit();
}, 4000);

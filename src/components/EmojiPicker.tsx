import { useState, useMemo } from 'preact/hooks';

interface Emoji {
  emoji: string;
  name: string;
  category: string;
}

const EMOJI_DATA: Emoji[] = [
  // Smileys
  { emoji: '😀', name: 'grinning face', category: 'Smileys' },
  { emoji: '😁', name: 'beaming face with smiling eyes', category: 'Smileys' },
  { emoji: '😂', name: 'face with tears of joy', category: 'Smileys' },
  { emoji: '🤣', name: 'rolling on the floor laughing', category: 'Smileys' },
  { emoji: '😃', name: 'grinning face with big eyes', category: 'Smileys' },
  { emoji: '😄', name: 'grinning face with smiling eyes', category: 'Smileys' },
  { emoji: '😅', name: 'grinning face with sweat', category: 'Smileys' },
  { emoji: '😆', name: 'grinning squinting face', category: 'Smileys' },
  { emoji: '😉', name: 'winking face', category: 'Smileys' },
  { emoji: '😊', name: 'smiling face with smiling eyes', category: 'Smileys' },
  { emoji: '😋', name: 'face savoring food', category: 'Smileys' },
  { emoji: '😎', name: 'smiling face with sunglasses', category: 'Smileys' },
  { emoji: '😍', name: 'smiling face with heart eyes', category: 'Smileys' },
  { emoji: '🥰', name: 'smiling face with hearts', category: 'Smileys' },
  { emoji: '😘', name: 'face blowing a kiss', category: 'Smileys' },
  { emoji: '🤩', name: 'star-struck', category: 'Smileys' },
  { emoji: '🥳', name: 'partying face', category: 'Smileys' },
  { emoji: '😏', name: 'smirking face', category: 'Smileys' },
  { emoji: '😒', name: 'unamused face', category: 'Smileys' },
  { emoji: '😞', name: 'disappointed face', category: 'Smileys' },
  { emoji: '😔', name: 'pensive face', category: 'Smileys' },
  { emoji: '😟', name: 'worried face', category: 'Smileys' },
  { emoji: '😕', name: 'confused face', category: 'Smileys' },
  { emoji: '🙁', name: 'slightly frowning face', category: 'Smileys' },
  { emoji: '☹️', name: 'frowning face', category: 'Smileys' },
  { emoji: '😣', name: 'persevering face', category: 'Smileys' },
  { emoji: '😖', name: 'confounded face', category: 'Smileys' },
  { emoji: '😫', name: 'tired face', category: 'Smileys' },
  { emoji: '😩', name: 'weary face', category: 'Smileys' },
  { emoji: '🥺', name: 'pleading face', category: 'Smileys' },
  { emoji: '😢', name: 'crying face', category: 'Smileys' },
  { emoji: '😭', name: 'loudly crying face', category: 'Smileys' },
  { emoji: '😤', name: 'face with steam from nose', category: 'Smileys' },
  { emoji: '😠', name: 'angry face', category: 'Smileys' },
  { emoji: '😡', name: 'enraged face', category: 'Smileys' },
  { emoji: '🤬', name: 'face with symbols on mouth', category: 'Smileys' },
  { emoji: '🤯', name: 'exploding head', category: 'Smileys' },
  { emoji: '😳', name: 'flushed face', category: 'Smileys' },
  { emoji: '🥵', name: 'hot face', category: 'Smileys' },
  { emoji: '🥶', name: 'cold face', category: 'Smileys' },
  { emoji: '😱', name: 'face screaming in fear', category: 'Smileys' },
  { emoji: '😨', name: 'fearful face', category: 'Smileys' },
  { emoji: '😰', name: 'anxious face with sweat', category: 'Smileys' },
  { emoji: '😓', name: 'downcast face with sweat', category: 'Smileys' },
  { emoji: '🤔', name: 'thinking face', category: 'Smileys' },
  { emoji: '🤭', name: 'face with hand over mouth', category: 'Smileys' },
  { emoji: '🤫', name: 'shushing face', category: 'Smileys' },
  { emoji: '🤥', name: 'lying face', category: 'Smileys' },
  { emoji: '😶', name: 'face without mouth', category: 'Smileys' },
  { emoji: '😐', name: 'neutral face', category: 'Smileys' },
  { emoji: '😑', name: 'expressionless face', category: 'Smileys' },
  { emoji: '😬', name: 'grimacing face', category: 'Smileys' },
  { emoji: '🙄', name: 'face with rolling eyes', category: 'Smileys' },
  { emoji: '😯', name: 'hushed face', category: 'Smileys' },
  { emoji: '😲', name: 'astonished face', category: 'Smileys' },
  { emoji: '🥱', name: 'yawning face', category: 'Smileys' },
  { emoji: '😴', name: 'sleeping face', category: 'Smileys' },
  { emoji: '🤐', name: 'zipper-mouth face', category: 'Smileys' },
  { emoji: '🥴', name: 'woozy face', category: 'Smileys' },
  { emoji: '🤢', name: 'nauseated face', category: 'Smileys' },
  { emoji: '🤮', name: 'face vomiting', category: 'Smileys' },
  { emoji: '🤧', name: 'sneezing face', category: 'Smileys' },
  { emoji: '😷', name: 'face with medical mask', category: 'Smileys' },
  { emoji: '🤒', name: 'face with thermometer', category: 'Smileys' },
  { emoji: '🤕', name: 'face with head-bandage', category: 'Smileys' },
  { emoji: '🤑', name: 'money-mouth face', category: 'Smileys' },
  { emoji: '😈', name: 'smiling face with horns', category: 'Smileys' },
  { emoji: '👿', name: 'angry face with horns', category: 'Smileys' },
  { emoji: '💀', name: 'skull', category: 'Smileys' },
  { emoji: '☠️', name: 'skull and crossbones', category: 'Smileys' },
  { emoji: '💩', name: 'pile of poo', category: 'Smileys' },
  { emoji: '🤡', name: 'clown face', category: 'Smileys' },
  { emoji: '👹', name: 'ogre', category: 'Smileys' },
  { emoji: '👻', name: 'ghost', category: 'Smileys' },
  { emoji: '👽', name: 'alien', category: 'Smileys' },
  { emoji: '🤖', name: 'robot', category: 'Smileys' },
  // People
  { emoji: '👋', name: 'waving hand', category: 'People' },
  { emoji: '🤚', name: 'raised back of hand', category: 'People' },
  { emoji: '✋', name: 'raised hand', category: 'People' },
  { emoji: '🖖', name: 'vulcan salute', category: 'People' },
  { emoji: '👌', name: 'OK hand', category: 'People' },
  { emoji: '🤌', name: 'pinched fingers', category: 'People' },
  { emoji: '✌️', name: 'victory hand', category: 'People' },
  { emoji: '🤞', name: 'crossed fingers', category: 'People' },
  { emoji: '🤟', name: 'love-you gesture', category: 'People' },
  { emoji: '🤘', name: 'sign of the horns', category: 'People' },
  { emoji: '👈', name: 'backhand index pointing left', category: 'People' },
  { emoji: '👉', name: 'backhand index pointing right', category: 'People' },
  { emoji: '👆', name: 'backhand index pointing up', category: 'People' },
  { emoji: '👇', name: 'backhand index pointing down', category: 'People' },
  { emoji: '☝️', name: 'index pointing up', category: 'People' },
  { emoji: '👍', name: 'thumbs up', category: 'People' },
  { emoji: '👎', name: 'thumbs down', category: 'People' },
  { emoji: '✊', name: 'raised fist', category: 'People' },
  { emoji: '👊', name: 'oncoming fist', category: 'People' },
  { emoji: '🤛', name: 'left-facing fist', category: 'People' },
  { emoji: '🤜', name: 'right-facing fist', category: 'People' },
  { emoji: '👏', name: 'clapping hands', category: 'People' },
  { emoji: '🙌', name: 'raising hands', category: 'People' },
  { emoji: '🤲', name: 'palms up together', category: 'People' },
  { emoji: '🤝', name: 'handshake', category: 'People' },
  { emoji: '🙏', name: 'folded hands', category: 'People' },
  { emoji: '💪', name: 'flexed biceps', category: 'People' },
  { emoji: '🦾', name: 'mechanical arm', category: 'People' },
  { emoji: '🦿', name: 'mechanical leg', category: 'People' },
  { emoji: '👀', name: 'eyes', category: 'People' },
  { emoji: '👁️', name: 'eye', category: 'People' },
  { emoji: '👂', name: 'ear', category: 'People' },
  { emoji: '👃', name: 'nose', category: 'People' },
  { emoji: '🧠', name: 'brain', category: 'People' },
  { emoji: '🦷', name: 'tooth', category: 'People' },
  { emoji: '👅', name: 'tongue', category: 'People' },
  { emoji: '👄', name: 'mouth', category: 'People' },
  // Nature
  { emoji: '🐶', name: 'dog face', category: 'Nature' },
  { emoji: '🐱', name: 'cat face', category: 'Nature' },
  { emoji: '🐭', name: 'mouse face', category: 'Nature' },
  { emoji: '🐹', name: 'hamster', category: 'Nature' },
  { emoji: '🐰', name: 'rabbit face', category: 'Nature' },
  { emoji: '🦊', name: 'fox', category: 'Nature' },
  { emoji: '🐻', name: 'bear', category: 'Nature' },
  { emoji: '🐼', name: 'panda', category: 'Nature' },
  { emoji: '🐨', name: 'koala', category: 'Nature' },
  { emoji: '🐯', name: 'tiger face', category: 'Nature' },
  { emoji: '🦁', name: 'lion', category: 'Nature' },
  { emoji: '🐮', name: 'cow face', category: 'Nature' },
  { emoji: '🐷', name: 'pig face', category: 'Nature' },
  { emoji: '🐸', name: 'frog', category: 'Nature' },
  { emoji: '🐵', name: 'monkey face', category: 'Nature' },
  { emoji: '🙈', name: 'see-no-evil monkey', category: 'Nature' },
  { emoji: '🙉', name: 'hear-no-evil monkey', category: 'Nature' },
  { emoji: '🙊', name: 'speak-no-evil monkey', category: 'Nature' },
  { emoji: '🐔', name: 'chicken', category: 'Nature' },
  { emoji: '🐧', name: 'penguin', category: 'Nature' },
  { emoji: '🐦', name: 'bird', category: 'Nature' },
  { emoji: '🦆', name: 'duck', category: 'Nature' },
  { emoji: '🦅', name: 'eagle', category: 'Nature' },
  { emoji: '🦉', name: 'owl', category: 'Nature' },
  { emoji: '🦇', name: 'bat', category: 'Nature' },
  { emoji: '🐺', name: 'wolf', category: 'Nature' },
  { emoji: '🐗', name: 'boar', category: 'Nature' },
  { emoji: '🐴', name: 'horse face', category: 'Nature' },
  { emoji: '🦄', name: 'unicorn', category: 'Nature' },
  { emoji: '🐝', name: 'honeybee', category: 'Nature' },
  { emoji: '🐛', name: 'bug', category: 'Nature' },
  { emoji: '🦋', name: 'butterfly', category: 'Nature' },
  { emoji: '🐌', name: 'snail', category: 'Nature' },
  { emoji: '🐞', name: 'lady beetle', category: 'Nature' },
  { emoji: '🐜', name: 'ant', category: 'Nature' },
  { emoji: '🦟', name: 'mosquito', category: 'Nature' },
  { emoji: '🐢', name: 'turtle', category: 'Nature' },
  { emoji: '🐍', name: 'snake', category: 'Nature' },
  { emoji: '🦎', name: 'lizard', category: 'Nature' },
  { emoji: '🐉', name: 'dragon', category: 'Nature' },
  { emoji: '🌵', name: 'cactus', category: 'Nature' },
  { emoji: '🌲', name: 'evergreen tree', category: 'Nature' },
  { emoji: '🌳', name: 'deciduous tree', category: 'Nature' },
  { emoji: '🌴', name: 'palm tree', category: 'Nature' },
  { emoji: '🌱', name: 'seedling', category: 'Nature' },
  { emoji: '🌿', name: 'herb', category: 'Nature' },
  { emoji: '🍀', name: 'four leaf clover', category: 'Nature' },
  { emoji: '🍁', name: 'maple leaf', category: 'Nature' },
  { emoji: '🍂', name: 'fallen leaf', category: 'Nature' },
  { emoji: '🍃', name: 'leaf fluttering in wind', category: 'Nature' },
  { emoji: '🌸', name: 'cherry blossom', category: 'Nature' },
  { emoji: '🌹', name: 'rose', category: 'Nature' },
  { emoji: '🌺', name: 'hibiscus', category: 'Nature' },
  { emoji: '🌻', name: 'sunflower', category: 'Nature' },
  { emoji: '🌼', name: 'blossom', category: 'Nature' },
  { emoji: '🌷', name: 'tulip', category: 'Nature' },
  // Food
  { emoji: '🍎', name: 'red apple', category: 'Food' },
  { emoji: '🍊', name: 'tangerine', category: 'Food' },
  { emoji: '🍋', name: 'lemon', category: 'Food' },
  { emoji: '🍇', name: 'grapes', category: 'Food' },
  { emoji: '🍓', name: 'strawberry', category: 'Food' },
  { emoji: '🍒', name: 'cherries', category: 'Food' },
  { emoji: '🍑', name: 'peach', category: 'Food' },
  { emoji: '🥭', name: 'mango', category: 'Food' },
  { emoji: '🍕', name: 'pizza', category: 'Food' },
  { emoji: '🍔', name: 'hamburger', category: 'Food' },
  { emoji: '🍟', name: 'french fries', category: 'Food' },
  { emoji: '🌮', name: 'taco', category: 'Food' },
  { emoji: '🌯', name: 'burrito', category: 'Food' },
  { emoji: '🍜', name: 'steaming bowl', category: 'Food' },
  { emoji: '🍣', name: 'sushi', category: 'Food' },
  { emoji: '🍦', name: 'soft ice cream', category: 'Food' },
  { emoji: '🎂', name: 'birthday cake', category: 'Food' },
  { emoji: '🍰', name: 'shortcake', category: 'Food' },
  { emoji: '🍩', name: 'doughnut', category: 'Food' },
  { emoji: '🍪', name: 'cookie', category: 'Food' },
  { emoji: '☕', name: 'hot beverage', category: 'Food' },
  { emoji: '🍵', name: 'teacup without handle', category: 'Food' },
  { emoji: '🥤', name: 'cup with straw', category: 'Food' },
  { emoji: '🍺', name: 'beer mug', category: 'Food' },
  { emoji: '🍻', name: 'clinking beer mugs', category: 'Food' },
  { emoji: '🥂', name: 'clinking glasses', category: 'Food' },
  // Travel
  { emoji: '🚀', name: 'rocket', category: 'Travel' },
  { emoji: '✈️', name: 'airplane', category: 'Travel' },
  { emoji: '🚁', name: 'helicopter', category: 'Travel' },
  { emoji: '🚂', name: 'locomotive', category: 'Travel' },
  { emoji: '🚗', name: 'automobile', category: 'Travel' },
  { emoji: '🚕', name: 'taxi', category: 'Travel' },
  { emoji: '🚙', name: 'sport utility vehicle', category: 'Travel' },
  { emoji: '🏎️', name: 'racing car', category: 'Travel' },
  { emoji: '🛵', name: 'motor scooter', category: 'Travel' },
  { emoji: '🚲', name: 'bicycle', category: 'Travel' },
  { emoji: '⛵', name: 'sailboat', category: 'Travel' },
  { emoji: '🚢', name: 'ship', category: 'Travel' },
  { emoji: '🌍', name: 'globe showing europe-africa', category: 'Travel' },
  { emoji: '🌎', name: 'globe showing americas', category: 'Travel' },
  { emoji: '🌏', name: 'globe showing asia-australia', category: 'Travel' },
  { emoji: '🗺️', name: 'world map', category: 'Travel' },
  { emoji: '🗼', name: 'tokyo tower', category: 'Travel' },
  { emoji: '🗽', name: 'statue of liberty', category: 'Travel' },
  { emoji: '🏰', name: 'european castle', category: 'Travel' },
  { emoji: '🏖️', name: 'beach with umbrella', category: 'Travel' },
  { emoji: '🏔️', name: 'snow-capped mountain', category: 'Travel' },
  { emoji: '🌋', name: 'volcano', category: 'Travel' },
  // Objects
  { emoji: '💻', name: 'laptop', category: 'Objects' },
  { emoji: '🖥️', name: 'desktop computer', category: 'Objects' },
  { emoji: '🖨️', name: 'printer', category: 'Objects' },
  { emoji: '⌨️', name: 'keyboard', category: 'Objects' },
  { emoji: '🖱️', name: 'computer mouse', category: 'Objects' },
  { emoji: '📱', name: 'mobile phone', category: 'Objects' },
  { emoji: '📷', name: 'camera', category: 'Objects' },
  { emoji: '📹', name: 'video camera', category: 'Objects' },
  { emoji: '📺', name: 'television', category: 'Objects' },
  { emoji: '📻', name: 'radio', category: 'Objects' },
  { emoji: '🎮', name: 'video game', category: 'Objects' },
  { emoji: '🕹️', name: 'joystick', category: 'Objects' },
  { emoji: '💿', name: 'optical disk', category: 'Objects' },
  { emoji: '💾', name: 'floppy disk', category: 'Objects' },
  { emoji: '📀', name: 'dvd', category: 'Objects' },
  { emoji: '🧮', name: 'abacus', category: 'Objects' },
  { emoji: '☎️', name: 'telephone', category: 'Objects' },
  { emoji: '📞', name: 'telephone receiver', category: 'Objects' },
  { emoji: '📟', name: 'pager', category: 'Objects' },
  { emoji: '📠', name: 'fax machine', category: 'Objects' },
  { emoji: '🔋', name: 'battery', category: 'Objects' },
  { emoji: '🔌', name: 'electric plug', category: 'Objects' },
  { emoji: '💡', name: 'light bulb', category: 'Objects' },
  { emoji: '🔦', name: 'flashlight', category: 'Objects' },
  { emoji: '🕯️', name: 'candle', category: 'Objects' },
  { emoji: '🗑️', name: 'wastebasket', category: 'Objects' },
  { emoji: '🔑', name: 'key', category: 'Objects' },
  { emoji: '🔐', name: 'locked with key', category: 'Objects' },
  { emoji: '🔏', name: 'locked with pen', category: 'Objects' },
  { emoji: '🔒', name: 'locked', category: 'Objects' },
  { emoji: '🔓', name: 'unlocked', category: 'Objects' },
  { emoji: '🔨', name: 'hammer', category: 'Objects' },
  { emoji: '⚒️', name: 'hammer and pick', category: 'Objects' },
  { emoji: '🛠️', name: 'hammer and wrench', category: 'Objects' },
  { emoji: '⚙️', name: 'gear', category: 'Objects' },
  { emoji: '🔩', name: 'nut and bolt', category: 'Objects' },
  { emoji: '🧲', name: 'magnet', category: 'Objects' },
  { emoji: '🔧', name: 'wrench', category: 'Objects' },
  { emoji: '🔬', name: 'microscope', category: 'Objects' },
  { emoji: '🔭', name: 'telescope', category: 'Objects' },
  { emoji: '📡', name: 'satellite antenna', category: 'Objects' },
  { emoji: '💰', name: 'money bag', category: 'Objects' },
  { emoji: '💵', name: 'dollar banknote', category: 'Objects' },
  { emoji: '💳', name: 'credit card', category: 'Objects' },
  { emoji: '📈', name: 'chart increasing', category: 'Objects' },
  { emoji: '📉', name: 'chart decreasing', category: 'Objects' },
  { emoji: '📊', name: 'bar chart', category: 'Objects' },
  // Symbols
  { emoji: '❤️', name: 'red heart', category: 'Symbols' },
  { emoji: '🧡', name: 'orange heart', category: 'Symbols' },
  { emoji: '💛', name: 'yellow heart', category: 'Symbols' },
  { emoji: '💚', name: 'green heart', category: 'Symbols' },
  { emoji: '💙', name: 'blue heart', category: 'Symbols' },
  { emoji: '💜', name: 'purple heart', category: 'Symbols' },
  { emoji: '🖤', name: 'black heart', category: 'Symbols' },
  { emoji: '🤍', name: 'white heart', category: 'Symbols' },
  { emoji: '💔', name: 'broken heart', category: 'Symbols' },
  { emoji: '💯', name: 'hundred points', category: 'Symbols' },
  { emoji: '✅', name: 'check mark button', category: 'Symbols' },
  { emoji: '❌', name: 'cross mark', category: 'Symbols' },
  { emoji: '⚠️', name: 'warning', category: 'Symbols' },
  { emoji: '🚫', name: 'prohibited', category: 'Symbols' },
  { emoji: '✨', name: 'sparkles', category: 'Symbols' },
  { emoji: '⭐', name: 'star', category: 'Symbols' },
  { emoji: '🌟', name: 'glowing star', category: 'Symbols' },
  { emoji: '💫', name: 'dizzy', category: 'Symbols' },
  { emoji: '🔥', name: 'fire', category: 'Symbols' },
  { emoji: '💥', name: 'collision', category: 'Symbols' },
  { emoji: '💢', name: 'anger symbol', category: 'Symbols' },
  { emoji: '💬', name: 'speech balloon', category: 'Symbols' },
  { emoji: '💭', name: 'thought balloon', category: 'Symbols' },
  { emoji: '🔴', name: 'red circle', category: 'Symbols' },
  { emoji: '🟠', name: 'orange circle', category: 'Symbols' },
  { emoji: '🟡', name: 'yellow circle', category: 'Symbols' },
  { emoji: '🟢', name: 'green circle', category: 'Symbols' },
  { emoji: '🔵', name: 'blue circle', category: 'Symbols' },
  { emoji: '🟣', name: 'purple circle', category: 'Symbols' },
  { emoji: '⚫', name: 'black circle', category: 'Symbols' },
  { emoji: '⚪', name: 'white circle', category: 'Symbols' },
  { emoji: '#️⃣', name: 'keycap number sign', category: 'Symbols' },
  { emoji: '🔢', name: 'input numbers', category: 'Symbols' },
  { emoji: '🔣', name: 'input symbols', category: 'Symbols' },
  { emoji: '🔤', name: 'input latin letters', category: 'Symbols' },
  { emoji: '🆗', name: 'OK button', category: 'Symbols' },
  { emoji: '🆕', name: 'NEW button', category: 'Symbols' },
  { emoji: '🆒', name: 'COOL button', category: 'Symbols' },
  { emoji: '🆓', name: 'FREE button', category: 'Symbols' },
  { emoji: '🆙', name: 'UP! button', category: 'Symbols' },
  { emoji: '🔺', name: 'red triangle pointed up', category: 'Symbols' },
  { emoji: '🔻', name: 'red triangle pointed down', category: 'Symbols' },
  { emoji: '💠', name: 'diamond with a dot', category: 'Symbols' },
  { emoji: '🔷', name: 'large blue diamond', category: 'Symbols' },
  { emoji: '🔶', name: 'large orange diamond', category: 'Symbols' },
];

function toCodePoint(emoji: string): string {
  const cps: string[] = [];
  for (const cp of emoji) {
    const code = cp.codePointAt(0);
    if (code !== undefined && code !== 0xFE0F) {
      cps.push('U+' + code.toString(16).toUpperCase().padStart(4, '0'));
    }
  }
  return cps.join(' ');
}

function toHtmlEntity(emoji: string): string {
  const results: string[] = [];
  for (const cp of emoji) {
    const code = cp.codePointAt(0);
    if (code !== undefined && code !== 0xFE0F) {
      results.push(`&#x${code.toString(16).toUpperCase()};`);
    }
  }
  return results.join('');
}

function toCssContent(emoji: string): string {
  const results: string[] = [];
  for (const cp of emoji) {
    const code = cp.codePointAt(0);
    if (code !== undefined && code !== 0xFE0F) {
      results.push(`\\${code.toString(16).toUpperCase()}`);
    }
  }
  return `"${results.join('')}"`;
}

const CATEGORIES = ['All', ...Array.from(new Set(EMOJI_DATA.map(e => e.category)))];

export default function EmojiPicker() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [selected, setSelected] = useState<Emoji | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return EMOJI_DATA.filter(e => {
      const matchesCat = category === 'All' || e.category === category;
      const matchesSearch = !search || e.name.toLowerCase().includes(search.toLowerCase()) || e.emoji.includes(search);
      return matchesCat && matchesSearch;
    });
  }, [search, category]);

  const copyText = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div class="space-y-4">
      {/* Search */}
      <input
        type="text"
        value={search}
        onInput={(e) => setSearch((e.target as HTMLInputElement).value)}
        placeholder="Search emojis by name..."
        class="w-full px-3 py-2.5 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:border-brand"
      />

      {/* Category filter */}
      <div class="flex flex-wrap gap-1.5">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            class={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
              category === cat
                ? 'bg-brand text-white border-brand'
                : 'bg-surface border-border text-text-muted hover:border-brand/50'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div class="grid grid-cols-8 sm:grid-cols-12 md:grid-cols-16 gap-1 max-h-72 overflow-y-auto bg-surface border border-border rounded-xl p-3">
        {filtered.map((e) => (
          <button
            key={e.emoji}
            onClick={() => setSelected(e)}
            title={e.name}
            class={`text-2xl p-1.5 rounded-lg hover:bg-brand/10 transition-colors leading-none ${
              selected?.emoji === e.emoji ? 'bg-brand/20 ring-1 ring-brand' : ''
            }`}
          >
            {e.emoji}
          </button>
        ))}
        {filtered.length === 0 && (
          <div class="col-span-8 sm:col-span-12 text-center text-text-muted text-sm py-8">No emojis found</div>
        )}
      </div>

      <p class="text-xs text-text-muted">{filtered.length} emojis — click to select</p>

      {/* Selected emoji detail */}
      {selected && (
        <div class="bg-surface border border-brand/30 rounded-xl p-5 space-y-4">
          <div class="flex items-center gap-4">
            <span class="text-6xl">{selected.emoji}</span>
            <div>
              <p class="font-semibold text-text text-lg">{selected.name}</p>
              <p class="text-sm text-text-muted">{selected.category}</p>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { label: 'Emoji', value: selected.emoji },
              { label: 'Unicode', value: toCodePoint(selected.emoji) },
              { label: 'HTML Entity', value: toHtmlEntity(selected.emoji) },
              { label: 'CSS content', value: toCssContent(selected.emoji) },
            ].map(({ label, value }) => (
              <div key={label} class="flex items-center justify-between bg-background border border-border rounded-lg px-3 py-2 gap-2">
                <div>
                  <span class="text-xs text-text-muted block">{label}</span>
                  <code class="text-sm text-text font-mono">{value}</code>
                </div>
                <button
                  onClick={() => copyText(value, label)}
                  class={`text-xs px-2.5 py-1 rounded-md shrink-0 transition-colors ${
                    copied === label ? 'bg-green-500/20 text-green-400' : 'bg-brand/10 text-brand hover:bg-brand/20'
                  }`}
                >
                  {copied === label ? '✓' : 'Copy'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

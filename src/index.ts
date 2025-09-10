#!/usr/bin/env node
/**
 * Command-line Poetry Generator
 *
 * A naive approach that randomly selects words from predefined lists
 * and combines them to create random poems.
 */

// Word lists for poem generation
const wordLists = {
  adjectives: [
    'mysterious',
    'glowing',
    'silent',
    'ancient',
    'golden',
    'distant',
    'peaceful',
    'vibrant',
    'ethereal',
    'majestic',
    'serene',
    'radiant',
    'enchanted',
    'whispered',
    'dancing',
    'shimmering',
    'forgotten',
    'timeless',
    'gentle',
    'luminous',
  ],

  nouns: [
    'moon',
    'river',
    'mountain',
    'star',
    'ocean',
    'forest',
    'meadow',
    'sunset',
    'dream',
    'shadow',
    'light',
    'breeze',
    'flower',
    'tree',
    'cloud',
    'wave',
    'heart',
    'soul',
    'memory',
    'journey',
    'path',
    'horizon',
    'sky',
    'earth',
  ],

  verbs: [
    'whispers',
    'dances',
    'flows',
    'glows',
    'sings',
    'wanders',
    'blooms',
    'soars',
    'embraces',
    'reflects',
    'awakens',
    'sparkles',
    'murmurs',
    'cascades',
    'shimmers',
    'breathes',
    'echoes',
    'glides',
    'dreams',
    'yearns',
  ],

  transitions: [
    'beneath the',
    'through the',
    'beyond the',
    'within the',
    'across the',
    'above the',
    'among the',
    'beside the',
    'around the',
    'over the',
  ],

  endings: [
    'in eternal silence',
    'forever and always',
    'like a forgotten song',
    'in the morning light',
    'where dreams collide',
    'beyond time itself',
    'in perfect harmony',
    'with endless grace',
    'through infinite space',
    'in the depths of wonder',
  ],
};

/**
 * Randomly selects an item from an array
 */
function getRandomItem<T>(array: T[]): T {
  if (array.length === 0) {
    throw new Error('Cannot select from empty array');
  }
  const index = Math.floor(Math.random() * array.length);
  return array[index]!;
}

/**
 * Generates a random poem line with a specific structure
 */
function generatePoemLine(): string {
  const structures = [
    // Structure 1: Adjective + Noun + Verb + Transition + Adjective + Noun
    () => {
      const adj1 = getRandomItem(wordLists.adjectives);
      const noun1 = getRandomItem(wordLists.nouns);
      const verb = getRandomItem(wordLists.verbs);
      const transition = getRandomItem(wordLists.transitions);
      const adj2 = getRandomItem(wordLists.adjectives);
      const noun2 = getRandomItem(wordLists.nouns);
      return `${adj1} ${noun1} ${verb} ${transition} ${adj2} ${noun2}`;
    },

    // Structure 2: Transition + Adjective + Noun + Verb
    () => {
      const transition = getRandomItem(wordLists.transitions);
      const adj = getRandomItem(wordLists.adjectives);
      const noun = getRandomItem(wordLists.nouns);
      const verb = getRandomItem(wordLists.verbs);
      return `${transition} ${adj} ${noun}, ${verb}`;
    },

    // Structure 3: Noun + Verb + Adjective + Noun
    () => {
      const noun1 = getRandomItem(wordLists.nouns);
      const verb = getRandomItem(wordLists.verbs);
      const adj = getRandomItem(wordLists.adjectives);
      const noun2 = getRandomItem(wordLists.nouns);
      return `${noun1} ${verb} like ${adj} ${noun2}`;
    },
  ];

  const structure = getRandomItem(structures);
  return structure();
}

/**
 * Generates a complete random poem
 */
function generatePoem(): string {
  const numLines = Math.floor(Math.random() * 3) + 3; // 3-5 lines
  const lines: string[] = [];

  // Generate main lines
  for (let i = 0; i < numLines; i++) {
    lines.push(generatePoemLine());
  }

  // Add a ending line occasionally
  if (Math.random() < 0.7) {
    lines.push(getRandomItem(wordLists.endings));
  }

  return lines.join('\n');
}

/**
 * Displays a formatted poem with decorative borders
 */
function displayPoem(poem: string): void {
  const lines = poem.split('\n');
  const maxLength = Math.max(...lines.map((line) => line.length));
  const border = '═'.repeat(maxLength + 4);

  console.log('\n╔' + border + '╗');
  console.log('║' + ' '.repeat(maxLength + 4) + '║');

  lines.forEach((line) => {
    const padding = ' '.repeat(Math.max(0, maxLength - line.length));
    console.log(`║  ${line}${padding}  ║`);
  });

  console.log('║' + ' '.repeat(maxLength + 4) + '║');
  console.log('╚' + border + '╝\n');
}

/**
 * Main application entry point
 */
function main(): void {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('🌟 Welcome to the Poetry Generator! 🌟');
    console.log('\nCommands:');
    console.log('  poem    - Generate a random poem');
    console.log('  help    - Show this help message');
    console.log('\nExample: npm start poem');
    return;
  }

  const command = args[0]?.toLowerCase() || '';

  switch (command) {
    case 'poem':
      console.log('🎭 Generating a mystical poem...\n');
      const poem = generatePoem();
      displayPoem(poem);
      console.log('✨ May these words inspire your soul! ✨');
      break;

    case 'help':
      console.log('🌟 Poetry Generator Help 🌟');
      console.log('\nThis tool creates random poems using a naive approach of');
      console.log('combining words from predefined lists.');
      console.log('\nCommands:');
      console.log('  poem    - Generate a random poem');
      console.log('  help    - Show this help message');
      break;

    default:
      console.log(`❌ Unknown command: ${command}`);
      console.log('Use "help" to see available commands.');
      process.exit(1);
  }
}

// Run the application if this file is executed directly
if (require.main === module) {
  main();
}

export { main, generatePoem, generatePoemLine };

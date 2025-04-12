const adjectives = ['Смелый', 'Быстрый', 'Умный', 'Весёлый', 'Добрый', 'Красивый', 'Яркий', 'Активный', 'Милый', 'Крутой', 'Могучий', 'Свирепый', 'Маленький', 'Большой', 'Нежный', 'Шумный', 'Тихий'];
const nouns = ['Дракон', 'Кот', 'Тигр', 'Медведь', 'Феникс', 'Лев', 'Волк', 'Пингвин', 'Лис', 'Хомяк', 'Фенек', 'Кит', 'Жираф', 'Паук', 'Бегемот', 'Заяц', 'Барсук', 'Хамелеон', 'Кенгуру', 'Фламинго'];

export function generateRandomName(): string {
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  return `${adj}${noun}`;
}

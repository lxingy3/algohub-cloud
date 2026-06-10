import { resources, languageOptions } from '../app/i18n/resources.js';

const navKeys = Object.keys(resources.en.translation.nav);
const submitKeys = Object.keys(resources.en.translation.submit);
const criticalStatic = [
  'Share Your Story',
  'Help us understand how algorithms affect people in public services.',
  'Browse Algorithms',
  'Algorithms Used in Public Services',
  'Partner application',
  'Algorithm Registry',
  'Stories',
];

const failures = [];

for (const [code] of languageOptions) {
  const translation = resources[code]?.translation;
  if (!translation) {
    failures.push(`${code}: missing resource`);
    continue;
  }

  for (const key of navKeys) {
    if (!translation.nav?.[key]) failures.push(`${code}: missing nav.${key}`);
  }

  for (const key of submitKeys) {
    if (!translation.submit?.[key]) failures.push(`${code}: missing submit.${key}`);
  }

  if (code !== 'en') {
    const identicalSubmitKeys = submitKeys.filter((key) => translation.submit[key] === resources.en.translation.submit[key]);
    if (identicalSubmitKeys.length > 3) {
      failures.push(`${code}: too many untranslated submit keys (${identicalSubmitKeys.join(', ')})`);
    }

    const staticCount = Object.keys(translation.staticText || {}).length;
    if (staticCount < 25) failures.push(`${code}: static text coverage too small (${staticCount})`);

    for (const phrase of criticalStatic) {
      if (!translation.staticText?.[phrase]) failures.push(`${code}: missing static text "${phrase}"`);
    }
  }
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log(`i18n coverage OK for ${languageOptions.length} languages.`);

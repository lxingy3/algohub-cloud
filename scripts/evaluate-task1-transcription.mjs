import fs from 'node:fs';
import assert from 'node:assert/strict';

const args = new Set(process.argv.slice(2));
const inputPath = process.argv.find((value, index, values) => values[index - 1] === '--input') || 'data/task1-transcription-gold.json';

function words(value) {
  return String(value || '').toLowerCase().match(/[a-z0-9']+/g) || [];
}

function chars(value) {
  return words(value).join('');
}

function distance(left, right) {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let row = 1; row <= left.length; row += 1) {
    const current = [row];
    for (let column = 1; column <= right.length; column += 1) {
      current[column] = Math.min(
        current[column - 1] + 1,
        previous[column] + 1,
        previous[column - 1] + (left[row - 1] === right[column - 1] ? 0 : 1),
      );
    }
    previous.splice(0, previous.length, ...current);
  }
  return previous[right.length];
}

function evaluate(records) {
  let wordErrors = 0;
  let referenceWords = 0;
  let characterErrors = 0;
  let referenceCharacters = 0;
  for (const record of records) {
    const referenceWordList = words(record.reference);
    const hypothesisWordList = words(record.hypothesis);
    const referenceCharacterList = [...chars(record.reference)];
    const hypothesisCharacterList = [...chars(record.hypothesis)];
    wordErrors += distance(referenceWordList, hypothesisWordList);
    referenceWords += referenceWordList.length;
    characterErrors += distance(referenceCharacterList, hypothesisCharacterList);
    referenceCharacters += referenceCharacterList.length;
  }
  return {
    records: records.length,
    wer: Number((wordErrors / Math.max(1, referenceWords)).toFixed(4)),
    cer: Number((characterErrors / Math.max(1, referenceCharacters)).toFixed(4)),
  };
}

if (args.has('--self-check')) {
  assert.deepEqual(evaluate([{ reference: 'one two three', hypothesis: 'one two' }]), { records: 1, wer: 0.3333, cer: 0.4545 });
  console.log('task1 transcription evaluator self-check ok');
} else if (!fs.existsSync(inputPath)) {
  console.log(JSON.stringify({
    inputPath,
    releaseEligible: false,
    reason: 'A research-team-approved transcription gold set is required. Each record must contain reference and hypothesis text.',
  }, null, 2));
} else {
  const payload = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  const records = (payload.records || []).filter((record) => record.reference && record.hypothesis);
  const independentlyApproved = payload.approvedForRelease === true && payload.reviewMethod && !/internal|synthetic|pseudo/i.test(payload.reviewMethod);
  console.log(JSON.stringify({
    inputPath,
    ...evaluate(records),
    releaseEligible: Boolean(independentlyApproved && records.length >= 10),
    reason: independentlyApproved && records.length >= 10 ? null : 'At least 10 independently reviewed audio transcripts are required for a release benchmark.',
  }, null, 2));
}

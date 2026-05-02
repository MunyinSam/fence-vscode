import { getAuthoredLines } from '../git';
import * as path from 'path';

const file = path.join(__dirname, '..', '..', 'src', 'scanner.ts');

getAuthoredLines(file).then(ranges => {
  console.log('Authored ranges in scanner.ts:');
  console.log(JSON.stringify(ranges, null, 2));
  console.log(`Total ranges: ${ranges.length}`);
  const totalLines = ranges.reduce((sum, r) => sum + (r.end - r.start + 1), 0);
  console.log(`Total authored lines: ${totalLines}`);
});

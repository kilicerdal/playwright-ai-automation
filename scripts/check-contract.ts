import { checkContract } from '../src/contracts/validate';
console.log(JSON.stringify(await checkContract(), null, 2));
